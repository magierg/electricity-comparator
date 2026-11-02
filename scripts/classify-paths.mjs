const RULES = [
  {
    category: 'tests',
    matches: (path) =>
      /(^|\/)__tests__\//.test(path) ||
      /\.(test|spec)\.(ts|tsx|js|mjs)$/.test(path) ||
      /^e2e\//.test(path) ||
      /^tests\//.test(path) ||
      /^playwright\.config\.ts$/.test(path) ||
      /^e2e\.config\.ts$/.test(path) ||
      /^jest\.(config\.cjs|setup\.ts)$/.test(path),
  },
  {
    category: 'data',
    matches: (path) =>
      /^src\/data\//.test(path) ||
      /^data\//.test(path) ||
      /^scripts\/build-plans\.mjs$/.test(path),
  },
  {
    category: 'docs',
    matches: (path) => /\.md$/i.test(path) || /^docs\//.test(path),
  },
  {
    category: 'deps',
    matches: (path) => /^package(-lock)?\.json$/.test(path),
  },
  {
    category: 'security',
    matches: (path) =>
      /^\.github\//.test(path) ||
      /^scripts\//.test(path) ||
      /^opencode\.json$/.test(path) ||
      /^\.opencode\//.test(path),
  },
  {
    category: 'ci',
    matches: (path) =>
      /^vite\.config\.ts$/.test(path) ||
      /^tsconfig.*\.json$/.test(path) ||
      /^eslint\.config\.js$/.test(path) ||
      /^postcss\.config\.js$/.test(path) ||
      /^tailwind\.config\.js$/.test(path) ||
      /^\.nvmrc$/.test(path) ||
      /^\.husky/.test(path),
  },
  {
    category: 'calculation',
    matches: (path) =>
      /^src\/lib\/(calculator|plans|usage)\.ts$/.test(path) ||
      /^src\/constants\.ts$/.test(path) ||
      /^src\/types\.ts$/.test(path),
  },
  {
    category: 'logic',
    matches: (path) => /^src\/lib\//.test(path) || /^scripts\//.test(path),
  },
  {
    category: 'ui',
    matches: (path) =>
      /^src\//.test(path) ||
      /^index\.html$/.test(path) ||
      /^public\//.test(path),
  },
];

const SENSITIVE_PATTERNS = [
  /^\.github\//,
  /^package(-lock)?\.json$/,
  /^scripts\//,
  /^src\/data\//,
  /^data\//,
  /^src\/lib\/(calculator|plans|usage|parseMeterCsv)\.ts$/,
  /^src\/constants\.ts$/,
  /^src\/types\.ts$/,
  /^vite\.config\.ts$/,
  /^playwright\.config\.ts$/,
  /^e2e\.config\.ts$/,
  /^jest\.(config\.cjs|setup\.ts)$/,
  /^tsconfig.*\.json$/,
  /^eslint\.config\.js$/,
  /^opencode\.json$/,
  /^AGENTS\.md$/,
  /^\.opencode\//,
];

const AUTO_MERGE_CATEGORIES = new Set(['docs', 'tests']);

function normalizePath(value) {
  return String(value).replaceAll('\\', '/').replace(/^\.\//, '');
}

function categorize(path) {
  const rule = RULES.find((candidate) => candidate.matches(path));
  return rule?.category ?? 'unknown';
}

function isSensitive(path) {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(path));
}

export function classifyPaths(files) {
  const categories = new Set();
  const sensitivePaths = new Set();

  for (const file of files) {
    const path = normalizePath(file?.filename ?? file?.path ?? file);
    categories.add(categorize(path));
    if (isSensitive(path)) sensitivePaths.add(path);
  }

  return {
    categories: [...categories].sort(),
    sensitivePaths: [...sensitivePaths].sort(),
  };
}

export function isAutoMergeCategory(categories) {
  return (
    Array.isArray(categories) &&
    categories.length > 0 &&
    categories.every((category) => AUTO_MERGE_CATEGORIES.has(category))
  );
}
