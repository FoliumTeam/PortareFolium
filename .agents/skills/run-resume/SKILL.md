---
name: run-resume
description: Read and validate a durable Hive run through the signed Hive CLI and prepare bounded manual recovery or one-role usage-guarded automatic dispatch data. Automatic mode may update only Hive-owned, Git-ignored `.hive/runtime/` usage history and authorization claims. Use when resuming a specific `.hive/runs/RUN_ID/` after compaction, handoff, or a new session; do not use for simple questions, plan creation, runtime spawning, or persistent execution loops.
---

# Hive Run Resume

Recover provider-neutral state only. This Skill never starts work or launches the pinned owner. It preserves host-native v0.9 owners, explicitly selected external compatibility owners, and legacy 0.8.x OMX/OMC owners without migration.

## Workflow

1. Run `hive run resume --help`. If unavailable, report the installed release as unsupported. Do not reconstruct resume behavior manually.
2. Obtain a fresh normalized capability-resolution JSON from the active host adapter. Do not inspect `.omx/`, `.omc/`, plugin caches, session state, or host-global configuration.
3. Choose one explicit dispatch intent:
    - Manual recovery is the default and does not claim usage enforcement.
    - Automatic continuation requires the configured account digest and exactly one active role.
      The CLI reads the installed `.hive/config/harness.toml` threshold. Omit `--threshold`, or
      pass only the identical configured value; a caller cannot lower or replace it. Never pass
      or expose a raw account identity.
4. Run exactly one bounded read.

    Manual:

    ```text
    hive run resume --target <project-root> --run <run-id> --capabilities <fresh-capability-resolution.json> --dispatch-intent manual --output json
    ```

    Automatic:

    ```text
    hive run resume --target <project-root> --run <run-id> --capabilities <fresh-capability-resolution.json> --dispatch-intent automatic --account-digest <sha256:...> --role <active-role-id> [--threshold <installed-identical-value>] --output json
    ```

5. Require a schema-valid result bound to the exact PLAN, STATUS revision, active role documents, shared role handoff entries, evidence bytes, immutable owner evidence, and requested dispatch intent.
6. Handle the result without hidden transitions:
    - For manual `executing` or `verifying`, return prepare-only briefs as unenforced manual recovery data. Do not describe them as usage-authorized.
    - For automatic `executing` or `verifying`, return briefs only when
      `data.usage_guard.enforced=true` and `outcome=authorized`. Require the sanitized
      evidence digest, selected session/weekly window, exact role, and authorization ID.
      Exactly one brief may accompany one authorization.
    - Treat `history=absent` as a truthful first sample with no monotonic comparison. A later
      sample must use the Hive-owned history. Missing, malformed, symlinked, or integrity-invalid
      config/history is fail-closed.
    - Treat `outcome=already_issued` as a replay/retry refusal with zero briefs. Do not dispatch
      from it or from a previously captured result.
    - If the account digest or trustworthy fresh sensor evidence is absent, or the result is
      `hive.usage-unknown` or `hive.usage-limited`, return recovery data with zero briefs and
      do not dispatch.
    - For `unsupported` or `unverified`, stop on exit code `4`; no dispatch brief is authorized.
    - For `blocked` or `usage-limited`, return recovery data and the resume condition without dispatch.
    - For `resume-ready`, return recovery data only. A later explicit host-owned action may transition the run.
    - For terminal states, report the durable result without continuing.
7. State the pinned owner, revision, next action, blocker or resume note, active roles, dispatch intent, usage outcome, and verified evidence locators.

## Boundaries

- Keep the simple-question path isolated; do not load this Skill for self-contained quick-answers.
- Never write STATUS.md, PLAN.md, role files, handoffs, evidence, configuration, or foreign
  runtime bytes. Automatic mode may atomically write only bounded, sanitized
  `.hive/runtime/usage-history/*.json` and `.hive/runtime/dispatch-authorizations/*.json`;
  manual mode writes nothing.
- Never create a plan, Ralph loop, team workflow, retry loop, subagent, model call, provider API request, or runtime process.
- Never perform automatic continuation from manual output or from automatic output lacking an authorized usage guard.
- Never select, replace, install, configure, or invoke OMX/OMC.
- Never fall back to another owner when current capability evidence is missing, incompatible, unknown, or changed.
