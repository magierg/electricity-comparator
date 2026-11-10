import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  getInitialTheme,
  getStoredTheme,
  persistTheme,
  subscribeToSystemTheme,
  type Theme,
} from './theme';

export interface ThemeController {
  theme: Theme;
  preference: Theme | null;
  selectTheme: (theme: Theme) => void;
}

export function useTheme(): ThemeController {
  const [preference, setPreference] = useState<Theme | null>(() => getStoredTheme());
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (preference !== null) return;
    return subscribeToSystemTheme(setTheme);
  }, [preference]);

  useEffect(() => {
    const handleBeforePrint = () => {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      document.documentElement.style.backgroundColor = '#ffffff';
    };
    const handleAfterPrint = () => {
      applyTheme(theme);
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [theme]);

  const selectTheme = useCallback((nextTheme: Theme) => {
    setPreference(nextTheme);
    setTheme(nextTheme);
    persistTheme(nextTheme);
  }, []);

  return { theme, preference, selectTheme };
}
