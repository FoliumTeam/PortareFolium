---
name: usage-guard
description: Control the installed Hive usage guard and run its automatic-dispatch preflight; infer only explicit threshold or session control intent. Never infer bypass from urgency or a bare continue or resume request.
---

# Hive Usage Guard

Enforce or control only the installed Hive usage policy and the current host session binding. This Skill does not run a model, continue a task, or own orchestration.

## Workflow

1. Run `hive usage enforce --help`. If unavailable, report the installed release as unsupported. Do not reconstruct the control format manually.
2. Obtain the exact current host session identifier and process ID from the active host context. Never invent, reuse, persist, or transfer a binding.
3. Immediately before each new automatic dispatch, apply any explicitly requested threshold/off/on control, then run:

    ```text
    hive usage enforce --target <project-root> --session-id <current-session-id> --process-id <current-process-id> --user-root <user-root> [--host codex|claude|antigravity] [--run <canonical-run-id>] [--account-digest <active-account-digest>] --output json
    ```

    Supply the active account digest when the host exposes it. Omit it only when the qualified local sensor exposes exactly one unambiguous account. A current halt marker takes priority. Exit `3`, `hive.usage-limited`, or `hive.usage-unknown` blocks that automatic dispatch. Do not run `enforce` for ordinary quick-answers, manual work, or other non-dispatch actions. Non-Codex automatic dispatch fails closed until a qualified local sensor exists.

4. If native sensing is unavailable or unsupported and CodexBar is missing, report the returned provider-specific notification and exact `next_action`. Do not substitute a different provider:

    ```text
    hive usage fallback-install --host codex|claude|antigravity --dry-run --output json
    ```

    Decline executes nothing, preserves core Hive use, and leaves automatic dispatch `hive.usage-unknown`. Package-manager unavailability remains a sanitized unsupported result.

5. On explicit install acceptance, run the provider-specific dry run first and show its fixed package-manager command. Apply only after fresh current-action confirmation:

    ```text
    hive usage fallback-install --host codex|claude|antigravity --apply --confirm-install --output json
    ```

    Never infer consent, install silently, request credentials, reinstall a provider CLI, or suggest CodexBar API-key or manual-cookie setup.

6. Classify the target before any control. A valid installed project harness uses the global policy
   plus its registered project override. A Hive source workspace uses the installed global policy
   with an explicit `--host` and stores runtime state only under the user root. Every other folder,
   including one with only its own `AGENTS.md` or no files, is non-Hive: do not invoke threshold,
   session, status, or enforce, and create no halt or runtime state. The global policy applies only
   to configured Hive projects and the Hive source workspace. Its enabled state is global;
   a project override may only raise the stop threshold. Hive calculates the active threshold as
   the highest of the global threshold, the registered project override, and the installed
   project compatibility value. A disabled global guard disables every project.
   Guard inactivity never disables setup-free Hive Skills. A quick answer, prompt refinement, or
   user-root knowledge workflow may still run in a non-Hive folder without project setup and
   without a usage preflight. If a separately selected workflow requires project state, that
   workflow owns one clear setup approval and automated bootstrap; do not expose capability or run
   prerequisites as usage-guard errors.
7. Perform at most the explicitly requested control mutation:
    - A global threshold requires explicit global intent and an integer from 1 through 99:

        ```text
        hive usage threshold --user-root <user-root> --remaining-percent <percent> --output json
        ```

    - A project threshold requires an explicit integer and a valid installed project harness.
      Never reinterpret a non-Hive target request as a global change:

        ```text
        hive usage threshold --target <project-root> --remaining-percent <percent> --output json
        ```

    - Disable requires obvious current-session bypass intent and the confirmation flag:

        ```text
        hive usage session --target <project-root> --session-id <current-session-id> --process-id <current-process-id> --action disable --confirm-session-disable --output json
        ```

    - Enable restores enforcement for the current binding:

        ```text
        hive usage session --target <project-root> --session-id <current-session-id> --process-id <current-process-id> --action enable --output json
        ```

    - Toggle uses the same command with `--action toggle`. Include
      `--confirm-session-disable` whenever the result would disable enforcement.

8. Treat exit `0` from `enforce` as a session-bound preflight only; it never authorizes dispatch. Require a separate `hive run resume --dispatch-intent automatic` result with `data.usage_guard.enforced=true`, `outcome=authorized`, one authorization ID, and exactly one dispatch brief. A confirmed session disable bypasses the preflight but does not authorize dispatch.
9. `status` is inspection only and never substitutes for an automatic-dispatch preflight. Run `enforce` after a mutation only when a new automatic dispatch is pending. Treat `session_override=absent` or `stale` as enabled. Never copy an override to another host, session, or process.
10. When a canonical `--run` is available, Hive sends only the run title and checklist count to Discord. It never sends a raw prompt, session ID, absolute path, or credential. Report the saved global threshold, selected project override, active threshold, selected window, effective current-session state, changed Hive-owned path, and exact CLI result code.

## Intent rules

- Recognize clear threshold, disable/bypass, enable/restore, and toggle intent semantically; the examples below are illustrative rather than a finite phrase allowlist.
- Disable intent includes requests to turn off or bypass the usage guard, use quota below the stop line, or continue below the configured threshold for the current session.
- Enable intent includes requests to restore the guard, enforce the limit again, stop at the configured threshold, or remove the bypass.
- Threshold mutation requires the requested percentage. Never guess a value.
- A bare `continue`, `resume`, `finish`, urgency, or an active run does not authorize disable.

## Boundaries

- Mutate global `.hive/config/user-setup.yml` only through explicit `hive usage threshold --user-root`, a configured project's `.hive/config/harness.toml` only through project threshold control, and the current binding under ignored `.hive/runtime/usage-guard/` only for a configured Hive target.
- Never edit those files directly or persist the raw session identifier.
- Never install a fallback hook, rewrite a prompt, activate another Skill, start a watcher, spawn a subagent, create an orchestration loop, continue a stopped task, or invoke OMX/OMC.
- CodexBar installation is the sole optional fallback install action. It is allowed only through the exact consented CLI flow above and a qualified package-manager adapter.
- Treat any independently produced OMX/OMC cancellation result as auxiliary evidence only. It never substitutes for the bound halt marker or durable goal/task state.
- Never describe a disabled session as usage-enforced. Automatic dispatch still requires the independent `hive run resume` authorization contract.
- Source development uses this installed product contract and global threshold. Never create a second source Skill, Python guard, watcher, or source-local threshold state.
