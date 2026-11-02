#!/usr/bin/env bash
set -euo pipefail

repo="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"

create() {
  local name="$1"
  local color="$2"
  local description="$3"
  gh label create "$name" --repo "$repo" --color "$color" --description "$description" --force >/dev/null
}

create "agent:ready" "0e8a16" "Issue is approved for the OpenCode agent"
create "agent:in-progress" "d4a72c" "OpenCode is working on this issue"
create "agent:pr" "1d76db" "OpenCode has opened a pull request"
create "agent:blocked" "cf222e" "OpenCode could not complete the issue"
create "agent:plan-required" "5319e7" "A plan must be posted before implementation"

create "risk:low" "0e8a16" "Jev classified this change as low risk"
create "risk:medium" "d4a72c" "Jev classified this change as medium risk"
create "risk:high" "cf222e" "Jev classified this change as high risk"
create "risk:unknown" "6e7781" "Risk could not be classified"
create "risk:accepted" "8250df" "A maintainer accepted the residual risk"
create "risk:false-low" "b60205" "A low-risk prediction that turned out to need a fix"

create "change:docs" "0075ca" "Documentation-only change"
create "change:tests" "1d76db" "Test-only change"
create "change:ui" "5319e7" "User-visible UI change"
create "change:calculation" "b60205" "Cost, tariff, usage, or ranking logic"
create "change:logic" "fbca04" "Non-money application logic"
create "change:data" "cf222e" "Plan dataset or data generator"
create "change:deps" "d93f0b" "Dependency change"
create "change:ci" "6e7781" "Build, test, or lint configuration"
create "change:security" "82071e" "Workflow, script, or supply-chain change"
create "change:unknown" "ededed" "Unclassified path"

create "automerge:eligible" "0e8a16" "Eligible for phase 1 auto-merge"
create "automerge:blocked" "6e7781" "Not eligible for auto-merge"
create "do-not-merge" "b60205" "Stop the auto-merge workflow"

create "exploratory:run" "1d76db" "Re-run exploratory testing for this pull request"
create "exploratory:passed" "0e8a16" "The exploratory run found no blocking issue"
create "exploratory:findings" "d4a72c" "The exploratory run reported findings"
create "exploratory:blocked" "cf222e" "The exploratory run could not complete"
create "exploratory:accepted" "8250df" "A maintainer accepted the exploratory findings"
create "skip-tests" "ededed" "Human-approved exception to the test-change check"

echo "Labels configured in $repo"
