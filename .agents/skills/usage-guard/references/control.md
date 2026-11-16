# Explicit usage control

Read before any threshold, disable, enable, or toggle operation.

## Global policy and legacy compatibility

- For an explicit request to change the whole v2 policy, use
  `hive setup --scope user --section usage --user-root <user-root>` and its confirmed CLI flow.
  If the installed CLI rejects this input, report unsupported and preserve the policy.
  Do not turn a global request into a session override or write settings by hand.
- New v2 protection defaults off. `enforcement_enabled=false` disables all blocking and midway
  interruption, including zero-quota checks; it preserves dormant settings. With the master
  enabled, only the selected preflight/midway causes apply. Legacy v1 ordinary disable still
  leaves independent zero-quota protection active. The installed CLI owns this interpretation.
- A fresh exit-0 `hive.usage-disabled` or `hive.usage-preflight-disabled` with
  `policy_schema_version=2` and `policy_evaluated=true` needs no sensor. A successful
  `hive.usage-observation-warning` is the selected v2 warning policy, not a valid measurement.
  These are valid preflight results, never dispatch authorization. Do not change policy merely
  to obtain `hive.usage-allowed` or `enforced=true`.

## Threshold and current-session controls

7. Perform at most the explicitly requested control mutation:
   - A global threshold requires explicit global intent and an integer from 0 through 99:

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
Threshold zero does not disable selected checks or enable unselected checks. With an enabled
zero-quota check, exhausted subscription quota stops work regardless of paid credits. Never
promise zero credit consumption from periodic client-side interruption.

## Same-session policy recheck

   Run each required usage check in its own tool call. Inspect its result before starting or
   queuing further work; do not batch it with other work, including parallel calls.

   When a threshold mutation returns `session_recheck_required=true` for an active task, run
   `enforce` immediately with the same exact target, host, session id, process id, user root, and
   available account digest. This recheck also applies to manual source work. Continue only after
   fresh `hive.usage-allowed` or a valid v2 policy result defined above; limited, unknown, or
   policy-changed failures remain blocked. Never
   disable the session merely to acknowledge a changed threshold.

## Quota reset stop

- A selected reset check stops the current request only. A new request reevaluates the installed
  policy; no acknowledgement or unlock is required. Other selected checks still apply.
- A monitor incident is a reason/status record, not dispatch authority or a resume lock. Users may resume directly in Codex. The notice only closes; it never starts or controls work.

## Reset-only session control

- For an explicit request to ignore quota resets only in the current task, use installed help to confirm support, then run:

  ```text
  hive usage session --target <hive-target> --host <host> --user-root <user-root> --session-id <current-session-id> --process-id <current-process-id> --action disable-reset-guard --confirm-reset-guard-disable --output json
  ```

- Restore reset detection with `--action enable-reset-guard`, without the disable confirmation. Both actions require the overall usage guard to remain enabled.
- These actions preserve global settings and other selected checks. Missing or low usage blocks
  only when the installed policy requires it. Other hosts, sessions, and processes do not inherit
  the opt-out; changing the general guard does not clear a current reset-only preference.
- Reset-only disable never repairs a damaged marker. Use fresh enforce after repairing damaged state.
- After either successful action, run one same-binding `enforce`. Continue only after fresh
  `hive.usage-allowed` or a valid v2 policy result defined above. Control success never grants
  dispatch authority or supplies periodic monitoring.
- Do not use general `disable` or `toggle` for a reset-only request. A bare continuation request authorizes neither kind of bypass.

## Zero-quota session control

- Zero-quota protection is independent of ordinary threshold and reset protection. Do not treat
  general disable, toggle, threshold changes, or continuation as permission to disable it.
- For an explicit current-session request to allow exhausted subscription usage, confirm installed
  command support and run:

  ```text
  hive usage session --target <hive-target> --host <host> --user-root <user-root> --session-id <current-session-id> --process-id <current-process-id> --action disable-zero-quota-guard --confirm-zero-quota-guard-disable --output json
  ```

- Restore with `--action enable-zero-quota-guard`, without the disable confirmation. General
  controls preserve this separate preference. New hosts, conversations, and processes use the
  installed policy; they do not inherit a previous session's opt-out.
- After either action, run one same-binding `enforce`. A successful control is not dispatch authority.
  An opt-out leaves an enabled ordinary threshold guard in force. Only disabling both allows sensing
  to be bypassed in v1. A v2 master opt-out also skips sensing. Explain that disabled protection
  does not change the provider's billing rules.
- Exhaustion returns exit `3` and `hive.usage-quota-exhausted`. Stop Hive-controlled work, keep the
  halt receipt, and report the exhausted window. A bare continue does not remove the stop.
  After exhaustion is observed, do not call another tool for checkpoints, knowledge capture,
  lint, Git, cleanup, or handoff records. Defer these operations; the guard's existing receipt
  is sufficient. End with a short halt notice. New user requests require fresh allowed usage.
  A fresh positive observation can clear exhaustion; a newly detected quota increase can stop that
  request once while ordinary protection is enabled. The next request remeasures without a resume lock.
- Report `zero_quota_guard_enabled` and `active_turn_interruption_verified`. Do not promise live
  interruption, stop a host process, or change provider billing settings.

## Intent rules

- Recognize clear threshold, disable/bypass, enable/restore, and toggle intent semantically; the examples below are illustrative rather than a finite phrase allowlist.
- Disable intent includes requests to turn off or bypass the usage guard, use quota below the stop line, or continue below the configured threshold for the current session.
- Enable intent includes requests to restore the guard, enforce the limit again, stop at the configured threshold, or remove the bypass.
- Threshold mutation requires the requested percentage. Never guess a value.
- A bare `continue`, `resume`, `finish`, urgency, or an active run does not authorize disable.
