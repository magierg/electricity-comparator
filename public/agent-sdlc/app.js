(() => {
  'use strict';

  const REPO = 'https://github.com/magierg/electricity-comparator';
  const BLOB = `${REPO}/blob/main`;
  const TREE = `${REPO}/tree/main`;
  const WORKFLOWS = `${TREE}/.github/workflows`;

  const STAGES = [
    {
      id: 'intake',
      index: '01',
      lane: 'issue',
      icon: 'inbox',
      title: 'Intake',
      actor: 'Maintainer',
      actorKind: 'human',
      summary:
        'A maintainer decides the issue is worth doing and marks it eligible. Nothing runs automatically.',
      trigger: 'Add <code>agent:ready</code> to an issue, then comment <code>/oc plan</code> or <code>/oc implement</code>.',
      run: 'GitHub issue · maintainer',
      output: 'A scoped issue labelled <code>agent:ready</code>.',
      labels: ['agent:ready'],
      guardrails: [
        'A human chooses the work; agents never start from an unlabeled issue.',
        'Slash commands are accepted only from owners, members, and collaborators.',
      ],
      failure: 'Without <code>agent:ready</code>, the slash commands are ignored.',
      links: [
        { label: 'Runbook', href: `${BLOB}/docs/agent-workflow.md` },
        { label: 'Issue template', href: `${BLOB}/.github/ISSUE_TEMPLATE/agent-task.yml` },
      ],
    },
    {
      id: 'plan',
      index: '02',
      lane: 'issue',
      icon: 'map',
      title: 'Plan',
      actor: 'Planner',
      actorKind: 'agent',
      summary:
        'The planner reads the issue and posts a test-aware implementation plan without touching the repository.',
      trigger: '<code>/oc plan</code> on an <code>agent:ready</code> issue.',
      run: 'opencode-issue.yml · planner · 25 steps · 15 minute job timeout',
      output: 'A plan comment on the issue. No branch and no file changes.',
      commands: ['/oc plan'],
      guardrails: [
        'Edit is denied.',
        'Bash is limited to read-only git and gh commands.',
        'Web access, task delegation, external directories, and interactive questions are denied.',
      ],
      failure:
        'A missing key or unavailable model is posted as a workflow error. No PR is expected from this stage.',
      links: [
        { label: 'Workflow', href: `${WORKFLOWS}/opencode-issue.yml` },
        { label: 'Planner prompt', href: `${BLOB}/.opencode/prompts/planner.md` },
        { label: 'Pipeline config', href: `${BLOB}/opencode.pipeline.json` },
      ],
    },
    {
      id: 'implement',
      index: '03',
      lane: 'issue',
      icon: 'code',
      title: 'Implement',
      actor: 'Implementer',
      actorKind: 'agent',
      summary:
        'The implementer changes app code and tests, runs the local checks, and opens a pull request that closes the issue.',
      trigger:
        '<code>/oc implement</code> on an <code>agent:ready</code> issue with no open agent PR for that issue.',
      run: 'opencode-issue.yml · implementer · 60 steps · 45 minute job timeout',
      output:
        'Branch <code>opencode/issue&lt;N&gt;-&lt;timestamp&gt;</code>, a PR with <code>Closes #N</code>, and <code>agent:pr</code> or <code>agent:blocked</code> on the issue.',
      commands: ['/oc implement'],
      labels: ['agent:in-progress', 'agent:pr', 'agent:blocked'],
      guardrails: [
        'Denied edits: <code>.github/**</code>, <code>package*.json</code>, <code>AGENTS.md</code>, <code>opencode*.json</code>, <code>.opencode/**</code>, <code>src/data/**</code>, <code>data/**</code>, <code>scripts/**</code>, and build/test configuration.',
        'No arbitrary bash: git reads, test commands, linters, the build, and read-only gh commands are allowlisted.',
        'A duplicate open agent PR for the same issue is refused.',
      ],
      failure:
        'If no PR is created, the issue gets <code>agent:blocked</code>. The action comment contains the error.',
      links: [
        { label: 'Workflow', href: `${WORKFLOWS}/opencode-issue.yml` },
        { label: 'Implementer prompt', href: `${BLOB}/.opencode/prompts/implementer.md` },
        { label: 'Guardrails', href: `${BLOB}/AGENTS.md` },
      ],
    },
    {
      id: 'verify',
      index: '04',
      lane: 'pr',
      icon: 'shield',
      title: 'Verify',
      actor: 'CI',
      actorKind: 'ci',
      summary:
        'CI proves the change builds and behaves. UI paths get Playwright; Vercel previews get their own e2e pass.',
      trigger: 'A pull request is opened or updated.',
      run: 'ci.yml · lint, typecheck, actionlint, unit, build, data, security · e2e when UI paths change',
      output:
        'The <code>ci-success</code> aggregate, <code>dependency-review</code>, and preview e2e checks.',
      signals: ['ci-success', 'dependency-review', 'preview e2e'],
      guardrails: [
        'The change filter skips app e2e for docs and tests-only PRs.',
        'Preview e2e runs against the Vercel deployment reported by the GitHub deployment status.',
        'The generated plan dataset is checked with <code>npm run data:plans:check</code>.',
      ],
      failure:
        'A red check stops the line. Use <code>/oc fix checks</code> or repair it manually, then push.',
      links: [
        { label: 'CI workflow', href: `${WORKFLOWS}/ci.yml` },
        { label: 'Preview e2e', href: `${WORKFLOWS}/preview-e2e.yml` },
        { label: 'Dependency review', href: `${WORKFLOWS}/dependency-review.yml` },
      ],
    },
    {
      id: 'classify',
      index: '05',
      lane: 'pr',
      icon: 'radar',
      title: 'Classify',
      actor: 'Jev + rules',
      actorKind: 'automation',
      summary:
        'Jev classifies regression risk. Path rules assign the change category. Together they become labels, a comment, and a required status.',
      trigger: 'A pull request is opened, synchronized, reopened, or marked ready for review.',
      run: 'pr-risk.yml · pull_request_target · trusted base · Jev + path rules',
      output:
        '<code>risk:*</code>, <code>change:*</code>, and <code>automerge:*</code> labels, a <code>risk</code> commit status, a PR comment, and a risk artifact.',
      labels: [
        'risk:low',
        'risk:medium',
        'risk:high',
        'risk:unknown',
        'change:security',
        'automerge:eligible',
        'automerge:blocked',
      ],
      guardrails: [
        'Runs on <code>pull_request_target</code> from the trusted base and never checks out or executes PR code.',
        'The diff is bounded by <code>MAX_DIFF_CHARS</code>; a truncated diff is not auto-merge eligible.',
        'Shadow mode keeps the risk status non-blocking during calibration.',
        '<code>risk:accepted</code> overrides the status only; it never enables auto-merge.',
      ],
      failure:
        'A missing key, unavailable model, or timeout produces <code>risk:unknown</code>. A truncated diff can still be classified but is never auto-merge eligible.',
      links: [
        { label: 'Risk workflow', href: `${WORKFLOWS}/pr-risk.yml` },
        { label: 'Classifier', href: `${BLOB}/scripts/pr-risk.mjs` },
        { label: 'Path rules', href: `${BLOB}/scripts/classify-paths.mjs` },
        { label: 'Override', href: `${WORKFLOWS}/risk-accept.yml` },
        { label: 'Calibration', href: `${WORKFLOWS}/risk-report.yml` },
      ],
    },
    {
      id: 'explore',
      index: '06',
      lane: 'pr',
      icon: 'search',
      title: 'Explore',
      actor: 'Explorer',
      actorKind: 'agent',
      summary:
        'For UI and behavior changes, an exploratory agent uses the app like a person and reports what it finds.',
      trigger:
        'PR opened, reopened, or ready for review, or the <code>exploratory:run</code> label is added. UI and behavior paths only.',
      run: 'exploratory.yml · 8 steps · 10 minute wall clock · go/deepseek-v4.1-flash · local Vite or Vercel preview',
      output:
        '<code>exploratory:passed</code>, <code>findings</code>, <code>blocked</code>, or <code>accepted</code>; a PR comment; and a <code>.e2e/</code> artifact.',
      labels: [
        'exploratory:run',
        'exploratory:passed',
        'exploratory:findings',
        'exploratory:blocked',
        'exploratory:accepted',
      ],
      guardrails: [
        'The explorer drives the running app; it does not call production services.',
        'Tests-only changes and fork PRs are skipped.',
        'The workflow removes <code>exploratory:run</code> after a run so it can be added again.',
        'A human reviews the report before adding <code>exploratory:accepted</code>.',
      ],
      failure:
        'Findings or a blocked run fail the exploratory gate. Inspect the artifact and re-run with <code>exploratory:run</code>.',
      links: [
        { label: 'Exploratory workflow', href: `${WORKFLOWS}/exploratory.yml` },
        { label: 'e2e config', href: `${BLOB}/e2e.config.ts` },
        { label: 'Verdict gate', href: `${BLOB}/scripts/explore-gate.mjs` },
      ],
    },
    {
      id: 'review',
      index: '07',
      lane: 'pr',
      icon: 'eye',
      title: 'Review + repair',
      actor: 'Reviewer / Babysitter',
      actorKind: 'agent',
      summary:
        'Humans review the change. Agents can help: the reviewer posts read-only findings, and the babysitter repairs red checks.',
      trigger:
        '<code>/oc review</code> or <code>/oc fix checks</code> on a non-fork PR, plus normal human review.',
      run: 'opencode-pr.yml · opencode-pr environment approval · reviewer 25 steps / babysitter 40 steps',
      output: 'Review findings, fix commits, and an approval or a request for changes.',
      commands: ['/oc review', '/oc fix checks'],
      guardrails: [
        'The job runs in the <code>opencode-pr</code> environment with a required reviewer.',
        'A command posted before the latest push is rejected.',
        'A PR that changes agent configuration makes the command refuse.',
        'Forks need manual review.',
      ],
      failure:
        'Fork PRs, stale commands, config drift, or withheld environment approval make the command refuse. Re-post after the latest push.',
      links: [
        { label: 'PR workflow', href: `${WORKFLOWS}/opencode-pr.yml` },
        { label: 'Reviewer prompt', href: `${BLOB}/.opencode/prompts/reviewer.md` },
        { label: 'Babysitter prompt', href: `${BLOB}/.opencode/prompts/babysitter.md` },
      ],
    },
    {
      id: 'merge',
      index: '08',
      lane: 'pr',
      icon: 'git-branch',
      title: 'Merge',
      actor: 'Auto-merge',
      actorKind: 'automation',
      summary:
        'Auto-merge is a narrow, opt-in path. Everything else is a deliberate human merge.',
      trigger: 'A review, label, or check update on the pull request.',
      run: 'automerge.yml · branch protection · 5 minute gate',
      output:
        'GitHub auto-merge enabled with squash and branch deletion, or a blocked result with the missing reasons in the workflow log.',
      labels: ['risk:low', 'automerge:eligible', 'exploratory:passed', 'do-not-merge'],
      signals: ['ci-success', 'risk', 'dependency-review'],
      guardrails: [
        'Current policy: auto-merge is limited to docs-only and tests-only changes.',
        'Phase 1 requires an approving review unless <code>AUTOMERGE_REQUIRE_APPROVAL=false</code>.',
        '<code>risk:accepted</code> permits a manual merge but never enables auto-merge.',
        '<code>do-not-merge</code> stops the gate regardless of other labels.',
      ],
      failure:
        'Any missing gate leaves auto-merge off. A maintainer can still merge manually once the required checks pass.',
      links: [
        { label: 'Auto-merge workflow', href: `${WORKFLOWS}/automerge.yml` },
        { label: 'Merge policy', href: `${BLOB}/docs/agent-workflow.md#auto-merge-eligibility` },
      ],
    },
  ];

  const PRESETS = {
    docs: {
      change: 'docs',
      risk: 'low',
      explore: 'passed',
      phase: '1',
      approval: 'approved',
      override: false,
      block: false,
    },
    ui: {
      change: 'ui',
      risk: 'low',
      explore: 'passed',
      phase: '1',
      approval: 'approved',
      override: false,
      block: false,
    },
    money: {
      change: 'sensitive',
      risk: 'high',
      explore: 'not-run',
      phase: '1',
      approval: 'waiting',
      override: false,
      block: false,
    },
  };

  const CATEGORY_LABELS = {
    docs: 'change:docs',
    tests: 'change:tests',
    ui: 'change:ui',
    sensitive: 'change:security',
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function icon(name, className = 'icon') {
    return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
  }

  function chipClass(name) {
    if (name.startsWith('agent:')) return 'chip-agent';
    if (name === 'risk:accepted' || name === 'exploratory:accepted') return 'chip-override';
    if (name === 'risk:low' || name === 'automerge:eligible' || name === 'exploratory:passed') {
      return 'chip-pass';
    }
    if (name === 'risk:medium' || name === 'exploratory:findings') return 'chip-warn';
    if (
      name === 'risk:high' ||
      name === 'risk:false-low' ||
      name === 'exploratory:blocked' ||
      name === 'do-not-merge'
    ) {
      return 'chip-fail';
    }
    return 'chip-muted';
  }

  function chip(name) {
    return `<span class="chip ${chipClass(name)}">${name}</span>`;
  }

  function commandChip(command) {
    return `
      <div class="command-chip">
        <code>${command}</code>
        <button
          class="copy-button"
          type="button"
          data-copy="${command}"
          aria-label="Copy ${command}"
        >
          ${icon('copy')}
          <span class="copy-label">Copy</span>
        </button>
      </div>
    `;
  }

  function renderPipeline() {
    const pipeline = $('#pipeline');
    pipeline.innerHTML = STAGES.map(
      (stage, index) => `
        <button
          class="stage-tab"
          id="stage-tab-${stage.id}"
          type="button"
          role="tab"
          aria-selected="${index === 0}"
          aria-controls="stage-detail"
          tabindex="${index === 0 ? 0 : -1}"
          data-stage="${stage.id}"
          data-lane="${stage.lane}"
        >
          <span class="stage-node">${icon(stage.icon)}</span>
          <span class="stage-copy">
            <span class="stage-number">${stage.index}</span>
            <span class="stage-name">${stage.title}</span>
            <span class="stage-actor">${stage.actor}</span>
          </span>
        </button>
      `,
    ).join('');
  }

  function renderStage(id, { focus = false, updateHash = true } = {}) {
    const stage = STAGES.find((candidate) => candidate.id === id) || STAGES[0];
    const tabs = $$('.stage-tab');
    const detail = $('#stage-detail');

    tabs.forEach((tab) => {
      const selected = tab.dataset.stage === stage.id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    const selectedTab = tabs.find((tab) => tab.dataset.stage === stage.id);
    if (selectedTab && focus) selectedTab.focus();
    if (selectedTab) detail.setAttribute('aria-labelledby', selectedTab.id);

    const laneLabel = stage.lane === 'issue' ? 'Issue lane' : 'Pull request lane';
    const actorClass = `actor-${stage.actorKind}`;
    const commands = stage.commands || [];
    const labels = stage.labels || [];
    const signals = stage.signals || [];
    const guardrails = stage.guardrails || [];
    const links = stage.links || [];

    detail.innerHTML = `
      <div class="detail-content">
        <div class="detail-top">
          <div class="detail-title">
            <p class="detail-kicker">
              <span class="detail-index">${stage.index}</span>
              ${laneLabel} · ${stage.run.split(' · ')[0]}
            </p>
            <h3>${stage.title}</h3>
            <p class="detail-summary">${stage.summary}</p>
          </div>
          <span class="actor ${actorClass}">
            <span class="actor-dot" aria-hidden="true"></span>
            ${stage.actor}
          </span>
        </div>

        ${
          commands.length
            ? `<div class="detail-commands">${commands.map(commandChip).join('')}</div>`
            : ''
        }

        <div class="detail-body">
          <div class="detail-story">
            <div class="contract-grid">
              <div class="contract-item">
                <span class="contract-label">Trigger</span>
                <p>${stage.trigger}</p>
              </div>
              <div class="contract-item">
                <span class="contract-label">Runs in</span>
                <p>${stage.run}</p>
              </div>
              <div class="contract-item">
                <span class="contract-label">Produces</span>
                <p>${stage.output}</p>
              </div>
            </div>

            ${
              guardrails.length
                ? `
                  <div class="detail-block">
                    <h4>Guardrails</h4>
                    <ul class="detail-list">
                      ${guardrails.map((item) => `<li>${icon('check')}<span>${item}</span></li>`).join('')}
                    </ul>
                  </div>
                `
                : ''
            }
          </div>

          <aside class="detail-side">
            ${
              labels.length || signals.length
                ? `
                  <div class="detail-block">
                    <h4>Labels and signals</h4>
                    <div class="chip-row">
                      ${labels.map(chip).join('')}
                      ${signals
                        .map((signal) => `<span class="chip chip-signal">${signal}</span>`)
                        .join('')}
                    </div>
                  </div>
                `
                : ''
            }

            ${
              links.length
                ? `
                  <div class="detail-block">
                    <h4>Source</h4>
                    <div class="link-row">
                      ${links
                        .map(
                          (link) =>
                            `<a class="source-link" href="${link.href}" target="_blank" rel="noreferrer">${link.label}${icon('external')}</a>`,
                        )
                        .join('')}
                    </div>
                  </div>
                `
                : ''
            }
          </aside>
        </div>

        <div class="detail-failure">
          <span class="failure-icon" aria-hidden="true">${icon('alert')}</span>
          <div>
            <strong>If it fails</strong>
            <p>${stage.failure}</p>
          </div>
        </div>
      </div>
    `;

    if (updateHash) {
      const nextHash = `#stage-${stage.id}`;
      try {
        history.replaceState(null, '', nextHash);
      } catch {
        location.hash = nextHash;
      }
    }
  }

  function stageFromHash() {
    const match = window.location.hash.match(/^#stage-([a-z-]+)$/);
    if (!match) return null;
    return STAGES.some((stage) => stage.id === match[1]) ? match[1] : null;
  }

  function wirePipeline() {
    const pipeline = $('#pipeline');

    pipeline.addEventListener('click', (event) => {
      const tab = event.target.closest('.stage-tab');
      if (!tab) return;
      renderStage(tab.dataset.stage);
    });

    pipeline.addEventListener('keydown', (event) => {
      const tabs = $$('.stage-tab');
      const currentIndex = tabs.indexOf(document.activeElement);
      if (currentIndex < 0) return;

      let nextIndex;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = tabs.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      renderStage(tabs[nextIndex].dataset.stage, { focus: true });
    });

    $('#stage-detail').addEventListener('click', (event) => {
      const button = event.target.closest('[data-copy]');
      if (!button) return;
      copyToClipboard(button.dataset.copy).then(() => {
        const originalLabel = button.getAttribute('aria-label');
        button.classList.add('is-copied');
        button.setAttribute('aria-label', 'Copied');
        window.setTimeout(() => {
          button.classList.remove('is-copied');
          button.setAttribute('aria-label', originalLabel);
        }, 1600);
      }).catch(() => {
        void 0;
      });
    });

    window.addEventListener('hashchange', () => {
      const id = stageFromHash();
      if (id) renderStage(id, { updateHash: false });
    });
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        void 0;
      }
    }

    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }

  function formState() {
    return {
      change: form.elements.change.value,
      risk: form.elements.risk.value,
      explore: form.elements.explore.value,
      phase: form.elements.phase.value,
      approval: form.elements.approval.value,
      override: form.elements.override.checked,
      block: form.elements.block.checked,
    };
  }

  function syncVisibility() {
    const isUi = form.elements.change.value === 'ui';
    const isPhaseOne = form.elements.phase.value === '1';
    $('#explore-group').hidden = !isUi;
    $('#approval-group').hidden = !isPhaseOne;
  }

  function syncChoiceClasses() {
    $$('.choice', form).forEach((choice) => {
      const input = $('input', choice);
      choice.classList.toggle('is-checked', Boolean(input && input.checked));
    });
  }

  function gateState(pass, detail, neutral = false) {
    return {
      status: neutral ? 'neutral' : pass ? 'pass' : 'fail',
      detail,
    };
  }

  function evaluate(state) {
    const isUi = state.change === 'ui';
    const categoryEligible = state.change === 'docs' || state.change === 'tests';
    const sensitive = state.change === 'sensitive';
    const riskLow = state.risk === 'low';
    const riskStatusOk = riskLow || state.override;
    const explorePassed =
      !isUi || state.explore === 'passed' || state.explore === 'accepted';
    const approvalOk = state.phase === '2' || state.approval === 'approved';
    const noBlock = !state.block;
    const autoEligible = categoryEligible && riskLow && !sensitive;
    const autoMerge = autoEligible && noBlock && explorePassed && approvalOk;

    const gates = [];
    gates.push(
      gateState(
        categoryEligible,
        categoryEligible
          ? 'Docs-only and tests-only changes are the only auto-merge-eligible categories.'
          : sensitive
            ? 'Sensitive paths are never auto-merge eligible.'
            : 'UI changes are not auto-merge eligible in the current policy.',
      ),
    );
    gates.push(
      gateState(
        riskLow,
        riskLow
          ? 'Jev classified the change as low risk.'
          : state.override
            ? 'risk:accepted overrides the status, but auto-merge still requires risk:low.'
            : 'The risk status fails in enforced mode.',
      ),
    );
    gates.push(
      gateState(
        !state.block,
        state.block
          ? 'do-not-merge is present.'
          : 'No do-not-merge label.',
      ),
    );
    gates.push(
      gateState(
        approvalOk,
        state.phase === '2'
          ? 'Phase 2 does not require an approval.'
          : state.approval === 'approved'
            ? 'Phase 1 approval is recorded.'
            : 'Phase 1 still needs an approving review.',
      ),
    );
    gates.push(
      gateState(
        explorePassed,
        isUi
          ? state.explore === 'passed'
            ? 'Exploratory run passed.'
            : state.explore === 'accepted'
              ? 'A maintainer accepted the exploratory findings.'
              : 'UI changes need exploratory:passed or exploratory:accepted.'
          : 'Exploratory testing is not required for this change.',
        !isUi,
      ),
    );

    const labels = [
      `risk:${state.risk}`,
      CATEGORY_LABELS[state.change],
      autoEligible ? 'automerge:eligible' : 'automerge:blocked',
    ];
    if (isUi) {
      labels.push(state.explore === 'not-run' ? 'exploratory: (none)' : `exploratory:${state.explore}`);
    }
    if (state.override) labels.push('risk:accepted');
    if (state.block) labels.push('do-not-merge');

    if (autoMerge) {
      return {
        level: 'auto',
        badge: 'Auto',
        title: 'Auto-merge enabled',
        summary:
          'This is the narrow happy path: a low-risk docs or tests change with every gate satisfied. GitHub will squash-merge it when the required checks pass.',
        gates,
        labels,
      };
    }

    if (state.block) {
      return {
        level: 'blocked',
        badge: 'Blocked',
        title: 'Auto-merge blocked',
        summary:
          'do-not-merge stops the gate. Remove the label only after the concern is resolved; other labels cannot override it.',
        gates,
        labels,
      };
    }

    if (!riskStatusOk) {
      return {
        level: 'blocked',
        badge: 'Blocked',
        title: 'Risk gate fails',
        summary:
          'Under enforced risk mode, medium, high, and unknown results fail the required status. A maintainer can review the risk and add risk:accepted to permit a manual merge.',
        gates,
        labels,
      };
    }

    if (!autoEligible) {
      const approvalNote = approvalOk ? '' : ' Phase 1 approval is still required for the manual merge.';

      if (isUi) {
        return {
          level: 'manual',
          badge: 'Manual',
          title: 'Manual merge only',
          summary:
            `UI changes are deliberately outside the auto-merge path, even when exploratory testing passes. A maintainer merges after reviewing the evidence.${approvalNote}`,
          gates,
          labels,
        };
      }

      if (sensitive) {
        return {
          level: 'manual',
          badge: 'Manual',
          title: 'Manual merge only',
          summary:
            `Sensitive paths are never auto-merge eligible. The risk classification and human review are the safety net for this change.${approvalNote}`,
          gates,
          labels,
        };
      }

      return {
        level: 'manual',
        badge: 'Manual',
        title: 'Manual merge only',
        summary:
          `Auto-merge still requires a low risk classification; risk:accepted only permits a deliberate manual merge.${approvalNote}`,
        gates,
        labels,
      };
    }

    if (!approvalOk) {
      return {
        level: 'hold',
        badge: 'Hold',
        title: 'Waiting on approval',
        summary:
          'The change is eligible and the risk status is acceptable, but phase 1 still needs an approving review before auto-merge can be enabled.',
        gates,
        labels,
      };
    }

    return {
      level: 'manual',
      badge: 'Manual',
      title: 'Manual merge only',
      summary:
        'Auto-merge is not available for this combination. A maintainer can merge manually once the required checks pass.',
      gates,
      labels,
    };
  }

  function gateIcon(status) {
    if (status === 'pass') return icon('check');
    if (status === 'fail') return icon('x');
    return icon('minus');
  }

  function renderOutcome(state) {
    const result = evaluate(state);
    const outcome = $('.sim-outcome');
    outcome.dataset.outcome = result.level;
    $('#sim-badge').textContent = result.badge;
    $('#sim-title').textContent = result.title;
    $('#sim-summary').textContent = result.summary;
    $('#sim-gates').innerHTML = result.gates
      .map(
        (gate) => `
          <li class="gate gate-${gate.status}">
            <span class="gate-icon" aria-hidden="true">${gateIcon(gate.status)}</span>
            <span>${gate.detail}</span>
          </li>
        `,
      )
      .join('');
    $('#sim-labels').innerHTML = result.labels.map((label) => chip(label)).join('');
  }

  function syncSimulator() {
    syncVisibility();
    syncChoiceClasses();
    renderOutcome(formState());
  }

  function setRadio(name, value) {
    const input = form.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  }

  function applyPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;
    setRadio('change', preset.change);
    setRadio('risk', preset.risk);
    setRadio('explore', preset.explore);
    setRadio('phase', preset.phase);
    setRadio('approval', preset.approval);
    form.elements.override.checked = preset.override;
    form.elements.block.checked = preset.block;
    syncSimulator();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('#sim-form').scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function wireSimulator() {
    form.addEventListener('change', syncSimulator);
    $('#sim-reset').addEventListener('click', () => {
      form.reset();
      syncSimulator();
    });
    $$('[data-preset]').forEach((button) => {
      button.addEventListener('click', () => applyPreset(button.dataset.preset));
    });
  }

  function wireTheme() {
    const toggle = $('#theme-toggle');
    const applyTheme = (theme) => {
      document.documentElement.dataset.theme = theme;
      toggle.setAttribute('aria-pressed', String(theme === 'dark'));
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    };

    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    toggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem('agent-sdlc-theme', next);
      } catch {
        void 0;
      }
    });
  }

  function wireScrollSpy() {
    const links = $$('.nav a');
    const sections = links
      .map((link) => $(link.getAttribute('href')))
      .filter(Boolean);

    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        links.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${visible.target.id}`);
        });
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.2, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));
  }

  const form = $('#sim-form');

  renderPipeline();
  wirePipeline();
  renderStage(stageFromHash() || STAGES[0].id, { updateHash: false });
  wireSimulator();
  syncSimulator();
  wireTheme();
  wireScrollSpy();
})();
