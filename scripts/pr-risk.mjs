#!/usr/bin/env node

import { appendFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { classifyPaths, isAutoMergeCategory } from './classify-paths.mjs';

const API = 'https://api.github.com';
const JEV_URL = 'https://opencode.ai/inference/systemone/v1/systemone';
const COMMENT_MARKER = '<!-- agent-risk -->';
const RESULT_PATH = process.env.RISK_RESULT_PATH || 'risk-result.json';

const LABEL_COLORS = {
  'risk:low': '0e8a16',
  'risk:medium': 'd4a72c',
  'risk:high': 'cf222e',
  'risk:unknown': '6e7781',
  'risk:accepted': '8250df',
  'risk:false-low': 'b60205',
  'change:docs': '0075ca',
  'change:tests': '1d76db',
  'change:ui': '5319e7',
  'change:calculation': 'b60205',
  'change:logic': 'fbca04',
  'change:data': 'cf222e',
  'change:deps': 'd93f0b',
  'change:ci': '6e7781',
  'change:security': '82071e',
  'automerge:eligible': '0e8a16',
  'automerge:blocked': '6e7781',
};

function env(name) {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function numberEnv(name, fallback) {
  const value = Number(env(name));
  return Number.isFinite(value) ? value : fallback;
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--repo') result.repo = argv[++index];
    else if (arg === '--pr') result.pr = Number(argv[++index]);
    else if (arg === '--dry-run') result.dryRun = true;
  }
  return result;
}

async function github(path, { method = 'GET', accept = 'application/vnd.github+json', body } = {}) {
  const token = env('GITHUB_TOKEN');
  if (!token) throw new Error('GITHUB_TOKEN is not set');

  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept,
      'User-Agent': 'electricity-comparator-risk',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub ${method} ${path} failed: ${response.status} ${detail}`);
  }

  return response;
}

async function githubJson(path, options) {
  const response = await github(path, options);
  return response.json();
}

async function githubText(path, options) {
  const response = await github(path, options);
  return response.text();
}

async function fetchPullRequest(repo, prNumber) {
  return githubJson(`/repos/${repo}/pulls/${prNumber}`);
}

async function fetchFiles(repo, prNumber) {
  const files = [];
  for (let page = 1; ; page += 1) {
    const batch = await githubJson(
      `/repos/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`,
    );
    files.push(...batch);
    if (batch.length < 100) break;
    if (page >= 30) break;
  }
  return files;
}

async function fetchDiff(repo, prNumber) {
  try {
    return await githubText(`/repos/${repo}/pulls/${prNumber}`, {
      accept: 'application/vnd.github.v3.diff',
    });
  } catch {
    return '';
  }
}

function buildState(pr, files, diff, maxDiffChars) {
  const body = String(pr.body || '').slice(0, 12_000);
  const fileList = files
    .map((file) => `- ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})`)
    .join('\n');
  const truncated = diff.length > maxDiffChars;
  const diffText = truncated
    ? `${diff.slice(0, maxDiffChars)}\n\n[DIFF TRUNCATED: ${diff.length - maxDiffChars} characters omitted]`
    : diff;

  return {
    truncated,
    text: [
      `Pull request: #${pr.number} ${pr.title}`,
      `Base: ${pr.base.ref} (${pr.base.sha})`,
      `Head: ${pr.head.ref} (${pr.head.sha})`,
      `Author: ${pr.user?.login ?? 'unknown'}`,
      `Changed files: ${files.length}`,
      '',
      'Description:',
      body || '(empty)',
      '',
      'Files:',
      fileList || '(none)',
      '',
      'Diff:',
      diffText || '(no text diff available)',
    ].join('\n'),
  };
}

function questions() {
  return {
    risk: {
      type: 'choice',
      instructions:
        'Classify the regression risk of this pull request for a static React electricity-plan comparison app. Weigh the code diff, not the PR description alone.',
      criteria: {
        low: 'Documentation, tests, or mechanical changes. No runtime behavior, no money/data/security path, easy to revert.',
        medium: 'Localized UI or behavior change with tests and bounded impact. Reversible. No money, generated data, dependency, or security impact.',
        high: 'Can change cost calculations, plan data, dependencies, CI/secrets, or broad user behavior; hard to detect or recover from a regression.',
      },
    },
    change_type: {
      type: 'choice',
      instructions: 'What kind of change is this primarily?',
      criteria: {
        docs: 'Documentation, comments, README, or agent instructions only.',
        tests: 'Test code or test configuration only.',
        ui: 'User-visible React, styles, copy, or assets.',
        calculation: 'Cost arithmetic, plan ranking, usage conversion, GST, levy, discounts, or savings.',
        logic: 'Non-money application logic, parsing, formatting, or data flow.',
        data: 'Plan dataset, source CSV, or data generator.',
        deps: 'Package manifests or lockfile.',
        ci: 'Build, test, TypeScript, or lint configuration.',
        security: 'Workflows, scripts, secrets, permissions, or supply chain.',
        mixed: 'More than one materially different kind of change.',
      },
    },
    touches_money: {
      type: 'noul',
      instructions:
        'Can this change alter any calculated cost, annual estimate, monthly estimate, first-year estimate, savings, levy, GST, discount, free-power value, or plan ranking?',
    },
    touches_data: {
      type: 'noul',
      instructions:
        'Does this change edit or regenerate the plan dataset, the source data, or the plan-data generator?',
    },
    touches_security: {
      type: 'noul',
      instructions:
        'Does this change affect authentication, secrets, workflow permissions, dependency supply chain, repository settings, or deployment?',
    },
    behavior_change: {
      type: 'noul',
      instructions:
        'Does this change alter user-visible behavior beyond copy, styling, comments, or tests?',
    },
    tests_adequate: {
      type: 'noul',
      instructions:
        'Does the diff include tests that would catch a regression in the changed behavior?',
    },
    needs_human_review: {
      type: 'noul',
      instructions:
        'Should a careful human review this before merge regardless of whether the automated checks pass?',
    },
  };
}

async function callJev(state, model) {
  const apiKey = env('OPENCODE_API_KEY');
  if (!apiKey) throw new Error('OPENCODE_API_KEY is not set');

  const response = await fetch(JEV_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      state,
      questions: questions(),
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(`Jev ${response.status}: ${(await response.text()).slice(0, 500)}`);
  }

  return response.json();
}

async function askJev(state) {
  const primary = env('JEV_MODEL') || 'jev-1.13-free';
  const fallback = env('JEV_FALLBACK_MODEL');

  try {
    return { data: await callJev(state, primary), model: primary };
  } catch (error) {
    if (!fallback || fallback === primary) throw error;
    return { data: await callJev(state, fallback), model: fallback };
  }
}

function noul(answer) {
  return typeof answer?.noul === 'number' ? answer.noul : 1;
}

function probability(answer, key) {
  return typeof answer?.probabilities?.[key] === 'number' ? answer.probabilities[key] : 0;
}

export function decideRisk({
  riskChoice,
  probabilities,
  confidence,
  answers,
  categories,
  sensitivePaths,
  truncated,
  headRepo,
  baseRepo,
  lowProbability = numberEnv('RISK_LOW_P', 0.85),
  minConfidence = numberEnv('RISK_MIN_CONFIDENCE', 0.7),
}) {
  const lowP = probability({ probabilities }, 'low');
  const money = noul(answers?.touches_money);
  const data = noul(answers?.touches_data);
  const security = noul(answers?.touches_security);
  const behavior = noul(answers?.behavior_change);
  const tests = noul(answers?.tests_adequate);
  const human = noul(answers?.needs_human_review);
  const lowConfident =
    riskChoice === 'low' && lowP >= lowProbability && Number(confidence ?? 0) >= minConfidence;

  let finalRisk = 'unknown';
  if (riskChoice) {
    if (riskChoice === 'high' || money >= 0.5 || security >= 0.5) {
      finalRisk = 'high';
    } else if (
      riskChoice === 'medium' ||
      money >= 0.2 ||
      data >= 0.2 ||
      security >= 0.2 ||
      human >= 0.3 ||
      !lowConfident
    ) {
      finalRisk = 'medium';
    } else {
      finalRisk = 'low';
    }
  }

  const sameRepository = Boolean(headRepo && baseRepo && headRepo === baseRepo);
  const categoryEligible = isAutoMergeCategory(categories);
  const autoMergeEligible =
    finalRisk === 'low' &&
    categoryEligible &&
    sensitivePaths.length === 0 &&
    !truncated &&
    sameRepository;

  let autoMergeReason = 'eligible';
  if (finalRisk !== 'low') autoMergeReason = `Jev classified the change as ${finalRisk}`;
  else if (!categoryEligible) autoMergeReason = 'category is not docs-only or tests-only';
  else if (sensitivePaths.length > 0) autoMergeReason = 'sensitive path changed';
  else if (truncated) autoMergeReason = 'diff was truncated';
  else if (!sameRepository) autoMergeReason = 'pull request comes from a fork';

  return {
    finalRisk,
    lowConfident,
    autoMergeEligible,
    autoMergeReason,
    signals: { money, data, security, behavior, tests, human },
  };
}

async function ensureLabel(repo, name) {
  try {
    await github(`/repos/${repo}/labels`, {
      method: 'POST',
      body: {
        name,
        color: LABEL_COLORS[name] || 'ededed',
        description: 'Managed by the agent workflow',
      },
    });
  } catch {
    void 0;
  }
}

async function currentLabels(repo, prNumber) {
  return githubJson(`/repos/${repo}/issues/${prNumber}/labels?per_page=100`);
}

async function removeLabel(repo, prNumber, name) {
  try {
    await github(`/repos/${repo}/issues/${prNumber}/labels/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  } catch {
    void 0;
  }
}

async function syncLabels(repo, prNumber, labels) {
  const existing = await currentLabels(repo, prNumber);
  for (const label of existing) {
    if (label.name.startsWith('risk:') && label.name !== 'risk:false-low') {
      await removeLabel(repo, prNumber, label.name);
    }
    if (label.name.startsWith('change:') || label.name.startsWith('automerge:')) {
      await removeLabel(repo, prNumber, label.name);
    }
  }

  for (const label of labels) await ensureLabel(repo, label);
  await github(`/repos/${repo}/issues/${prNumber}/labels`, {
    method: 'POST',
    body: { labels },
  });
}

async function setStatus({ repo, headSha, state, description }) {
  const server = env('GITHUB_SERVER_URL') || 'https://github.com';
  const runId = env('GITHUB_RUN_ID');
  const targetUrl = runId ? `${server}/${repo}/actions/runs/${runId}` : undefined;

  await github(`/repos/${repo}/statuses/${headSha}`, {
    method: 'POST',
    body: {
      state,
      context: 'risk',
      description: description.slice(0, 140),
      target_url: targetUrl,
    },
  });
}

async function upsertComment(repo, prNumber, body) {
  const comments = [];
  for (let page = 1; ; page += 1) {
    const batch = await githubJson(
      `/repos/${repo}/issues/${prNumber}/comments?per_page=100&page=${page}`,
    );
    comments.push(...batch);
    if (batch.length < 100) break;
    if (page >= 10) break;
  }

  const existing = comments.find((comment) => comment.body?.includes(COMMENT_MARKER));
  if (existing) {
    await github(`/repos/${repo}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      body: { body },
    });
  } else {
    await github(`/repos/${repo}/issues/${prNumber}/comments`, {
      method: 'POST',
      body: { body },
    });
  }
}

function formatComment({ result, enforced }) {
  const probabilities = result.probabilities || {};
  const signals = result.signals || {};
  const categories = result.categories.length > 0 ? result.categories.join(', ') : 'unknown';
  const sensitive =
    result.sensitivePaths.length > 0 ? result.sensitivePaths.join(', ') : 'none';
  const mode = enforced ? 'enforced' : 'shadow (non-blocking)';
  const status = result.status === 'classified' ? result.risk : result.status;
  const lines = [
    COMMENT_MARKER,
    '## Agent risk',
    '',
    `**Jev:** \`${status}\` — ${mode}`,
    `- P(low)=${Number(probabilities.low || 0).toFixed(3)}  P(medium)=${Number(probabilities.medium || 0).toFixed(3)}  P(high)=${Number(probabilities.high || 0).toFixed(3)}`,
    `- confidence=${Number(result.confidence || 0).toFixed(3)}`,
    `- money=${Number(signals.money ?? 1).toFixed(3)}  data=${Number(signals.data ?? 1).toFixed(3)}  security=${Number(signals.security ?? 1).toFixed(3)}`,
    `- behavior_change=${Number(signals.behavior ?? 1).toFixed(3)}  tests_adequate=${Number(signals.tests ?? 0).toFixed(3)}  human_review=${Number(signals.human ?? 1).toFixed(3)}`,
    `- model: \`${result.model}\``,
    `- categories: \`${categories}\``,
    `- sensitive paths: ${sensitive}`,
    `- diff truncated: ${result.truncated ? 'yes' : 'no'}`,
    `- auto-merge: ${result.autoMergeEligible ? 'eligible' : 'blocked'} — ${result.autoMergeReason}`,
  ];

  if (result.error) {
    lines.push('', `> Risk classification failed: ${result.error}`);
  }

  lines.push('', '<details><summary>Raw Jev result</summary>', '', '```json');
  lines.push(JSON.stringify({ answers: result.answers, usage: result.usage }, null, 2));
  lines.push('```', '', '</details>');
  return lines.join('\n');
}

async function writeResult(result) {
  await writeFile(RESULT_PATH, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

async function appendSummary(markdown) {
  const path = env('GITHUB_STEP_SUMMARY');
  if (!path) return;
  try {
    await appendFile(path, `${markdown}\n`, 'utf8');
  } catch {
    void 0;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = args.repo || env('GITHUB_REPOSITORY');
  const prNumber = args.pr || Number(env('PR_NUMBER'));
  const dryRun = Boolean(args.dryRun);
  const enforced = env('RISK_ENFORCE') === 'true';

  if (!repo) throw new Error('GITHUB_REPOSITORY or --repo is required');
  if (!prNumber) throw new Error('PR_NUMBER or --pr is required');

  const pr = await fetchPullRequest(repo, prNumber);
  const files = await fetchFiles(repo, prNumber);
  const diff = await fetchDiff(repo, prNumber);
  const maxDiffChars = numberEnv('MAX_DIFF_CHARS', 60_000);
  const state = buildState(pr, files, diff, maxDiffChars);
  const { categories, sensitivePaths } = classifyPaths(files);

  const result = {
    repository: repo,
    pullRequest: prNumber,
    headSha: pr.head.sha,
    baseSha: pr.base.sha,
    generatedAt: new Date().toISOString(),
    model: env('JEV_MODEL') || 'jev-1.13-free',
    status: 'unknown',
    risk: 'unknown',
    probabilities: {},
    confidence: 0,
    answers: {},
    usage: {},
    signals: {},
    categories,
    sensitivePaths,
    truncated: state.truncated,
    autoMergeEligible: false,
    autoMergeReason: 'not classified',
    error: null,
  };

  try {
    const jev = await askJev(state.text);
    const answers = jev.data.answers || {};
    const riskAnswer = answers.risk;
    const decision = decideRisk({
      riskChoice: riskAnswer?.choice,
      probabilities: riskAnswer?.probabilities || {},
      confidence: riskAnswer?.confidence,
      answers,
      categories,
      sensitivePaths,
      truncated: state.truncated,
      headRepo: pr.head.repo?.full_name,
      baseRepo: pr.base.repo?.full_name,
    });

    result.status = 'classified';
    result.model = jev.model;
    result.risk = decision.finalRisk;
    result.probabilities = riskAnswer?.probabilities || {};
    result.confidence = Number(riskAnswer?.confidence || 0);
    result.answers = answers;
    result.usage = jev.data.usage || {};
    result.signals = decision.signals;
    result.autoMergeEligible = decision.autoMergeEligible;
    result.autoMergeReason = decision.autoMergeReason;
  } catch (error) {
    result.status = 'unknown';
    result.risk = 'unknown';
    result.error = error instanceof Error ? error.message : String(error);
    result.autoMergeReason = 'classification failed';
  }

  const labels = [
    `risk:${result.risk}`,
    ...result.categories.map((category) => `change:${category}`),
    result.autoMergeEligible ? 'automerge:eligible' : 'automerge:blocked',
  ];

  const statusState = enforced ? (result.risk === 'low' ? 'success' : 'failure') : 'success';
  const statusDescription = enforced
    ? `Jev ${result.risk} (p=${Number(result.probabilities.low || 0).toFixed(2)}, conf=${Number(result.confidence).toFixed(2)})`
    : `shadow: Jev ${result.risk} (non-blocking)`;

  if (!dryRun) {
    const latest = await fetchPullRequest(repo, prNumber);
    if (latest.head.sha !== pr.head.sha) {
      throw new Error(`PR head moved from ${pr.head.sha} to ${latest.head.sha}; rerun the workflow`);
    }

    await syncLabels(repo, prNumber, labels);
    await upsertComment(repo, prNumber, formatComment({ result, enforced }));
    await setStatus({ repo, headSha: pr.head.sha, state: statusState, description: statusDescription });
  }

  await writeResult(result);
  await appendSummary(formatComment({ result, enforced }));

  if (!dryRun) {
    console.log(`Risk: ${result.risk}`);
    console.log(`Auto-merge: ${result.autoMergeEligible ? 'eligible' : 'blocked'} (${result.autoMergeReason})`);
    console.log(`Labels: ${labels.join(', ')}`);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }

  if (enforced && result.status !== 'classified') process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch(async (error) => {
    console.error(error);
    try {
      await writeResult({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        generatedAt: new Date().toISOString(),
      });
    } catch {
      void 0;
    }
    process.exitCode = 1;
  });
}
