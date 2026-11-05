# Agent evals

`evals/` contains regression tests for the **coding harness**, not for the app.
They answer one question: if the agent configuration changes, does the
implementer still produce an acceptable change?

The app's unit, e2e, and exploratory tests remain the verification gate for
application behavior. These evals protect `AGENTS.md`, `.opencode/**`,
`opencode*.json`, and the model choice.

## How a case runs

1. Snapshot the repository at the case's `from` commit with `git archive`.
   There is no `.git` history and no remote, so the agent cannot look up the
   future fix.
2. Remove `evals/` from the snapshot. Copy the current harness — `AGENTS.md`,
   `opencode.json`, `opencode.pipeline.json`, and `.opencode/` — into it.
3. Commit that as the eval base, install dependencies, and run the implementer
   non-interactively.
4. Capture the agent diff and output **before** hidden checks are copied in.
5. Copy hidden tests, run the case checks, then grade the diff, policy, PR body,
   and output with `check-diff.mjs`.
6. Write `eval-results/<case>/` with the diff, output, check logs, and summary.

The runner pins `PWD` to the snapshot. OpenCode resolves its project from `PWD`,
not only from the child process cwd.

The eval fails if the agent changes a protected path, skips or weakens a test,
misses a required change, omits the PR body sections, times out, or leaves a
check red.

## Layout

```
evals/
  README.md
  run-eval.mjs          # one case per invocation
  list-cases.mjs        # matrix input for the workflow
  check-diff.mjs        # diff, policy, PR body, and output checks
  check-diff.test.mjs   # unit tests for the checker
  cases/*.json          # one task per file
  checks/*.hidden       # hidden tests, copied in after the agent finishes
```

## Case schema

```json
{
  "name": "002-peak-reset",
  "source": "Issue #23",
  "suite": "full",
  "from": "<git sha before the change>",
  "prompt": "The task, ideally the original issue body.",
  "may_change": ["src/components/PeakScheduleSettings.tsx", "src/components/__tests__/**"],
  "must_not_change": [".github/**", "package.json", "src/data/**"],
  "required_changes": ["src/components/PeakScheduleSettings.tsx"],
  "required_test_change": true,
  "require_pr_body": true,
  "hidden_tests": [
    {
      "source": "checks/peak-reset.test.tsx.hidden",
      "dest": "src/components/__tests__/eval-peak-reset.test.tsx"
    }
  ],
  "checks": [
    { "name": "lint", "run": "npm run lint:ci" },
    { "name": "typecheck", "run": "npm run typecheck" },
    { "name": "unit tests", "run": "npm test -- --runInBand" },
    { "name": "build", "run": "npm run build" }
  ]
}
```

- `suite` is `smoke` for PR runs or `full` for the nightly run. Omit it for
  `full`.
- `may_change` is a glob allowlist. An empty list means no changes are allowed.
- `must_not_change` wins over `may_change`.
- `output_must_match` is an optional case-insensitive regex for refusal evals.
- `require_pr_body` checks for `## Why`, `## Scope`, `## Blast Radius`, and
  `## Verification`, and a body under 8,000 characters.
- Hidden tests use a `.hidden` suffix so Jest and ESLint ignore them in this
  directory. The runner renames them when copying.

## Adding an eval

Use a real task with an accepted outcome whenever possible:

1. Find the base commit before the accepted PR or the issue's starting point.
2. Put the original issue text in `prompt`.
3. Set `may_change` from the task's scope, not from the exact solution diff.
4. Add checks that test behavior. Put hidden tests in `checks/` when the agent
   should not see them.
5. Add the case and run it once before merging.

Every production incident or reverted agent PR should become a case. That is
how the suite stays discriminating as models improve.

## Running locally

```bash
OPENCODE_API_KEY=... node evals/run-eval.mjs --case evals/cases/001-docs-exploratory-run.json
```

Use `--dry-run` to prepare the snapshot and harness without calling the model:

```bash
node evals/run-eval.mjs --case evals/cases/001-docs-exploratory-run.json --dry-run
```

Run the checker tests with:

```bash
node --test evals/check-diff.test.mjs
```

## CI and gating

`.github/workflows/agent-evals.yml` runs:

- on PRs touching `AGENTS.md`, `opencode*.json`, `.opencode/**`, `evals/**`, or
  the workflow itself, using the `smoke` suite;
- nightly at 02:00 UTC, using every case;
- manually through `workflow_dispatch`, using every case.

PR runs are limited to branches in this repository and to owners, members, or
collaborators. Fork PRs are skipped. The workflow has `contents: read` and
does not persist checkout credentials.

Start by collecting results without adding the check to branch protection.
Once the suite is stable, add `Agent evals / evals` to the required checks for
harness changes. Do not gate every application PR on this suite; it is slow and
the app already has deterministic tests.

## Protection

Pipeline agents are denied edits to `evals/**`. The suite is part of the
harness, so changing it requires a human PR and a fresh eval run.
