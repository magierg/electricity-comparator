#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evalsDir = join(repoRoot, 'evals');
const model = 'opencode-go/deepseek-v4.1-flash';
const agentTimeoutMs = 45 * 60 * 1000;
const checkTimeoutMs = 10 * 60 * 1000;
const textKeys = new Set(['text', 'content', 'message', 'response', 'output', 'delta', 'reasoning']);

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function run(command, args, options = {}) {
  const started = Date.now();
  const cwd = options.cwd ?? repoRoot;
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, PWD: cwd, ...(options.env ?? {}) },
    encoding: options.encoding ?? 'utf8',
    timeout: options.timeout ?? checkTimeoutMs,
    maxBuffer: options.maxBuffer ?? 100 * 1024 * 1024,
  });

  return {
    status: result.status ?? 1,
    signal: result.signal ?? null,
    timedOut: result.error?.code === 'ETIMEDOUT',
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    durationMs: Date.now() - started,
  };
}

function mustRun(command, args, options = {}) {
  const result = run(command, args, options);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout).trim().split('\n').slice(-20).join('\n');
    throw new Error(`${command} ${args.join(' ')} failed:\n${detail}`);
  }
  return result;
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sleepMs(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function isTransientAgentFailure(result) {
  if (result.timedOut || result.status === 0) return false;
  const output = `${result.stdout}\n${result.stderr}`;
  return /provider\.rate-limit|overloaded|rate limit|ECONNRESET|ETIMEDOUT|\b429\b/i.test(output);
}

function walkFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function hashConfig() {
  const hash = createHash('sha256');
  const files = ['AGENTS.md', 'opencode.json', 'opencode.pipeline.json']
    .map((file) => join(repoRoot, file))
    .filter((file) => existsSync(file));
  const opencodeDir = join(repoRoot, '.opencode');

  if (existsSync(opencodeDir)) files.push(...walkFiles(opencodeDir));

  for (const file of files.sort()) {
    hash.update(file.slice(repoRoot.length + 1));
    hash.update('\0');
    hash.update(readFileSync(file));
    hash.update('\0');
  }

  return hash.digest('hex');
}

function collectText(value, output) {
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string' && textKeys.has(key)) output.push(child);
    else if (child && typeof child === 'object') collectText(child, output);
  }
}

function extractText(raw) {
  const chunks = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      collectText(JSON.parse(trimmed), chunks);
    } catch {
      chunks.push(trimmed);
    }
  }

  let text = chunks.join('\n');
  if (!text.includes('## Why') && raw.includes('## Why')) {
    text = raw.replaceAll('\\n', '\n').replaceAll('\\"', '"');
  }

  return text;
}

function checkRecord(name, result) {
  return {
    name,
    status: result.status,
    durationMs: result.durationMs,
    stdout: result.stdout.slice(-2000),
    stderr: result.stderr.slice(-4000),
  };
}

function main() {
  const caseArgument = getArg('--case');
  if (!caseArgument) {
    console.error('Usage: node evals/run-eval.mjs --case <case.json> [--dry-run]');
    process.exit(2);
  }

  const casePath = resolve(process.cwd(), caseArgument);
  if (!existsSync(casePath)) {
    console.error(`Eval case not found: ${casePath}`);
    process.exit(2);
  }

  const spec = JSON.parse(readFileSync(casePath, 'utf8'));
  if (!spec.from || !/^[0-9a-f]{7,40}$/.test(spec.from)) {
    console.error('Eval case needs a valid git SHA in "from"');
    process.exit(2);
  }

  const caseId = spec.name ?? basename(casePath, '.json');
  const dryRun = process.argv.includes('--dry-run');
  const resultDir = join(repoRoot, 'eval-results', caseId);
  const runDir = mkdtempSync(join(tmpdir(), `agent-eval-${caseId}-`));
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const errors = [];
  const checks = [];
  let changedFiles = [];
  let keepRunDir = false;
  let agentResult = null;
  let agentAttempts = 0;
  const agentAttemptErrors = [];
  let opencodeVersion = null;
  let configHash = null;

  rmSync(resultDir, { recursive: true, force: true });
  mkdirSync(resultDir, { recursive: true });

  try {
    const version = run('opencode', ['--version'], { cwd: repoRoot, timeout: 30_000 });
    opencodeVersion = (version.stdout || version.stderr).trim() || null;
    configHash = hashConfig();

    const archivePath = join(tmpdir(), `${caseId}-${Date.now()}.tar`);
    const archive = spawnSync('git', ['archive', '--format=tar', spec.from], {
      cwd: repoRoot,
      maxBuffer: 200 * 1024 * 1024,
    });

    if (archive.status !== 0) {
      throw new Error(`git archive ${spec.from} failed: ${archive.stderr?.toString().trim() ?? ''}`);
    }

    writeFileSync(archivePath, archive.stdout);
    const extract = spawnSync('tar', ['-xf', archivePath, '-C', runDir], { encoding: 'utf8' });
    rmSync(archivePath, { force: true });

    if (extract.status !== 0) {
      throw new Error(`tar extraction failed: ${extract.stderr}`);
    }

    for (const item of ['AGENTS.md', 'opencode.json', 'opencode.pipeline.json']) {
      const source = join(repoRoot, item);
      if (existsSync(source)) cpSync(source, join(runDir, item), { recursive: true });
    }

    rmSync(join(runDir, '.opencode'), { recursive: true, force: true });
    if (existsSync(join(repoRoot, '.opencode'))) {
      cpSync(join(repoRoot, '.opencode'), join(runDir, '.opencode'), { recursive: true });
    }

    rmSync(join(runDir, 'evals'), { recursive: true, force: true });

    mustRun('git', ['init', '-q'], { cwd: runDir });
    mustRun('git', ['config', 'user.email', 'evals@example.com'], { cwd: runDir });
    mustRun('git', ['config', 'user.name', 'evals'], { cwd: runDir });
    mustRun('git', ['add', '-A'], { cwd: runDir });
    mustRun('git', ['commit', '-qm', 'eval base'], { cwd: runDir });

    if (dryRun) {
      writeJson(join(resultDir, 'dry-run.json'), { case: caseId, from: spec.from, runDir });
      console.log(`Dry run prepared: ${runDir}`);
      keepRunDir = true;
      return;
    }

    const install = run('npm', ['ci', '--no-audit', '--no-fund'], {
      cwd: runDir,
      timeout: 10 * 60 * 1000,
      env: { OPENCODE_API_KEY: '', HUSKY: '0' },
    });
    writeFileSync(join(resultDir, 'npm-ci.log'), `${install.stdout}\n${install.stderr}`);
    if (install.status !== 0) throw new Error('npm ci failed');

    const prompt = [
      'Evaluation mode: this is a non-interactive regression eval.',
      'Do not commit, push, or open a pull request.',
      'Make the requested changes in the working tree, run the relevant checks,',
      'and end with a plain-text PR body using ## Why, ## Scope, ## Blast Radius,',
      'and ## Verification.',
      '',
      spec.prompt,
    ].join('\n');

    const agentArgs = [
      '--standalone',
      'run',
      '--agent',
      'implementer',
      '--model',
      model,
      '--format',
      'json',
      '--auto',
      prompt,
    ];

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (attempt > 1) {
        mustRun('git', ['reset', '--hard', 'HEAD'], { cwd: runDir });
        mustRun('git', ['clean', '-fd'], { cwd: runDir });
        sleepMs(attempt === 2 ? 10_000 : 30_000);
      }

      agentAttempts = attempt;
      agentResult = run('opencode', agentArgs, {
        cwd: runDir,
        timeout: agentTimeoutMs,
        env: {
          OPENCODE_CONFIG: join(runDir, 'opencode.pipeline.json'),
          OPENCODE_DISABLE_AUTOUPDATE: 'true',
          CI: 'true',
          HUSKY: '0',
          GIT_TERMINAL_PROMPT: '0',
        },
      });

      if (!isTransientAgentFailure(agentResult)) break;

      agentAttemptErrors.push({
        attempt,
        message: (agentResult.stderr || agentResult.stdout).trim().slice(-500),
      });
    }

    writeJson(join(resultDir, 'agent-attempts.json'), {
      attempts: agentAttempts,
      errors: agentAttemptErrors,
    });
    writeFileSync(join(resultDir, 'output.json'), agentResult.stdout);
    writeFileSync(join(resultDir, 'output.stderr.txt'), agentResult.stderr);
    const outputText = extractText(agentResult.stdout) || agentResult.stderr;
    writeFileSync(join(resultDir, 'output.txt'), outputText);

    if (agentResult.timedOut) {
      errors.push(`agent timed out after ${agentTimeoutMs / 60000} minutes`);
    } else if (agentResult.status !== 0) {
      errors.push(`agent exited with code ${agentResult.status}`);
    }

    mustRun('git', ['add', '-N', '.'], { cwd: runDir });
    const changed = run('git', ['diff', '--name-only', 'HEAD'], { cwd: runDir });
    changedFiles = [...new Set(changed.stdout.split('\n').filter(Boolean))].sort();
    writeJson(join(resultDir, 'changed-files.json'), changedFiles);

    const patch = run('git', ['diff', 'HEAD'], { cwd: runDir });
    writeFileSync(join(resultDir, 'agent-diff.patch'), patch.stdout);

    for (const hidden of spec.hidden_tests ?? []) {
      const source = join(evalsDir, hidden.source);
      const destination = join(runDir, hidden.dest);
      if (!existsSync(source)) throw new Error(`hidden test missing: ${hidden.source}`);
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(source, destination);
    }

    const diffCheck = run('node', [join(evalsDir, 'check-diff.mjs')], {
      cwd: runDir,
      timeout: checkTimeoutMs,
      env: {
        EVAL_CASE: casePath,
        EVAL_RUN_DIR: runDir,
        EVAL_CHANGED_FILES: join(resultDir, 'changed-files.json'),
        EVAL_DIFF_PATCH: join(resultDir, 'agent-diff.patch'),
        EVAL_OUTPUT: join(resultDir, 'output.txt'),
      },
    });
    checks.push(checkRecord('diff, policy, and PR body', diffCheck));
    if (diffCheck.status !== 0) errors.push('diff, policy, and PR body check failed');

    for (const check of spec.checks ?? []) {
      const result = run('bash', ['-lc', check.run], {
        cwd: runDir,
        timeout: checkTimeoutMs,
        env: {
          EVALS: evalsDir,
          EVAL_CASE: casePath,
          EVAL_RUN_DIR: runDir,
          EVAL_OUTPUT: join(resultDir, 'output.txt'),
          OPENCODE_API_KEY: '',
        },
      });
      checks.push(checkRecord(check.name, result));
      if (result.status !== 0) errors.push(`${check.name} failed`);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    if (!keepRunDir) rmSync(runDir, { recursive: true, force: true });
  }

  if (dryRun) {
    if (errors.length > 0) {
      console.error(errors.join('\n'));
      process.exit(1);
    }
    return;
  }

  const passed = errors.length === 0;
  const durationMs = Date.now() - started;
  const summary = [
    `# Agent eval: ${caseId}`,
    '',
    `- Result: **${passed ? 'PASS' : 'FAIL'}**`,
    `- Source: ${spec.source ?? 'unknown'}`,
    `- From: \`${spec.from}\``,
    `- Model: \`${model}\``,
    `- Duration: ${(durationMs / 1000).toFixed(1)}s`,
    `- Agent attempts: ${agentAttempts}`,
    `- Changed files: ${changedFiles.length > 0 ? changedFiles.map((file) => `\`${file}\``).join(', ') : 'none'}`,
    '',
    '## Checks',
    '',
    '| Check | Result | Duration |',
    '| --- | --- | --- |',
    ...checks.map(
      (check) =>
        `| ${check.name} | ${check.status === 0 ? 'pass' : 'fail'} | ${(check.durationMs / 1000).toFixed(1)}s |`,
    ),
  ];

  if (errors.length > 0) {
    summary.push('', '## Errors', '', ...errors.map((error) => `- ${error}`));
  }

  writeFileSync(join(resultDir, 'summary.md'), `${summary.join('\n')}\n`);
  writeJson(join(resultDir, 'checks.json'), checks);
  writeJson(join(resultDir, 'result.json'), {
    case: caseId,
    source: spec.source ?? null,
    from: spec.from,
    model,
    opencodeVersion,
    configHash,
    startedAt,
    durationMs,
    agent: {
      exitCode: agentResult?.status ?? null,
      timedOut: agentResult?.timedOut ?? false,
      attempts: agentAttempts,
      retryErrors: agentAttemptErrors,
    },
    changedFiles,
    checks: checks.map(({ name, status, durationMs: checkDuration }) => ({
      name,
      status,
      durationMs: checkDuration,
    })),
    errors,
    passed,
  });

  console.log(summary.join('\n'));
  process.exit(passed ? 0 : 1);
}

main();
