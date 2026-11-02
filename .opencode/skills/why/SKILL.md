---
name: why
description: Explain why code is shaped this way using history, comments, issues, and external constraints. Use for regressions or surprising behavior.
---

# Why

1. Read the relevant code and its tests.
2. Use `git log`, `git blame`, and `git show` to find the change that introduced
   the behavior.
3. Separate evidence from speculation. Cite the commit or file:line.
4. Name the external constraint if one exists: a data source, a platform rule, a
   protocol, a vendor limitation, or a documented assumption.
5. If the history is missing, say so instead of inventing a rationale.

Hand back:

- **Current behavior**
- **Why it exists**
- **Evidence**
- **What would break if it changed**
- **Unknowns**
