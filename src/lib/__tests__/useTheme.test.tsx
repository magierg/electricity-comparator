import { act, renderHook } from '@testing-library/react';
import { useTheme } from '../useTheme';
import { THEME_STORAGE_KEY } from '../theme';

interface MatchMediaMock {
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
}

function mockMatchMedia(matches: boolean): MatchMediaMock {
  const addEventListener = jest.fn();
  const removeEventListener = jest.fn();
  const media = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener,
    removeEventListener,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn().mockReturnValue(media),
  });

  return { addEventListener, removeEventListener };
}

function emitSystemChange(mock: MatchMediaMock, matches: boolean) {
  const listener = mock.addEventListener.mock.calls[0][1] as (event: {
    matches: boolean;
  }) => void;
  act(() => listener({ matches }));
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
});

afterEach(() => {
  jest.restoreAllMocks();
  window.localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
  Reflect.deleteProperty(window, 'matchMedia');
});

describe('useTheme', () => {
  it('follows system changes until the user chooses a theme', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
    expect(result.current.preference).toBeNull();

    emitSystemChange(media, true);

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('persists a manual choice and ignores later system changes', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    act(() => result.current.selectTheme('dark'));

    expect(result.current.theme).toBe('dark');
    expect(result.current.preference).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(media.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );

    expect(result.current.theme).toBe('dark');
  });

  it('starts from a stored preference', () => {
    mockMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
    expect(result.current.preference).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('restores the theme after printing', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    act(() => result.current.selectTheme('dark'));

    act(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.backgroundColor).toBe('rgb(255, 255, 255)');

    act(() => {
      window.dispatchEvent(new Event('afterprint'));
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
