---
name: code-polish
description: Clean requested AI-generated code or UI slop with a regression-first, behavior-preserving, changed-files-only workflow. Use only when the user explicitly requests cleanup, de-slopping, or simplification.
---

# AI Slop Cleaner

Reduce accidental complexity without changing observable behavior.

## Workflow

1. Define an exact changed-file allowlist from the user's scope and current diff. Preserve
   unrelated dirty files and user-authored intent. Do not expand into a repository-wide cleanup.
2. Run the nearest regression baseline before editing. Classify it as `runnable`, `unavailable`,
   `pre-existing-failure`, or `out-of-scope-expensive`. For any non-runnable baseline, record the
   smallest truthful fallback: focused test, compile or type check, lint, snapshot, or bounded
   behavior probe. No evidence means no cleanup edit.
3. Inventory concrete smells and make one bounded pass per class:
    - redundant narration, comments, or dead branches;
    - needless wrappers, indirection, configuration, or defensive duplication;
    - inconsistent naming, error handling, or local style;
    - UI inconsistency that preserves accessibility, responsive states, and interaction behavior.
4. After each pass, inspect only that pass's diff and run its nearest quality gate. Stop on a
   regression, widened public contract, new dependency, unrelated formatting churn, or unclear
   behavioral effect.
5. Finish with all affected regression checks, formatter or diff checks, and a changed-file audit.
   Report removed smells, preserved behavior, evidence, and any skipped class with its reason.

## Boundaries

- Prefer deletion and existing project conventions over a new abstraction.
- Keep public interfaces, data formats, timing-sensitive behavior, accessibility, and snapshots
  unchanged unless the user separately authorizes a behavior change.
- Never rewrite generated, vendored, licensed, secret-bearing, or out-of-scope files.
- Do not hide a failing baseline or claim improvement without fresh regression evidence.
