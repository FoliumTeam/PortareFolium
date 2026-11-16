---
name: run-resume
description: (run-resume) Load and validate an existing Hive run when resuming after interruption, handoff, or a new session.
---

# Hive Run Resume

Recover provider-neutral state only. The host owns execution after recovery. When the user has
already requested continuation, return validated recovery data to that authorized workflow in
the same task; finishing this Skill is not permission to end the user's unfinished task.
Preserve existing owner pins, including legacy 0.8.x external owners, without migration.

## Workflow

1. Run `hive run resume --help`. If unavailable, report the installed release as unsupported. Do not reconstruct resume behavior manually.
2. Obtain a fresh normalized capability-resolution JSON from the active host adapter. Do not inspect `.omx/`, `.omc/`, plugin caches, session state, or host-global configuration.
3. Choose one explicit dispatch intent:
   - Manual recovery is the default and does not claim usage enforcement.
   - Automatic continuation requires the exact current host session ID, positive process ID,
     and one active role. Obtain the binding from the host; never invent or transfer it.
     Supply the user root so the CLI applies the shared global/project policy. Supply an
     exposed account digest, or omit it only for one unambiguous sensed account. Omit
     `--threshold`, or pass the identical effective value; never expose a raw account identity.
4. Run exactly one recovery command. Automatic mode performs the shared usage preflight itself;
   do not precede it with a second `usage enforce` sample for the same dispatch.

   Manual:

   ```text
   hive run resume --target <project-root> --run <run-id> --capabilities <fresh-capability-resolution.json> --dispatch-intent manual --output json
   ```

   Automatic:

   ```text
   hive run resume --target <project-root> --run <run-id> --capabilities <fresh-capability-resolution.json> --dispatch-intent automatic --session-id <current-session-id> --process-id <current-process-id> --user-root <user-root> [--account-digest <sha256:...>] --role <active-role-id> [--threshold <installed-identical-value>] --output json
   ```

5. Require a schema-valid result bound to the exact PLAN, STATUS revision, active role documents, shared role handoff entries, evidence bytes, immutable owner evidence, and requested dispatch intent.
6. Handle the result without hidden transitions:
   - For manual `executing` or `verifying`, return prepare-only briefs as unenforced manual recovery data. Do not describe them as usage-authorized.
   - For automatic `executing` or `verifying`, return briefs only when
     `data.usage_guard.policy_evaluated=true` and a current authorization ID accompany exactly
     one brief for the exact role. Require the sanitized evidence or policy-binding digest.
     `enforced=true` and `outcome=authorized` mean an observation was used; require its selected
     window. `outcome=disabled`, `enforced=false`, `observation_required=false` mean the CLI
     evaluated disabled checks. `enforcement_enabled=false` identifies the v2 master opt-out.
     A successful v2 warning policy may return `outcome=observation-unavailable` without an
     observation. Do not enable protection or invent a window to make these valid results fit.
   - Treat `history=absent` as a truthful first sample with no monotonic comparison. A later
     sample must use the Hive-owned history. Missing, malformed, symlinked, or integrity-invalid
     config/history required by the selected policy is fail-closed. A v2 master opt-out does not
     read obsolete halt/control/observation records, but configuration and dispatch integrity
     checks remain required.
   - Treat `outcome=already_issued` as a replay/retry refusal with zero briefs. Do not dispatch
     from it or from a previously captured result.
   - When the selected policy requires a valid observation, absent account identity or fresh
     evidence prevents dispatch. Any `hive.usage-unknown`, `hive.usage-limited`,
     `hive.usage-quota-exhausted`, or `hive.usage-reset` failure returns zero briefs. Disabled
     checks and the explicit v2 warning policy do not claim sensor evidence.
   - For `unsupported` or `unverified`, stop on exit code `4`; no dispatch brief is authorized.
   - For `blocked` or `usage-limited`, return recovery data and the resume condition without dispatch.
   - For `resume-ready`, return recovery data only. A later explicit host-owned action may transition the run.
   - For terminal states, report the durable result without continuing.
7. State the pinned owner, revision, next action, blocker or resume note, active roles, dispatch intent, usage outcome, and verified evidence locators.

## Boundaries

- Keep the simple-question path isolated; do not load this Skill for self-contained quick-answers.
- Never write STATUS.md, PLAN.md, role files, handoffs, evidence, configuration, or foreign
  runtime bytes. Automatic mode may atomically write only bounded, sanitized
  `.hive/runtime/usage-guard/` halt state, `.hive/runtime/usage-history/*.json`, and
  `.hive/runtime/dispatch-authorizations/*.json`, plus selected warning deduplication records
  under `.hive/runtime/usage-notices/`;
  manual mode writes nothing.
- Never create a plan, Ralph loop, team workflow, retry loop, subagent, model call, provider API request, or runtime process.
- Never perform automatic continuation from manual output or automatic output lacking a verified policy evaluation and current dispatch authorization.
- Never select, replace, install, configure, or invoke OMX/OMC.
- Never fall back to another owner when current capability evidence is missing, incompatible, unknown, or changed.
