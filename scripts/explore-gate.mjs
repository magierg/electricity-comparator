#!/usr/bin/env node

import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const REPORT_PATH = process.env.E2E_REPORT || '.e2e/report.json';
const COMMENT_PATH = process.env.EXPLORE_COMMENT_PATH || 'exploratory-comment.md';
const MIN_BLOCKING_SEVERITY = Number(process.env.EXPLORE_MIN_SEVERITY || 3);

function severityName(value) {
  return {
    5: 'critical',
    4: 'high',
    3: 'medium',
    2: 'low',
    1: 'trivial',
  }[value] || `severity-${value}`;
}

function findingLine(finding) {
  const location = finding.path ? ` at \`${finding.path}\`` : '';
  const lines = [
    `- **${severityName(finding.severity)}** ${finding.title}${location}`,
  ];
  if (finding.expected) lines.push(`  - Expected: ${finding.expected}`);
  if (finding.actual) lines.push(`  - Actual: ${finding.actual}`);
  if (Array.isArray(finding.reproduction) && finding.reproduction.length > 0) {
    lines.push(`  - Reproduce: ${finding.reproduction.join(' → ')}`);
  }
  return lines.join('\n');
}

export function buildComment({ verdict, explore, findings, error }) {
  const lines = [
    '<!-- agent-exploratory -->',
    '## Exploratory test',
    '',
    `**Verdict:** \`${verdict}\``,
  ];

  if (error) {
    lines.push('', `> The exploratory run could not be evaluated: ${error}`);
  }

  if (explore) {
    lines.push(
      `- Steps: ${Array.isArray(explore.steps) ? explore.steps.length : 0}`,
      `- Ended: ${explore.ended || 'unknown'}`,
      `- Findings: ${findings.length}`,
    );
    if (explore.summary) lines.push('', explore.summary);
  }

  if (findings.length > 0) {
    lines.push('', '### Findings', '');
    for (const finding of findings) lines.push(findingLine(finding), '');
  } else if (!error && verdict === 'passed') {
    lines.push('', 'No issues reported.');
  } else if (verdict === 'blocked') {
    lines.push(
      '',
      'The exploration did not complete. Check the e2e log for a startup, provider, or timeout failure.',
    );
  }

  lines.push(
    '',
    '_Screenshots and the full report are in the `exploratory-report` artifact._',
  );
  return `${lines.join('\n')}\n`;
}

export function decideVerdict(explore, minSeverity = MIN_BLOCKING_SEVERITY) {
  const findings = Array.isArray(explore.findings) ? explore.findings : [];
  const blocking = findings.filter(
    (finding) =>
      finding.kind === 'issue' && Number(finding.severity ?? 0) >= minSeverity,
  );

  const steps = Array.isArray(explore.steps) ? explore.steps : [];
  const allStepsBlocked =
    steps.length > 0 && steps.every((step) => step.status === 'blocked');

  if (
    explore.ended === 'blocked' ||
    explore.ended === 'aborted' ||
    steps.length === 0 ||
    allStepsBlocked
  ) {
    return { verdict: 'blocked', findings };
  }

  return { verdict: blocking.length > 0 ? 'findings' : 'passed', findings };
}

async function main() {
  let verdict;
  let explore;
  let findings = [];
  let error;

  try {
    const report = JSON.parse(await readFile(REPORT_PATH, 'utf8'));
    explore = report.run?.explore || report.explore;
    if (!explore) throw new Error(`No run.explore record in ${REPORT_PATH}`);

    ({ verdict, findings } = decideVerdict(explore));
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    verdict = 'blocked';
  }

  const body = buildComment({ verdict, explore, findings, error });
  await writeFile(COMMENT_PATH, body, 'utf8');

  const output = process.env.GITHUB_OUTPUT;
  if (output) {
    await appendFile(output, `verdict=${verdict}\n`, 'utf8');
    await appendFile(output, `findings=${findings.length}\n`, 'utf8');
  }

  console.log(body);
  if (verdict !== 'passed') process.exitCode = verdict === 'blocked' ? 2 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 2;
  });
}
