import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyPaths, isAutoMergeCategory } from './classify-paths.mjs';
import { decideRisk } from './pr-risk.mjs';

function answers(overrides = {}) {
  return {
    touches_money: { noul: 0.01 },
    touches_data: { noul: 0.01 },
    touches_security: { noul: 0.01 },
    behavior_change: { noul: 0.01 },
    tests_adequate: { noul: 0.9 },
    needs_human_review: { noul: 0.05 },
    ...overrides,
  };
}

function decision(overrides = {}) {
  return decideRisk({
    riskChoice: 'low',
    probabilities: { low: 0.92, medium: 0.06, high: 0.02 },
    confidence: 0.9,
    answers: answers(),
    categories: ['docs'],
    sensitivePaths: [],
    truncated: false,
    headRepo: 'magierg/electricity-comparator',
    baseRepo: 'magierg/electricity-comparator',
    lowProbability: 0.85,
    minConfidence: 0.7,
    ...overrides,
  });
}

describe('classifyPaths', () => {
  it('classifies docs-only changes', () => {
    const result = classifyPaths([{ filename: 'README.md' }, { filename: 'docs/agent-workflow.md' }]);
    assert.deepEqual(result.categories, ['docs']);
    assert.deepEqual(result.sensitivePaths, []);
    assert.equal(isAutoMergeCategory(result.categories), true);
  });

  it('classifies test files as tests even under components', () => {
    const result = classifyPaths([{ filename: 'src/components/__tests__/DataUpload.test.tsx' }]);
    assert.deepEqual(result.categories, ['tests']);
    assert.equal(isAutoMergeCategory(result.categories), true);
  });

  it('marks the calculator as a sensitive calculation path', () => {
    const result = classifyPaths([{ filename: 'src/lib/calculator.ts' }]);
    assert.deepEqual(result.categories, ['calculation']);
    assert.deepEqual(result.sensitivePaths, ['src/lib/calculator.ts']);
    assert.equal(isAutoMergeCategory(result.categories), false);
  });

  it('marks dependency and workflow changes as sensitive', () => {
    const result = classifyPaths([
      { filename: 'package-lock.json' },
      { filename: '.github/workflows/ci.yml' },
    ]);
    assert.ok(result.categories.includes('deps'));
    assert.ok(result.categories.includes('security'));
    assert.ok(result.sensitivePaths.includes('package-lock.json'));
    assert.ok(result.sensitivePaths.includes('.github/workflows/ci.yml'));
  });

  it('classifies UI changes without treating them as auto-mergeable', () => {
    const result = classifyPaths([{ filename: 'src/components/PlanRow.tsx' }]);
    assert.deepEqual(result.categories, ['ui']);
    assert.equal(isAutoMergeCategory(result.categories), false);
  });

  it('rejects unknown-only changes', () => {
    const result = classifyPaths([{ filename: 'assets/image.bin' }]);
    assert.deepEqual(result.categories, ['unknown']);
    assert.equal(isAutoMergeCategory(result.categories), false);
  });
});

describe('decideRisk', () => {
  it('allows a confident low-risk docs change', () => {
    const result = decision();
    assert.equal(result.finalRisk, 'low');
    assert.equal(result.autoMergeEligible, true);
  });

  it('blocks money changes even when Jev says low', () => {
    const result = decision({ answers: answers({ touches_money: { noul: 0.9 } }) });
    assert.equal(result.finalRisk, 'high');
    assert.equal(result.autoMergeEligible, false);
  });

  it('blocks a sensitive path even with a low-risk label', () => {
    const result = decision({ sensitivePaths: ['src/lib/calculator.ts'] });
    assert.equal(result.finalRisk, 'low');
    assert.equal(result.autoMergeEligible, false);
    assert.match(result.autoMergeReason, /sensitive path/);
  });

  it('blocks truncated diffs', () => {
    const result = decision({ truncated: true });
    assert.equal(result.autoMergeEligible, false);
    assert.match(result.autoMergeReason, /truncated/);
  });

  it('downgrades an uncertain low result to medium', () => {
    const result = decision({
      probabilities: { low: 0.6, medium: 0.3, high: 0.1 },
      confidence: 0.4,
    });
    assert.equal(result.finalRisk, 'medium');
    assert.equal(result.autoMergeEligible, false);
  });

  it('blocks fork pull requests', () => {
    const result = decision({ headRepo: 'someone/fork' });
    assert.equal(result.autoMergeEligible, false);
    assert.match(result.autoMergeReason, /fork/);
  });
});
