---
name: gh-actions-debug
description: Debug GitHub Actions and pull-request check failures with the gh CLI instead of a browser.
---

# GitHub Actions debugging with gh

Use the authenticated `gh` CLI. Do not use a browser to read Actions logs; the
browser session is often unauthenticated and GitHub hides job logs.

## Triage a PR

```bash
gh pr checks <pr-number>
gh pr view <pr-number>
gh pr diff <pr-number>
```

`gh pr checks` shows the failed check names. Match the name to a workflow run
and job.

## Read a failed run

```bash
gh run list --limit 20
gh run view <run-id>
gh run view <run-id> --log-failed
```

For one job:

```bash
gh run view <run-id> --job <job-id> --log
```

If the log is truncated, download the full log:

```bash
gh run view <run-id> --job <job-id> --log > /tmp/ci.log
```

## Artifacts

```bash
gh run download <run-id> -n <artifact-name> -D /tmp/ci-artifacts
```

## Debugging rules

1. Read the first failing step, not the last error in the job.
2. Identify the exact command from the workflow.
3. Reproduce that command locally before changing code.
4. If the failure is a test, run only that test first:
   ```bash
   npx jest <test-path> --runInBand
   ```
5. Check whether the failure is:
   - a test assertion;
   - a coverage threshold;
   - a missing secret or permission;
   - an invalid workflow expression;
   - a flaky external dependency.
6. After a fix, run the same command and report the exact output.

## Pipeline agent limits

Pipeline agents may use read-only `gh` commands:

```text
gh pr checks
gh pr view
gh pr diff
gh run view
gh run list
gh run download
gh issue view
```

Do not run `gh pr merge`, `gh pr close`, `gh api` writes, or any command that
changes repository state. Do not use the browser for Actions debugging.
