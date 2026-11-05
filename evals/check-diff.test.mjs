import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkChangedFiles,
  checkOutput,
  checkPrBody,
  checkTestPatch,
  globToRegExp,
  isTestPath,
  matchesAny,
} from './check-diff.mjs';

test('glob matching handles repository paths', () => {
  assert.equal(globToRegExp('docs/agent-workflow.md').test('docs/agent-workflow.md'), true);
  assert.equal(globToRegExp('src/components/__tests__/**').test('src/components/__tests__/PeakScheduleSettings.test.tsx'), true);
  assert.equal(globToRegExp('src/data/**').test('src/data/wellington-plans.ts'), true);
  assert.equal(globToRegExp('src/data/**').test('src/datafoo.ts'), false);
  assert.equal(globToRegExp('opencode*.json').test('opencode.pipeline.json'), true);
  assert.equal(matchesAny('.github/workflows/ci.yml', ['.github/**']), true);
});

test('test paths are detected', () => {
  assert.equal(isTestPath('src/components/__tests__/PeakScheduleSettings.test.tsx'), true);
  assert.equal(isTestPath('src/lib/calculator.test.ts'), true);
  assert.equal(isTestPath('src/lib/calculator.ts'), false);
});

test('changed files must stay inside may_change and outside must_not_change', () => {
  const spec = {
    may_change: ['docs/agent-workflow.md'],
    must_not_change: ['src/**', '.github/**'],
    required_changes: ['docs/agent-workflow.md'],
  };

  assert.deepEqual(checkChangedFiles(['docs/agent-workflow.md'], spec), []);
  assert.match(checkChangedFiles(['src/lib/calculator.ts'], spec).join('\n'), /outside may_change|must_not_change/);
  assert.match(checkChangedFiles(['.github/workflows/ci.yml'], spec).join('\n'), /must_not_change/);
  assert.match(checkChangedFiles([], spec).join('\n'), /missing required change/);
});

test('an empty may_change rejects every change', () => {
  const errors = checkChangedFiles(['package.json'], {
    may_change: [],
    must_not_change: ['package.json'],
  });

  assert.match(errors.join('\n'), /must_not_change|no changes are allowed/);
});

test('required test changes are enforced', () => {
  const spec = {
    may_change: ['src/components/**'],
    required_changes: ['src/components/PeakScheduleSettings.tsx'],
    required_test_change: true,
  };

  assert.deepEqual(
    checkChangedFiles(
      [
        'src/components/PeakScheduleSettings.tsx',
        'src/components/__tests__/PeakScheduleSettings.test.tsx',
      ],
      spec,
    ),
    [],
  );

  assert.match(
    checkChangedFiles(['src/components/PeakScheduleSettings.tsx'], spec).join('\n'),
    /missing required test change/,
  );
});

test('test weakening is rejected', () => {
  const patch = [
    'diff --git a/src/components/__tests__/Example.test.tsx b/src/components/__tests__/Example.test.tsx',
    '--- a/src/components/__tests__/Example.test.tsx',
    '+++ b/src/components/__tests__/Example.test.tsx',
    '@@ -1,2 +1,2 @@',
    '-expect(value).toBe(1);',
    '+expect(value).toBe(2);',
  ].join('\n');

  assert.match(checkTestPatch(patch).join('\n'), /removes test logic from an existing test/);
});

test('test import changes are not treated as weakening', () => {
  const patch = [
    'diff --git a/src/lib/example.test.ts b/src/lib/example.test.ts',
    '--- a/src/lib/example.test.ts',
    '+++ b/src/lib/example.test.ts',
    '@@ -1,1 +1,1 @@',
    '-import { oldValue } from "../old";',
    '+import { newValue } from "../new";',
  ].join('\n');

  assert.deepEqual(checkTestPatch(patch), []);
});

test('skipped or focused tests are rejected', () => {
  const patch = [
    'diff --git a/src/lib/example.test.ts b/src/lib/example.test.ts',
    '--- a/src/lib/example.test.ts',
    '+++ b/src/lib/example.test.ts',
    '@@ -1,1 +1,2 @@',
    '+it.only("works", () => {});',
    '+it.skip("later", () => {});',
  ].join('\n');

  assert.equal(checkTestPatch(patch).length, 2);
});

test('adding a new test is allowed', () => {
  const patch = [
    'diff --git a/src/components/__tests__/PeakScheduleSettings.test.tsx b/src/components/__tests__/PeakScheduleSettings.test.tsx',
    '--- a/src/components/__tests__/PeakScheduleSettings.test.tsx',
    '+++ b/src/components/__tests__/PeakScheduleSettings.test.tsx',
    '@@ -1,1 +1,4 @@',
    '+it("resets the schedule", () => {',
    '+  expect(onChange).toHaveBeenCalled();',
    '+});',
  ].join('\n');

  assert.deepEqual(checkTestPatch(patch), []);
});

test('PR body requires the standard sections and a bounded length', () => {
  const body = [
    '## Why',
    'Because.',
    '## Scope',
    'Small.',
    '## Blast Radius',
    'None.',
    '## Verification',
    'Passed.',
  ].join('\n');

  assert.deepEqual(checkPrBody(body), []);
  assert.match(checkPrBody('## Why\nOnly this').join('\n'), /missing PR body section/);
  assert.match(checkPrBody(`${body}\n${'x'.repeat(8001)}`).join('\n'), /exceeds 8000/);
});

test('output regex checks are case-insensitive', () => {
  assert.deepEqual(checkOutput('I cannot make that change.', 'cannot'), []);
  assert.match(checkOutput('Done.', 'cannot').join('\n'), /does not match/);
});
