export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'electricity-theme';

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

const BASE_BACKGROUNDS: Record<Theme, string> = {
  light: '#f8fafc',
  dark: '#020617',
};

function supportsMatchMedia(): boolean {
  return typeof window.matchMedia === 'function';
}

export function getSystemTheme(): Theme {
  if (!supportsMatchMedia()) return 'light';
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light';
}

export function getStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

export function getInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  root.style.backgroundColor = BASE_BACKGROUNDS[theme];
}

export function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    void 0;
  }
}

export function clearStoredTheme(): void {
  try {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    void 0;
  }
}

export function subscribeToSystemTheme(
  callback: (theme: Theme) => void,
): () => void {
  if (!supportsMatchMedia()) return () => {};
  const media = window.matchMedia(DARK_MEDIA_QUERY);
  const listener = (event: MediaQueryListEvent) => {
    callback(event.matches ? 'dark' : 'light');
  };
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
