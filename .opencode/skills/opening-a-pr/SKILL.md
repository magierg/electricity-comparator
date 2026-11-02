---
name: opening-a-pr
description: Prepare a pull request body with evidence, scope, blast radius, and verification.
---

# Opening a PR

Opening a PR changes external state. In the OpenCode issue workflow, the action
opens the PR after the agent finishes. The agent must not run `git push`,
`git commit`, or `gh pr merge`.

Write the final response as the PR body, under 8,000 characters:

```markdown
## Why
The user problem and why this approach fits.

## Scope
Facts from the diff. Name real files and symbols. State what is out of scope.

## Tradeoffs
Real choices only. Omit when there are none.

## Blast Radius
Who and what the change touches. Name the money/data/security surfaces and why
the change is safe or risky.

## Verification
Exact commands and outcomes. Do not claim a check passed without evidence.

## Follow-ups
Real remaining work. Omit when there is none.
```

Use Conventional Commits for the title when you control it:
`type(scope): subject`. Use `feat`, `fix`, `docs`, `refactor`, `test`, `chore`,
or `perf`. Keep the subject imperative and short.

Do not use `## Summary` or `## Test plan` boilerplate. Do not restate the diff.
