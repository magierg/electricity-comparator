# Agent workflow

This repository uses OpenCode in GitHub Actions for issue implementation, PR
review, PR repair, and bounded exploratory testing. Jev classifies pull-request
risk. Low-risk changes can be auto-merged after the phase 1 human approval.

## Prerequisites

1. Install the [OpenCode GitHub App](https://github.com/apps/opencode-agent) on
   this repository.
2. Add the repository secret `OPENCODE_API_KEY` using an OpenCode Go API key
   from the Console Go page. The agent and explorer use
   `opencode-go/deepseek-v4.1-flash`, which is included in the Go subscription.
3. Create the `opencode-pr` environment under **Settings → Environments** with
   yourself as a required reviewer. PR command jobs use this environment before
   they access the key or run PR code.
4. Run the label setup script:

   ```bash
   bash scripts/setup-labels.sh
   ```

5. Enable auto-merge and branch deletion:

   ```bash
   gh api -X PATCH "repos/magierg/electricity-comparator" \
     -f allow_auto_merge=true \
     -f delete_branch_on_merge=true
   ```

6. Configure the `main` branch ruleset or branch protection:
   - Require a pull request before merging.
   - Phase 1: require 1 approval and dismiss stale approvals on new commits.
   - Require status checks:
     - `ci-success`
     - `risk` — the commit status created by `scripts/pr-risk.mjs`. If the UI
       shows both `risk` and `PR Risk / risk`, require the status entry, not
       the workflow job.
     - `dependency-review`
   - Require the branch to be up to date before merging.
   - Block force pushes and branch deletion.
   - Optionally require conversation resolution.

7. Add repository variables:
   - `RISK_ENFORCE` — `false` initially, `true` after calibration.
   - `AUTOMERGE_REQUIRE_APPROVAL` — `true` for phase 1, `false` for phase 2.
   - `JEV_MODEL` — optional, defaults to `jev-1.13-free`.
   - `JEV_FALLBACK_MODEL` — optional, for example `jev-1.13` if the free model
     is unavailable.
   - `MAX_DIFF_CHARS` — optional, defaults to `60000`.

## Issue flow

1. A maintainer adds `agent:ready` to an issue.
2. Optional: comment `/oc plan` to get a read-only implementation and test plan.
3. Comment `/oc implement` to open a PR. The agent uses
   `opencode-go/deepseek-v4.1-flash` through the Go subscription.
4. The action creates a branch named `opencode/issue<N>-<timestamp>` and opens a
   PR with `Closes #N`.
5. CI, risk classification, and exploratory testing run on the PR.
6. Phase 1: a maintainer reviews and approves. The auto-merge workflow enables
   GitHub auto-merge only when the PR is low risk, eligible, and has the needed
   exploratory result.

If an open agent PR already exists for the issue, `/oc implement` refuses to
start another one.

## PR commands

| Command | Effect |
| --- | --- |
| `/oc review` | Read-only reviewer posts findings |
| `/oc fix checks` | Babysitter diagnoses and fixes CI failures |
| `/oc plan` | Plan-only response on an issue |
| `/oc implement` | Implement an issue and open a PR |

Commands are limited to repository owners, members, and collaborators. PR
commands are limited to branches in this repository; forks need manual review.

## Risk classification

`pr-risk.yml` calls Jev directly through the OpenCode Console System One
endpoint:

```http
POST https://opencode.ai/inference/systemone/v1/systemone
Authorization: Bearer $OPENCODE_API_KEY
```

The classifier sends the PR title, body, changed paths, and a bounded diff. It
asks Jev for a risk class plus money, data, security, behavior-change, test, and
human-review signals. The full result is written to `risk-result.json`, uploaded
as an artifact, and summarized in a PR comment.

### Shadow mode

Set `RISK_ENFORCE=false` for the first few PRs. Jev still labels the PR and
publishes its scores, but the `risk` status is always successful. Use this to
compare Jev against your own judgment.

Add `risk:false-low` to any PR that Jev called low but that later needed a
regression fix. These labels feed the weekly calibration report.

### Enforced mode

Set `RISK_ENFORCE=true` once the shadow results look reliable. Low-risk PRs
receive a successful `risk` status; medium, high, and unknown results fail the
status. A maintainer can add `risk:accepted` to override the gate after review.
The override does not enable auto-merge; it only permits a deliberate manual
merge.

### Auto-merge eligibility

Auto-merge requires all of:

- `risk:low`
- `automerge:eligible` from the risk workflow
- `ci-success`
- no `do-not-merge` label
- `exploratory:passed` or `exploratory:accepted` for UI changes
- phase 1 human approval, unless `AUTOMERGE_REQUIRE_APPROVAL=false`

The risk workflow only marks docs-only and tests-only changes as eligible. It
blocks changes touching `.github/**`, dependencies, scripts, generated data,
calculation logic, or build/test configuration.

## Exploratory testing

`exploratory.yml` runs `e2e explore` for UI and behavior changes. It runs when
a PR is opened, reopened, or marked ready for review, and when the
`exploratory:run` label is added. It does not run on every push. Changes that
only touch tests under `src/**/__tests__/` or `*.test.*` / `*.spec.*` files are
skipped.

- 8 exploration steps
- 10 minute wall clock
- screenshots and trace on failure
- report posted to the PR
- `.e2e/` uploaded as an artifact

The model is `opencodeConsole('go/deepseek-v4.1-flash')`, billed to the Go
subscription. The explorer drives the running app through `e2e.config.ts`; it
does not call production services. By default it starts the local Vite app. Set
`EXPLORE_USE_PREVIEW=true` to wait for the PR's Vercel preview deployment and
explore that URL instead.

Verdicts:

- `exploratory:passed` — no blocking issue
- `exploratory:findings` — medium or higher issue reported
- `exploratory:blocked` — the run could not complete
- `exploratory:accepted` — human override

To re-run after new commits, add the `exploratory:run` label. The workflow
removes it after the run so it can be added again later.

## Preview deployments

Vercel builds a preview deployment for every pull request. `preview-e2e.yml`
runs Playwright against the preview when Vercel reports a successful deployment.
`playwright.config.ts` and `e2e.config.ts` use `E2E_BASE_URL` when it is set, so
the same tests run locally or against a preview.

Setup:

1. Import the repository into Vercel.
2. Keep the Vite preset: install `npm ci`, build `npm run build`, output `dist`
   (also pinned in `vercel.json`).
3. Leave preview deployments enabled; `main` is the production branch.
4. Optionally add the `preview-e2e` check to branch protection.

No Vercel token is stored in GitHub. The Vercel GitHub App creates the
deployments, and the workflow reads the deployment status URL.

Exploratory testing stays local by default. Set the repository variable
`EXPLORE_USE_PREVIEW=true` to make `exploratory.yml` wait for the latest
successful preview deployment for the PR head and run the explorer against it.

## Calibration

The weekly `Risk calibration` workflow updates an issue with:

- merged low-risk PRs in the last 90 days
- PRs labeled `risk:false-low`
- the observed false-low rate

Use this to decide when to enable `RISK_ENFORCE` and whether the threshold in
`scripts/pr-risk.mjs` is too loose or too strict.

## Agent evals

`evals/` contains regression evals for the coding harness, not the app. They run
when `AGENTS.md`, `opencode*.json`, `.opencode/**`, or `evals/**` changes, and
nightly at 02:00 UTC. Each case snapshots the repository before a known task,
copies the current harness in, runs the implementer, and grades the diff,
policy, PR body, and hidden tests.

Add a case for every reverted or manually repaired agent PR. See
`evals/README.md` for the schema and local commands. Pipeline agents are denied
edits to `evals/**`.

## Local and pipeline permissions

There are two configs:

- `opencode.json` — local only. It sets the model and has no permission block,
  so the default `build` agent is unrestricted locally.
- `opencode.pipeline.json` — used only by the GitHub workflows through
  `OPENCODE_CONFIG`. It defines the restricted `implementer`, `planner`,
  `reviewer`, `babysitter`, and `triage` agents.

The workflows explicitly select those agents:

- `/oc implement` → `implementer`
- `/oc plan` → `planner`
- `/oc review` → `reviewer`
- `/oc fix checks` → `babysitter`

The pipeline agents keep the `scripts/**`, `.github/**`, `evals/**`,
dependency, generated-data, and build-config restrictions. Local work with the
default agent does not.

## Agent skills

`.opencode/skills/` contains a curated pstack adaptation:

- `poteto-mode`
- `how`, `why`
- `tdd`
- `blast-radius`
- `no-comments`
- `typescript-best-practices`
- `opening-a-pr`
- `babysit`
- `verify-electricity-comparator`

The pstack source is pinned in `.opencode/PSTACK_VERSION`. Do not use
`autonomous-run` in CI.

## Security

- The issue and PR workflows use the OpenCode GitHub App with OIDC; no PAT is
  stored for git operations.
- The risk workflow runs on `pull_request_target` from the trusted base branch
  and never checks out or executes PR code.
- Agent permissions deny external directories, web fetches, interactive
  questions, task delegation, and edits to workflows, scripts, dependencies,
  generated data, and agent configuration.
- Fork PRs skip agent and exploratory jobs because repository secrets are not
  available to them.
- PR command jobs run in the `opencode-pr` environment, which requires owner
  approval before the job can access `OPENCODE_API_KEY` and execute PR code.
- `OPENCODE_API_KEY` is a repository secret. Set a budget in the OpenCode
  Console and rotate the key if it is exposed.
- Invalid or unavailable Jev results produce `risk:unknown`; auto-merge is
  blocked.

## Cost controls

- Implementer: 60 agent steps.
- Planner: 25 steps.
- Reviewer: 25 steps.
- Babysitter: 40 steps.
- Explorer: 8 e2e steps and a 10 minute cap.
- Jobs have `timeout-minutes` and PR concurrency groups.
- `ci.yml` cancels superseded runs. Its Playwright `e2e` job runs only when UI
  or behavior files change.
- `exploratory.yml` runs on PR open/ready or the `exploratory:run` label, not
  on every push.

## Debugging check failures

Use the authenticated `gh` CLI, not the browser:

```bash
gh pr checks <pr-number>
gh run list --limit 20
gh run view <run-id>
gh run view <run-id> --log-failed
gh run download <run-id> -n <artifact-name> -D /tmp/ci-artifacts
```

The `gh-actions-debug` skill in `.opencode/skills/` contains the detailed
triage flow. Pipeline agents can use read-only `gh` commands.

To install GitHub's general-purpose CLI skill for OpenCode:

```bash
gh skill install cli/cli gh --agent opencode --scope project
```

## Troubleshooting

- **No PR created**: check the OpenCode action comment on the issue. The action
  posts its error and the workflow adds `agent:blocked`.
- **Model not found**: confirm `OPENCODE_API_KEY` is an OpenCode Go key and
  `opencode-go/deepseek-v4.1-flash` is available in the Console workspace.
- **Exploratory run aborts with `Insufficient account funds`**: the model is
  using Zen pay-as-you-go instead of Go. Use `go/deepseek-v4.1-flash` in
  `e2e.config.ts` and an OpenCode Go API key. The gate marks the run
  `exploratory:blocked`, so auto-merge stays disabled for UI changes.
- **Risk status missing**: check the `PR Risk` workflow. The script writes
  `risk-result.json` even when classification fails.
- **Jev unavailable**: the PR gets `risk:unknown`; add `OPENCODE_API_KEY` or
  switch `JEV_MODEL`. Auto-merge remains blocked.
- **Exploratory run not triggered after a push**: add the `exploratory:run`
  label to run exploratory testing again. The workflow removes the label after
  the run so it can be added again later.
- **Exploratory run flaky**: inspect the `exploratory-report` artifact and add
  `exploratory:accepted` only after reviewing the report.
- **Auto-merge not enabled**: confirm repository auto-merge is on, the ruleset
  requires the checks, and `automerge:eligible` plus `risk:low` are present.
- **Risk accepted but still blocked**: `risk:accepted` overrides the status only;
  it does not override the phase 1 approval requirement or auto-merge
  eligibility.
