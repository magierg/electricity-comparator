#!/usr/bin/env node

import { appendFile, writeFile } from 'node:fs/promises';

const API = 'https://api.github.com';
const DAYS = Number(process.env.RISK_REPORT_DAYS || 90);
const TITLE = 'Agent risk calibration';

function env(name) {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

async function github(path, { method = 'GET', body } = {}) {
  const token = env('GITHUB_TOKEN');
  if (!token) throw new Error('GITHUB_TOKEN is not set');

  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'electricity-comparator-risk-report',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`GitHub ${method} ${path} failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function search(query) {
  return github(`/search/issues?q=${encodeURIComponent(query)}&per_page=100`);
}

function issueLine(issue) {
  const merged = issue.pull_request?.merged_at
    ? ` merged ${issue.pull_request.merged_at.slice(0, 10)}`
    : '';
  return `- [#${issue.number}](${issue.html_url}) ${issue.title}${merged}`;
}

function report({ repo, since, lowMerged, falseLow, rate }) {
  const lines = [
    '<!-- agent-risk-calibration -->',
    `# ${TITLE}`,
    '',
    `Repository: \`${repo}\``,
    `Window: PRs merged since \`${since}\``,
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| Low-risk merged PRs | ${lowMerged.length} |`,
    `| False-low labels | ${falseLow.length} |`,
    `| False-low rate | ${rate.toFixed(1)}% |`,
    '',
  ];

  if (falseLow.length > 0) {
    lines.push('## False-low PRs', '', ...falseLow.map(issueLine), '');
  } else {
    lines.push('No false-low labels in this window.', '');
  }

  lines.push(
    '## How to use this',
    '',
    'Add `risk:false-low` to a low-risk PR that later needed a regression fix.',
    'Keep `RISK_ENFORCE=false` in shadow mode until the observed false-low rate',
    'is acceptable for your review capacity.',
    '',
  );

  return lines.join('\n');
}

async function main() {
  const repo = env('GITHUB_REPOSITORY');
  if (!repo) throw new Error('GITHUB_REPOSITORY is required');

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const lowMerged = (
    await search(`repo:${repo} is:pr is:merged merged:>=${since} label:risk:low`)
  ).items;
  const falseLow = (
    await search(`repo:${repo} is:pr is:merged merged:>=${since} label:risk:false-low`)
  ).items;
  const rate = lowMerged.length === 0 ? 0 : (falseLow.length / lowMerged.length) * 100;
  const body = report({ repo, since, lowMerged, falseLow, rate });

  const existing = (
    await search(`repo:${repo} is:issue in:title "${TITLE}"`)
  ).items.find((issue) => issue.title === TITLE);

  if (existing) {
    await github(`/repos/${repo}/issues/${existing.number}`, {
      method: 'PATCH',
      body: { body },
    });
    console.log(`Updated #${existing.number}`);
  } else {
    const created = await github(`/repos/${repo}/issues`, {
      method: 'POST',
      body: { title: TITLE, body },
    });
    console.log(`Created #${created.number}`);
  }

  await writeFile('risk-report.md', `${body}\n`, 'utf8');
  const summary = env('GITHUB_STEP_SUMMARY');
  if (summary) {
    await appendFile(summary, `${body}\n`, 'utf8');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
