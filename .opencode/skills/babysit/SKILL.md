---
name: babysit
description: Drive an existing pull request to merge-ready without merging it.
---

# Babysit

You own the merge frontier. Stop at merge-ready; never merge.

1. Resolve the PR and base branch with `gh pr view`.
2. Check conflicts and unresolved review threads before CI.
3. Read `gh pr checks`. Classify each failure:
   - infrastructure or flaky: retry once;
   - code-owned: diagnose and fix;
   - stale base or conflict: explain that a rebase is needed.
4. Batch confirmed fixes into one push wave. Do not rebase, force-push, merge, or
   change branch protection without explicit authority.
5. After a fix, run the relevant local checks and report the exact commands.
6. Stop when the PR is merge-ready or blocked.

The OpenCode action handles the commit and push after the session. Do not run
`git push`, `git commit`, or `gh pr merge`.

Report: mode, PR state, fixes, remaining blockers, and any action that still
needs a human.
