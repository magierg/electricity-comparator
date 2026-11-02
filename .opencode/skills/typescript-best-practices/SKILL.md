---
name: typescript-best-practices
description: Type-safe, idiomatic TypeScript for this React and Vite repository.
---

# TypeScript best practices

- Keep `strict` clean. Do not add `any`, `@ts-ignore`, or non-null assertions to
  silence a real uncertainty.
- Model the domain with discriminated unions and narrow types. Make invalid
  states hard to represent.
- Validate external input once at the boundary, then work with typed values.
- Prefer `type` imports for types (`verbatimModuleSyntax` is enabled).
- Keep functions small and pure where possible. Put money calculations in
  `src/lib` and test them directly.
- Use `Number.isFinite` and explicit guards for parsed numeric input.
- Do not use `enum`; this project uses erasable syntax only.
- Avoid `useEffect` for derived state. Derive during render or use a reducer.
- Keep React components typed with explicit props; avoid `React.FC`.
- Use accessible roles, labels, and text in components and tests.
- Prefer existing formatting and date/number helpers over new dependencies.
- Run `npm run typecheck` and `npm run lint:ci` after changes.
