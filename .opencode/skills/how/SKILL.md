---
name: how
description: Explain how a code path works before changing it. Use for understanding data flow, ownership, and architecture.
---

# How

Read the code, not just the diff.

1. Name the entry point and the user-visible behavior.
2. Follow the data: input → transformation → state → output.
3. Name the functions, types, and files on the path.
4. Find the tests that exercise the path.
5. State what is not on the path when that boundary matters.
6. Cite real `file:line` locations. Do not invent callers or behavior.

Hand back a short map, not a file dump:

- **Entry point**
- **Data flow**
- **State and side effects**
- **Tests**
- **Boundaries**
