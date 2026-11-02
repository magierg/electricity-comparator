import assert from 'node:assert/strict';
import test from 'node:test';

import { buildComment, decideVerdict } from './explore-gate.mjs';

function explore(overrides = {}) {
  return {
    ended: 'completed',
    steps: [{ status: 'done' }],
    findings: [],
    ...overrides,
  };
}

test('passes a completed exploration without blocking findings', () => {
  const result = decideVerdict(explore());

  assert.equal(result.verdict, 'passed');
  assert.deepEqual(result.findings, []);
});

test('blocks an aborted run even when it recorded no steps', () => {
  const result = decideVerdict(explore({ ended: 'aborted', steps: [] }));

  assert.equal(result.verdict, 'blocked');
});

test('blocks a completed run that never executed a step', () => {
  const result = decideVerdict(explore({ steps: [] }));

  assert.equal(result.verdict, 'blocked');
});

test('blocks a run where every step was blocked', () => {
  const result = decideVerdict(
    explore({ steps: [{ status: 'blocked' }, { status: 'blocked' }] }),
  );

  assert.equal(result.verdict, 'blocked');
});

test('blocks a run where every step was blocked even if it also reported a finding', () => {
  const result = decideVerdict(
    explore({
      steps: [{ status: 'blocked' }],
      findings: [{ kind: 'issue', severity: 3, title: 'Wrong total' }],
    }),
  );

  assert.equal(result.verdict, 'blocked');
  assert.equal(result.findings.length, 1);
});

test('reports medium and higher findings', () => {
  const result = decideVerdict(
    explore({
      findings: [
        { kind: 'issue', severity: 3, title: 'Wrong total' },
        { kind: 'issue', severity: 4, title: 'Missing plan' },
      ],
    }),
  );

  assert.equal(result.verdict, 'findings');
  assert.equal(result.findings.length, 2);
});

test('ignores low severity findings and non-issue entries', () => {
  const result = decideVerdict(
    explore({
      findings: [
        { kind: 'issue', severity: 2, title: 'Cosmetic spacing' },
        { kind: 'note', severity: 5, title: 'Observation' },
      ],
    }),
  );

  assert.equal(result.verdict, 'passed');
});

test('honours a custom blocking severity', () => {
  const result = decideVerdict(
    explore({
      findings: [{ kind: 'issue', severity: 3, title: 'Wrong total' }],
    }),
    4,
  );

  assert.equal(result.verdict, 'passed');
});

test('does not claim a blocked run had no issues', () => {
  const body = buildComment({
    verdict: 'blocked',
    explore: { ended: 'aborted', steps: [], findings: [] },
    findings: [],
  });

  assert.match(body, /The exploration did not complete/);
  assert.doesNotMatch(body, /No issues reported/);
});

test('reports that a passed run had no issues', () => {
  const body = buildComment({
    verdict: 'passed',
    explore: explore(),
    findings: [],
  });

  assert.match(body, /No issues reported/);
});
