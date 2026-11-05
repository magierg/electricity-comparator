#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const TEST_PATH = /(?:^|\/)__tests__\/|\.(?:test|spec)\.[cm]?[jt]sx?$/;

export function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '');
}

export function globToRegExp(pattern) {
  const normalized = normalizePath(pattern);
  let source = '^';

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];

    if (character === '*') {
      if (normalized[index + 1] === '*') {
        index += 1;
        if (normalized[index + 1] === '/') {
          index += 1;
          source += '(?:.*/)?';
        } else {
          source += '.*';
        }
      } else {
        source += '[^/]*';
      }
    } else if (character === '?') {
      source += '[^/]';
    } else if ('\\^$+?.()|{}[]'.includes(character)) {
      source += `\\${character}`;
    } else {
      source += character;
    }
  }

  source += '$';
  return new RegExp(source);
}

export function matchesAny(filePath, patterns = []) {
  return patterns.some((pattern) => globToRegExp(pattern).test(normalizePath(filePath)));
}

export function isTestPath(filePath) {
  return TEST_PATH.test(normalizePath(filePath));
}

export function checkChangedFiles(changedFiles, spec) {
  const errors = [];
  const mayChange = spec.may_change ?? [];
  const mustNotChange = spec.must_not_change ?? [];
  const normalizedFiles = changedFiles.map(normalizePath);

  for (const file of normalizedFiles) {
    if (matchesAny(file, mustNotChange)) {
      errors.push(`${file}: matches must_not_change`);
      continue;
    }

    if (mayChange.length === 0) {
      errors.push(`${file}: no changes are allowed for this eval`);
      continue;
    }

    if (!matchesAny(file, mayChange)) {
      errors.push(`${file}: outside may_change`);
    }
  }

  for (const required of spec.required_changes ?? []) {
    if (!normalizedFiles.some((file) => globToRegExp(required).test(file))) {
      errors.push(`missing required change: ${required}`);
    }
  }

  if (spec.required_test_change && !normalizedFiles.some(isTestPath)) {
    errors.push('missing required test change');
  }

  return errors;
}

export function checkTestPatch(patch) {
  const errors = [];
  let currentFile = null;
  let isTestFile = false;

  for (const line of patch.split('\n')) {
    if (line.startsWith('diff --git ')) {
      currentFile = null;
      isTestFile = false;
      continue;
    }

    if (line.startsWith('+++ b/')) {
      currentFile = normalizePath(line.slice(6));
      isTestFile = isTestPath(currentFile);
      continue;
    }

    if (!isTestFile) continue;

    if (
      line.startsWith('-') &&
      !line.startsWith('---') &&
      /expect\s*\(|\b(?:it|test|describe)\s*\(|\bassert\b/.test(line)
    ) {
      errors.push(`${currentFile}: removes test logic from an existing test`);
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      const added = line.slice(1);
      if (
        /\.(?:skip|only)\s*\(/.test(added) ||
        /\b(?:xit|xdescribe)\s*\(/.test(added) ||
        /\btest\.todo\s*\(/.test(added)
      ) {
        errors.push(`${currentFile}: adds a skipped or focused test`);
      }
    }
  }

  return errors;
}

export function extractPrBody(output) {
  const start = output.lastIndexOf('## Why');
  return start === -1 ? '' : output.slice(start);
}

export function checkPrBody(output) {
  const body = extractPrBody(output);
  const errors = [];
  const requiredSections = ['## Why', '## Scope', '## Blast Radius', '## Verification'];

  for (const section of requiredSections) {
    if (!body.includes(section)) errors.push(`missing PR body section: ${section}`);
  }

  if (body.length > 8000) {
    errors.push(`PR body exceeds 8000 characters (${body.length})`);
  }

  return errors;
}

export function checkOutput(output, pattern) {
  if (!pattern) return [];
  return new RegExp(pattern, 'i').test(output)
    ? []
    : [`output does not match /${pattern}/i`];
}

export function changedFilesFromGit(runDir) {
  const tracked = execFileSync('git', ['-C', runDir, 'diff', '--name-only', 'HEAD'], {
    encoding: 'utf8',
  });
  const untracked = execFileSync('git', ['-C', runDir, 'ls-files', '--others', '--exclude-standard'], {
    encoding: 'utf8',
  });

  return [...new Set([...tracked.split('\n'), ...untracked.split('\n')].filter(Boolean))]
    .map(normalizePath)
    .sort();
}

export function diffFromGit(runDir) {
  return execFileSync('git', ['-C', runDir, 'diff', 'HEAD'], { encoding: 'utf8' });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function main() {
  const casePath = process.env.EVAL_CASE;
  const runDir = process.env.EVAL_RUN_DIR;
  const outputPath = process.env.EVAL_OUTPUT;
  const changedFilesPath = process.env.EVAL_CHANGED_FILES;
  const patchPath = process.env.EVAL_DIFF_PATCH;

  if (!casePath || !existsSync(casePath)) {
    console.error('EVAL_CASE must point to an eval case JSON file');
    process.exit(2);
  }

  if (!runDir || !existsSync(runDir)) {
    console.error('EVAL_RUN_DIR must point to the eval checkout');
    process.exit(2);
  }

  const spec = readJson(casePath);
  const changedFiles = changedFilesPath
    ? readJson(changedFilesPath)
    : changedFilesFromGit(runDir);
  const patch = patchPath && existsSync(patchPath)
    ? readFileSync(patchPath, 'utf8')
    : diffFromGit(runDir);
  const output = outputPath && existsSync(outputPath)
    ? readFileSync(outputPath, 'utf8')
    : '';

  const errors = [
    ...checkChangedFiles(changedFiles, spec),
    ...checkTestPatch(patch),
    ...(spec.require_pr_body ? checkPrBody(output) : []),
    ...checkOutput(output, spec.output_must_match),
  ];

  if (errors.length > 0) {
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log('diff check passed');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
