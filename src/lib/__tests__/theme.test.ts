import {
  applyTheme,
  clearStoredTheme,
  getInitialTheme,
  getStoredTheme,
  getSystemTheme,
  persistTheme,
  subscribeToSystemTheme,
  THEME_STORAGE_KEY,
} from '../theme';

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

function removeMatchMedia() {
  Reflect.deleteProperty(window, 'matchMedia');
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
  removeMatchMedia();
});

afterEach(() => {
  jest.restoreAllMocks();
  window.localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
  removeMatchMedia();
});

describe('getSystemTheme', () => {
  it('falls back to light when matchMedia is unavailable', () => {
    expect(getSystemTheme()).toBe('light');
  });

  it('returns dark when the system prefers dark', () => {
    mockMatchMedia(true);
    expect(getSystemTheme()).toBe('dark');
  });

  it('returns light when the system prefers light', () => {
    mockMatchMedia(false);
    expect(getSystemTheme()).toBe('light');
  });
});

describe('getStoredTheme', () => {
  it('returns a valid stored theme', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(getStoredTheme()).toBe('dark');

    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(getStoredTheme()).toBe('light');
  });

  it('ignores an invalid stored value', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    expect(getStoredTheme()).toBeNull();
  });

  it('returns null when storage access throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    expect(getStoredTheme()).toBeNull();
  });
});

describe('getInitialTheme', () => {
  it('prefers the stored theme over the system theme', () => {
    mockMatchMedia(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(getInitialTheme()).toBe('light');
  });

  it('uses the system theme when nothing is stored', () => {
    mockMatchMedia(true);
    expect(getInitialTheme()).toBe('dark');
  });
});

describe('applyTheme', () => {
  it('adds the dark class and dark color scheme', () => {
    applyTheme('dark');

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.documentElement.style.backgroundColor).toBe('rgb(2, 6, 23)');
  });

  it('removes the dark class and restores the light color scheme', () => {
    applyTheme('dark');
    applyTheme('light');

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(document.documentElement.style.backgroundColor).toBe('rgb(248, 250, 252)');
  });
});

describe('persistTheme and clearStoredTheme', () => {
  it('persists and clears the manual choice', () => {
    persistTheme('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    clearStoredTheme();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('swallows storage write and remove failures', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    expect(() => persistTheme('dark')).not.toThrow();
    expect(() => clearStoredTheme()).not.toThrow();
  });
});

describe('subscribeToSystemTheme', () => {
  it('does nothing when matchMedia is unavailable', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeToSystemTheme(callback);

    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });

  it('notifies the callback and unsubscribes from system changes', () => {
    const { addEventListener, removeEventListener } = mockMatchMedia(false);
    const callback = jest.fn();
    const unsubscribe = subscribeToSystemTheme(callback);

    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    const listener = addEventListener.mock.calls[0][1] as (event: {
      matches: boolean;
    }) => void;
    listener({ matches: true });
    listener({ matches: false });

    expect(callback).toHaveBeenNthCalledWith(1, 'dark');
    expect(callback).toHaveBeenNthCalledWith(2, 'light');

    unsubscribe();
    expect(removeEventListener).toHaveBeenCalledWith('change', listener);
  });
});
