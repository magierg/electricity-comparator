---
name: no-comments
description: Remove narration, banners, commented-out code, and workaround justifications before review.
---

# No comments

Keep comments only for a non-obvious constraint imposed by something outside the
code: a platform, protocol, vendor, data source, or public API contract. Prefer
names, types, structure, and tests for everything the repository controls.

Delete:

- narration of what the next line does;
- banners and section markers;
- commented-out code;
- “temporary”, “fine for now”, “do not remove” justifications;
- lint or type suppressions that hide a real problem.

Review the scoped diff. For each remaining comment, state the external constraint
it documents. If you cannot, delete it or reshape the code so the behavior is
obvious.

Report only the files touched and the comments deleted or kept with a reason.
