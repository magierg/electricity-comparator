---
name: blast-radius
description: Find what a change could break outside the diff and prove the key safety fact by running code.
---

# Blast radius

A write-up that sounds right is not evidence. Find the one or two facts the
change's safety depends on and prove them.

## Steps

1. Read the diff, the symbols it changes, and the behavior that is not obvious
   from the diff.
2. Find the single fact that makes the change safe. If it holds, most scary
   cases die at once.
3. Look where grep stops: library source, pinned versions, data formats, timers,
   React lifecycle, storage, and downstream consumers.
4. State each real risk with likelihood, impact, and a way to check it. Keep
   checked-and-cleared cases separate.
5. Prove the key fact with a script or test that runs the real code. If you
   cannot prove it cheaply, mark it unproven. Do not round up.

## Output

- **What changed**
- **The safety fact** — proven or unproven, with the command/output
- **Risks** — real ones only
- **Cleared** — what you checked and why it is fine
- **Before merge** — the cheapest test or repro that catches the real bug
