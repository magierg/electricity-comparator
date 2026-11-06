import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const pipelineConfig = JSON.parse(
  readFileSync(new URL('../opencode.pipeline.json', import.meta.url), 'utf8'),
) as {
  agent: Record<string, { steps: number }>;
};

test.describe('Agentic SDLC guide', () => {
  test('renders the pipeline and opens stage details', async ({ page }) => {
    await page.goto('/agent-sdlc/index.html');

    await expect(
      page.getByRole('heading', { level: 1, name: /agents do the work/i }),
    ).toBeVisible();
    await expect(page.getByRole('tablist', { name: /checkpoints/i })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(8);

    await page.getByRole('tab', { name: /implement/i }).click();

    await expect(page.getByRole('tab', { name: /implement/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('tabpanel')).toContainText('/oc implement');
    await expect(page.getByRole('tabpanel')).toContainText('60 steps');
    await expect(page).toHaveURL(/#stage-implement$/);
  });

  test('includes the issue, PR, and check playbook', async ({ page }) => {
    await page.goto('/agent-sdlc/index.html');

    await expect(
      page.getByRole('heading', { name: 'Work the issue. Then work the checks.' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Playbook' })).toHaveAttribute(
      'href',
      '#playbook',
    );

    const checkTable = page.locator('.check-table');
    await expect(checkTable).toContainText('ci-success');
    await expect(checkTable).toContainText('exploratory');
    await expect(page.locator('.code-panel').first()).toContainText('npm run lint:ci');
    await expect(
      page.getByRole('heading', { name: 'Unrelated exploratory finding?' }),
    ).toBeVisible();
  });

  test('supports keyboard navigation between stages', async ({ page }) => {
    await page.goto('/agent-sdlc/index.html');

    const intake = page.getByRole('tab', { name: /intake/i });
    await intake.focus();
    await page.keyboard.press('ArrowRight');

    await expect(page.getByRole('tab', { name: /plan/i })).toBeFocused();
    await expect(page.getByRole('tab', { name: /plan/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('tabpanel')).toContainText('/oc plan');
  });

  test('opens a deep-linked stage', async ({ page }) => {
    await page.goto('/agent-sdlc/index.html#stage-classify');

    await expect(page.getByRole('tab', { name: /classify/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('tabpanel')).toContainText('Jev');
    await expect(page.getByRole('tabpanel')).toContainText('pull_request_target');
  });

  test('models the auto-merge policy', async ({ page }) => {
    await page.goto('/agent-sdlc/index.html');

    const outcome = page.locator('.sim-outcome');
    const changeGroup = page.getByRole('group', { name: 'What changed?' });
    const riskGroup = page.getByRole('group', { name: 'Jev risk verdict' });
    const phaseGroup = page.getByRole('group', { name: 'Merge phase' });

    await expect(outcome).toHaveAttribute('data-outcome', 'auto');
    await expect(page.getByRole('heading', { name: 'Auto-merge enabled' })).toBeVisible();

    await changeGroup.getByRole('radio', { name: /^UI or behavior/ }).check();
    await expect(outcome).toHaveAttribute('data-outcome', 'manual');
    await expect(page.getByRole('heading', { name: 'Manual merge only' })).toBeVisible();
    await expect(outcome).toContainText('UI changes are deliberately outside the auto-merge path');

    await page
      .getByRole('group', { name: 'Human approval' })
      .getByRole('radio', { name: 'Waiting', exact: true })
      .check();
    await expect(outcome).toHaveAttribute('data-outcome', 'manual');
    await expect(outcome).toContainText('Phase 1 approval is still required for the manual merge');

    await changeGroup.getByRole('radio', { name: /^Sensitive path/ }).check();
    await expect(outcome).toHaveAttribute('data-outcome', 'manual');

    await changeGroup.getByRole('radio', { name: /^Docs only/ }).check();
    await riskGroup.getByRole('radio', { name: 'Medium', exact: true }).check();
    await expect(outcome).toHaveAttribute('data-outcome', 'blocked');

    await page.getByRole('checkbox', { name: /risk:accepted/i }).check();
    await expect(outcome).toHaveAttribute('data-outcome', 'manual');
    await expect(outcome).toContainText('risk:accepted');

    await riskGroup.getByRole('radio', { name: 'Low', exact: true }).check();
    await phaseGroup.getByRole('radio', { name: 'Phase 2', exact: true }).check();
    await expect(page.getByRole('radio', { name: 'Approved', exact: true })).toBeHidden();
    await expect(outcome).toHaveAttribute('data-outcome', 'auto');

    await page.getByRole('checkbox', { name: /do-not-merge/i }).check();
    await expect(outcome).toHaveAttribute('data-outcome', 'blocked');

    await page.getByRole('checkbox', { name: /do-not-merge/i }).uncheck();
    await phaseGroup.getByRole('radio', { name: 'Phase 1', exact: true }).check();
    await page
      .getByRole('group', { name: 'Human approval' })
      .getByRole('radio', { name: 'Waiting', exact: true })
      .check();
    await expect(outcome).toHaveAttribute('data-outcome', 'hold');
  });

  test('keeps agent step limits in sync with the pipeline config', async ({ page }) => {
    await page.goto('/agent-sdlc/index.html');

    for (const [name, agent] of Object.entries(pipelineConfig.agent)) {
      const card = page.locator(`[data-agent="${name}"]`);
      await expect(card).toBeVisible();
      await expect(card.locator('.steps-value')).toHaveText(`${agent.steps} steps`);
    }
  });

  test('has no horizontal overflow on mobile and no page errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/agent-sdlc/index.html');

    await expect(
      page.getByRole('heading', { name: 'One change, eight checkpoints' }),
    ).toBeVisible();
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasOverflow).toBe(false);
    expect(pageErrors).toEqual([]);
  });

  test('offers a runbook fallback without JavaScript', async ({ browser }) => {
    const baseURL = test.info().project.use.baseURL as string;
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto(`${baseURL}/agent-sdlc/index.html`);
    await expect(
      page.getByText(/interactive pipeline and merge simulator need JavaScript/i),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /agent runbook/i })).toBeVisible();

    await context.close();
  });

  test('toggles the theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/agent-sdlc/index.html');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: /switch to dark theme/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: /switch to light theme/i })).toBeVisible();
  });
});
