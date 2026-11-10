import { test, expect, type Locator } from '@playwright/test';

const THEME_STORAGE_KEY = 'electricity-theme';

async function contrastRatio(locator: Locator): Promise<number> {
  return locator.evaluate((element) => {
    type Rgba = { r: number; g: number; b: number; a: number };

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');

    const parse = (value: string): Rgba | null => {
      if (!context || value.trim() === '') return null;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = '#ffffff';
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
      if (a === undefined) return null;
      return { r, g, b, a: a / 255 };
    };

    const blend = (top: Rgba, bottom: Rgba): Rgba => ({
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a),
      a: 1,
    });

    const luminance = (color: Rgba) => {
      const channel = (value: number) => {
        const normalized = value / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : Math.pow((normalized + 0.055) / 1.055, 2.4);
      };
      return (
        0.2126 * channel(color.r) +
        0.7152 * channel(color.g) +
        0.0722 * channel(color.b)
      );
    };

    const background = (node: Element): Rgba => {
      const layers: Rgba[] = [];
      let current: Element | null = node;
      while (current) {
        const color = parse(getComputedStyle(current).backgroundColor);
        if (color && color.a > 0) {
          layers.push(color);
          if (color.a === 1) break;
        }
        current = current.parentElement;
      }

      let result: Rgba = { r: 255, g: 255, b: 255, a: 1 };
      for (let index = layers.length - 1; index >= 0; index -= 1) {
        result = blend(layers[index], result);
      }
      return result;
    };

    const foreground = parse(getComputedStyle(element).color);
    if (!foreground) throw new Error('Could not read text colour');
    const backgroundColour = background(element);
    const lighter = Math.max(luminance(foreground), luminance(backgroundColour));
    const darker = Math.min(luminance(foreground), luminance(backgroundColour));
    return (lighter + 0.05) / (darker + 0.05);
  });
}

function parseHex(hex: string) {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((part) => `${part}${part}`)
          .join('')
      : value;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function hexContrast(first: string, second: string) {
  const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
    const channel = (value: number) => {
      const normalized = value / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const firstLuminance = luminance(parseHex(first));
  const secondLuminance = luminance(parseHex(second));
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe('Theme', () => {
  test('follows the system dark preference on a first visit', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByRole('button', { name: /^dark$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: /^light$/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('follows the system light preference on a first visit', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(page.getByRole('button', { name: /^light$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('persists a manual choice across reloads despite the system preference', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    await page.getByRole('button', { name: /^dark$/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY))
      .toBe('dark');

    await page.reload();

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByRole('button', { name: /^dark$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('persists switching back to light', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.getByRole('button', { name: /^light$/i }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY))
      .toBe('light');

    await page.reload();

    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('applies the stored theme before React paints', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.evaluate((key) => localStorage.setItem(key, 'dark'), THEME_STORAGE_KEY);

    await page.reload({ waitUntil: 'domcontentloaded' });

    const isDark = await page
      .locator('html')
      .evaluate((element) => element.classList.contains('dark'));
    expect(isDark).toBe(true);
  });

  test.describe('layout', () => {
    for (const width of [320, 390]) {
      for (const scheme of ['light', 'dark'] as const) {
        test(`has no horizontal overflow at ${width}px in ${scheme} theme`, async ({
          page,
        }) => {
          const pageErrors: string[] = [];
          page.on('pageerror', (error) => pageErrors.push(error.message));

          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: scheme });
          await page.goto('/');
          await expect(page.getByText(/sample data loaded/i)).toBeVisible();

          const overflow = await page.evaluate(() => {
            const root = document.documentElement;
            return root.scrollWidth - root.clientWidth;
          });

          expect(overflow).toBeLessThanOrEqual(0);
          expect(pageErrors).toEqual([]);
        });
      }
    }
  });

  test.describe('contrast', () => {
    for (const scheme of ['light', 'dark'] as const) {
      test(`meets WCAG contrast in the ${scheme} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto('/');
        await expect(page.getByText(/sample data loaded/i)).toBeVisible();

        const checks = [
          {
            name: 'heading',
            locator: page.getByRole('heading', {
              name: /wellington electricity plan comparison/i,
            }),
          },
          {
            name: 'body copy',
            locator: page.getByText(/compare real wellington plans/i),
          },
          {
            name: 'muted footer',
            locator: page.getByText(/estimates are a guide/i),
          },
          {
            name: 'badge',
            locator: page.getByText('Wellington', { exact: true }).first(),
          },
          {
            name: 'theme control',
            locator: page.getByRole('button', { name: /^dark$/i }),
          },
          {
            name: 'primary button',
            locator: page.getByRole('button', { name: /this is my plan/i }).first(),
          },
        ];

        for (const check of checks) {
          const ratio = await contrastRatio(check.locator);
          expect(ratio, `${check.name} contrast in ${scheme} theme`).toBeGreaterThanOrEqual(
            4.5,
          );
        }

        const focus = await page.evaluate(() => {
          const styles = getComputedStyle(document.documentElement);
          return {
            ring: styles.getPropertyValue('--focus-ring').trim(),
            background: styles.getPropertyValue('--app-bg').trim(),
          };
        });

        expect(focus.ring).not.toBe('');
        expect(hexContrast(focus.ring, focus.background)).toBeGreaterThanOrEqual(3);
      });
    }
  });

  test('uses readable light colours when printing', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await page.emulateMedia({ media: 'print' });

    const printState = await page.evaluate(() => ({
      hasDark: document.documentElement.classList.contains('dark'),
      htmlBackground: getComputedStyle(document.documentElement).backgroundColor,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      toggleDisplay: getComputedStyle(document.querySelector('.theme-toggle')!).display,
    }));

    expect(printState.hasDark).toBe(false);
    expect(printState.htmlBackground).toBe('rgb(255, 255, 255)');
    expect(printState.bodyBackground).toBe('rgb(255, 255, 255)');
    expect(printState.toggleDisplay).toBe('none');

    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  });

  test('respects prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const durations = await page
      .getByRole('button', { name: /^dark$/i })
      .evaluate((element) =>
        getComputedStyle(element)
          .transitionDuration.split(',')
          .map((value) => Number.parseFloat(value)),
      );

    for (const duration of durations) {
      expect(duration).toBeLessThanOrEqual(0.01);
    }
  });
});
