---
name: usage-guard
description: (usage-guard) Control the installed Hive usage guard and run its automatic-dispatch preflight; infer only explicit threshold or session control intent. Never infer bypass from urgency or a bare continue or resume request.
---

# Hive Usage Guard

Enforce or control only the installed Hive usage policy and the current host session binding. This Skill does not run a model, continue a task, or own orchestration.

## Workflow

1. Handle explicit global Windows midway-monitor intent before folder classification. For example,
   “중간 중단 감시를 꺼 줘”, “초기화 감지로 멈추는 기능을 꺼 줘”, or “turn off midway monitoring”
   means the installed monitor's `disable`, never ordinary session-guard disable. This global
   monitor control is allowed in non-Hive folders, requires no project setup or session binding,
   and creates no project state. Read `hive usage monitor --help`, execute
   `hive usage monitor disable --user-root <user-root> --output json` on the user's behalf, then
   inspect `status`. Report whether configuration is disabled and the controller has stopped.
   Do not ask the user to type PowerShell or add confirmation to their explicit disable request.
   If the request could mean either safeguard, ask which one; do not change both.
   For all other controls, classify the target before any control. A valid installed project harness uses the global policy
   plus its registered project override. A Hive source workspace uses the installed global policy
   with an explicit `--host` and stores runtime state only under the user root. Every other folder,
   including one with only its own `AGENTS.md` or no files, is non-Hive: do not invoke threshold,
   session, status, or enforce, and create no halt or runtime state. The global enabled state applies to every project.
   Project overrides may only raise the stop threshold: the active value is the maximum of
   global, registered-project, and installed-project compatibility thresholds. The global
   v2 `enforcement_enabled=false` disables all preflight and midway protection, including
   zero-quota checks. It does not erase thresholds or dormant choices. In v1, ordinary disable
   affects threshold protection and the independent zero-quota guard remains enabled.
   Let the installed CLI interpret the schema; never treat missing v2 fields as an opt-out.
   Guard inactivity never disables setup-free Hive Skills. A quick answer, prompt refinement, or
   user-root knowledge workflow may still run in a non-Hive folder without project setup and
   without a usage preflight. If a separately selected workflow requires project state, that
   workflow owns one clear setup approval and automated bootstrap; do not expose capability or run
   prerequisites as usage-guard errors.
2. Run `hive usage enforce --help`. If unavailable, report the installed release as unsupported. Do not reconstruct the control format manually.
3. Obtain the exact current host session identifier and process ID from the active host context. Never invent, reuse, persist, or transfer a binding.
4. Before automatic dispatch, apply explicit threshold/off/on control. `run resume` automatic
   mode performs this shared preflight internally with the same session, process, and user root;
   do not sample twice for that dispatch. For a standalone preflight, run:

   ```text
   hive usage enforce --target <project-root> --session-id <current-session-id> --process-id <current-process-id> --user-root <user-root> [--host codex|claude|antigravity] [--run <canonical-run-id>] [--account-digest <active-account-digest>] --output json
   ```

   Supply an exposed active account digest when sensing is required; omit it for a CLI-confirmed
   policy that needs no observation or one unambiguous locally sensed account. Enabled checks
   remeasure previous halts. A reset stops one request without a resume lock. Exit `3`, limited,
   unknown, or reset results block dispatch. A v2 `hive.usage-disabled` or
   `hive.usage-preflight-disabled` result is a completed policy evaluation without sensing or
   legacy halt/control reads. `hive.usage-observation-warning` is allowed only by the selected
   v2 warning policy; it does not claim a valid observation. Do not run `enforce` for quick
   answers, manual work, or other non-dispatch actions except a required same-session recheck.
   Non-Codex automatic dispatch fails closed when required sensing has no qualified local sensor.
5. If native sensing is unavailable or unsupported, read [sensor fallback](references/sensors.md). Never install a fallback without explicit current-action acceptance.
6. Before any explicitly requested threshold or session control, read [control procedures](references/control.md). Never guess a percentage or infer bypass from a bare continue, resume, finish, urgency, or an active run.
7. Treat exit `0` from `enforce` as a session-bound preflight only; it never authorizes dispatch.
   Require a fresh same-binding `hive run resume --dispatch-intent automatic` result with
   `data.usage_guard.policy_evaluated=true`, one authorization ID, and exactly one dispatch brief.
   `enforced=true` with `outcome=authorized` means a valid observation was used. Accept
   `outcome=disabled`, `enforced=false`, `observation_required=false` for checks the installed
   policy disables. `enforcement_enabled=false` identifies the v2 master opt-out. Accept
   `outcome=observation-unavailable` only with the CLI's successful v2 warning-policy evaluation.
   Never fabricate an observation or enable a guard to satisfy this Skill. Legacy ordinary
   disable still needs its independent zero-quota check unless separately opted out.
8. `status` is inspection only and never substitutes for an automatic-dispatch preflight. After mutation, run `enforce` only for pending automatic dispatch or the same-session recheck required by the control reference. Treat `session_override=absent` or `stale` as enabled. Never copy an override to another host, session, or process.
9. Report saved global and project thresholds, active threshold, selected window, effective session state, changed Hive path, and exact CLI code. With a canonical `--run`, Discord receives only run title and checklist count; never raw prompts, session IDs, absolute paths, or credentials.

## Setup and manual inspection

For ordinary global preference setup, use user-setup's single status/CLI/result flow. Do not turn
this Skill into another questionnaire or infer an opt-out from a setup/resume request. Existing
preflight, session and monitor authority below still applies to their exact operations.
`hive usage show --host <selected-host> --user-root <user-root> --output json` is a manual reading,
not a dispatch permit or policy change. A settings summary does not query a sensor.

## Boundaries

- Change global `.hive/config/user-setup.yml` only through explicit `hive usage threshold --user-root`
  or the confirmed `hive setup --scope user --section usage` flow with the exact user root.
  Change a configured project's `.hive/config/harness.toml` only through project threshold control,
  and ignored `.hive/runtime/usage-guard/` session bindings only for a configured Hive target.
- Never edit those files directly or persist the raw session identifier.
- Never install a fallback hook, rewrite a prompt, activate another Skill, start a watcher, spawn a subagent, create an orchestration loop, continue a stopped task, or invoke OMX/OMC.
- New v2 setups default all blocking and midway interruption off. Warnings default on and use
  already acquired observations only. Existing v1 behavior remains effective until consented
  migration; its reset default and independent zero-quota protection are preserved.
- When selected checks require it, a reset returns `hive.usage-reset` and exhausted subscription
  quota returns `hive.usage-quota-exhausted`, exit `3`. Missing/stale usage blocks only under the
  strict policy or legacy behavior. Paid credits never replace subscription quota.
- A bare continuation or reset acknowledgement cannot clear an exhaustion halt. Use a fresh
  observation after quota recovery or the separately confirmed opt-out in the control reference.
  This is a Hive preflight safeguard. It does not interrupt an already running host turn or change
  provider billing settings. Never claim that it prevents all account credit consumption.
- CodexBar installation is the sole optional fallback install action. It is allowed only through the exact consented CLI flow in the sensor reference and a qualified package-manager adapter.
- Treat any independently produced OMX/OMC cancellation result as auxiliary evidence only. It never substitutes for the bound halt marker or durable goal/task state.
- Source development uses this installed product contract and global threshold. Never create a second source Skill, Python guard, watcher, or source-local threshold state.

## Windows live interruption

`hive usage monitor --help` exposes the installed version's monitor commands. Only its confirmed
installation may create the current-user scheduled monitor. First show `preview --user-root
<user-root> --output json`; `enable` requires that exact `--confirm <preview_digest>` and
`--confirm-session-interruption`. Do not infer current-version installation authority.

This narrow Windows Codex protection exception permits the installed monitor, not this Skill,
to start observations every 15 seconds after separate consent. Interrupt only for selected
reset, threshold, or zero-quota causes. A continuous 60-second observation gap interrupts only
under the selected strict stop policy or preserved legacy behavior. A failed
persistent connection is discarded; an independent fresh-process read gets its own five-second
limit. Either valid route preserves observation health. Failure retries are two seconds; never
extend the 60-second rule to hide an error. Both routes use the same subscription provider,
so they are not independent services during a provider outage. Keep the app open with a persistent reason/status window. Never
terminate the app when control is unavailable. The authenticated current-user desktop must pass the supported protocol checks; its package version is diagnostic metadata, not an allowlist. Connection, valid observation and confirmed interruption are separate results. It never starts
model work, controls a remote/cloud run, or guarantees an account-percentage overshoot limit.

Use `status` to distinguish saved opt-in, the actual live controller/version, observation route
and health, primary/final errors, consecutive failure time, and verified interruption. An enabled
configuration alone does not prove the monitor is running. Updates preserve opt-in and history,
replace the fixed executable and exact owned task, and refuse to report success if transition
or fresh-observation verification fails. Disabled monitoring stays disabled.

The running monitor shares the existing maximum global/project floor, selected usage window,
current-session exclusions, and independent zero-quota protection. Children inherit their owning
conversation's policy. Unverified cwd/ownership is reported as unavailable, never replaced with
another project's higher floor. A first valid reading already at/below the floor also stops the
applicable active conversations. The notice states measured remaining quota, applied floor and
window; a sent request is not a verified stop.

A confirmed floor stop is deduplicated by conversation owner, policy, control, account, usage
pool and window. The user can resume that same conversation or send a new message at the same
low quota without another stop or manual preflight floor block. This is not an automatic-dispatch
permit and never transfers to another conversation, scheduled run, or independent zero-quota
check. Recovery above the floor, a new period/account, or policy change rearms detection.
Midway opt-out preserves the independently selected preflight policy. The v2 master opt-out
disables both. A threshold change or new session never enables an unselected guard.
A reset stops the sessions present at detection once. A continuous 60-second observation gap
also stops once until sensing recovers when strict failure protection is selected. Incident records persist as history, never as resume
locks. Users can resume or send a new message directly in Codex. The official-logo notice
only explains the cause and status and has one close button. It never executes a command,
acknowledges, unlocks, or resumes work. `disable` removes only the owned scheduled task and
retains incident evidence and staged bytes. Saved thresholds remain; the selected policy decides
whether threshold and zero-quota checks apply.

Already-started ordinary external commands can continue after a chat stops. This exception does
not cover local AI sessions or subagents: they remain interruption targets under their owner's
policy. Never report an AI child as stopped based only on its parent turn stopping.
