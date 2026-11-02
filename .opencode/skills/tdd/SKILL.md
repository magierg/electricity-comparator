---
name: tdd
description: Use for a bug fix with a clear, cheap local test path. Write a failing regression test before changing production code.
---

# TDD bug fix

Use only when the test path is cheap and clear. Skip when the test would require
a broad harness, brittle mocks, or expensive infrastructure; say why and use the
closest executable check instead.

1. Identify the intended behavior and the smallest observable reproduction.
2. Add the narrowest test that would have caught the bug.
3. Run it before the fix. Confirm it fails for the intended reason.
4. Make the smallest production change that satisfies the behavior.
5. Rerun the regression test. Confirm it passes.
6. Run nearby checks: relevant tests, typecheck, lint, build.

Do not weaken existing assertions. Do not change tests to match a wrong
implementation. Prefer no new test over a bad test that mostly asserts mocks or
implementation details.

Report the failing-before evidence and the passing-after run.
