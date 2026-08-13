---
name: run-handoff
description: Record an explicitly requested persistent-role assignment and role-specific shared handoff entry through the signed Hive CLI. Use when the user or active run explicitly asks to assign a role to one existing run or save its bounded handoff; do not use for implicit orchestration, ordinary status updates, automatic delegation, or direct role-file editing.
---

# Hive Role Handoff

Perform one explicit optimistic two-file mutation. Leave orchestration and dispatch to the run's pinned owner: host-native by default for new v0.9 runs, explicitly selected external compatibility when requested, or the preserved owner of an existing 0.8.x run.

## Workflow

1. Confirm explicit intent to mutate the named role and existing run. If intent is only to inspect or validate a role, use `hive role validate` and stop.
2. Run `hive role handoff --help`. If unavailable, report the installed release as unsupported. Do not edit the role or handoff directly.
3. Read the exact `.hive/team/roles/<role-id>.md`, `.hive/runs/<run-id>/PLAN.md`, and `.hive/runs/<run-id>/HANDOFF.md` if present.
4. Prepare a bounded JSON request matching `schemas/role-handoff-request.schema.json`.
    - Bind `expected_current_assignment` and `expected_handoff_path` to the exact observed role frontmatter values, including explicit `null`.
    - Bind `expected_handoff_digest` to the exact observed shared handoff bytes, or explicit `null` when the file is absent.
    - Set `handoff_markdown` to the bounded role-specific handoff text and `updated_at` to an RFC 3339 timestamp.
    - Preserve the role Markdown body and every unrelated shared handoff entry.
5. Run:

    ```text
    hive role handoff --target <project-root> --request <request.json> --output json
    ```

6. Accept only a schema-valid success result. An identical retry is a no-op. On stale assignment, path, digest, target, or concurrent publication, stop and reread before any new explicit attempt.
7. Report the exact role path, shared handoff path, resulting digest, and whether either file changed.

## Boundaries

- Never assign a role implicitly or infer mutation consent from an ordinary work request.
- Never write role frontmatter, role Markdown bodies, or `HANDOFF.md` directly.
- Never create a plan, Ralph loop, team workflow, retry loop, subagent, model call, provider API request, runtime process, or automatic continuation.
- Never select, replace, install, configure, invoke, or inspect private state for OMX/OMC.
- Never modify another role's shared handoff entry, foreign runtime state, or non-Hive-owned files.
