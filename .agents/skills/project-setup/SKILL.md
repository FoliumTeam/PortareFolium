---
name: project-setup
description: Configure or reconfigure a local Hive harness only for an explicitly identified project, repository, folder, or path. Route global user-scope setup, preference changes, and bare Hive setup to user-setup.
---

# Setup Harness

Configure a consumer project without copying Hive source-development instructions or modifying third-party runtime state.

## Scope Routing

- Select this Skill only when the user identifies a project, repository, folder, path, or the
  current project as the target for a local harness.
- Do not select it for global or user-scope preference changes, or for a bare request to set up,
  install, configure, or reconfigure Hive. Those requests belong to `user-setup`.
- When the user explicitly requests both scopes, let `user-setup` finish first and wait for a
  separate confirmation before project inspection, preview, or apply.

## Workflow

1. Locate the project root and inspect it read-only.
    - Read existing `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.gitignore`, project manifests, and `git status`.
    - Stop if `hive-source.json` is present.
    - Do not read secrets, provider credentials, `.omx/`, `.omc/`, or host-global configuration.
2. Check the signed Hive CLI.
    - Run `hive setup --help`.
    - If the command is unavailable, report that setup is unsupported in the installed release. Do not reproduce the renderer manually.
    - Resolve the exact user root selected during global Hive setup. Pass it only through `--user-root`; never inspect host-global configuration or plugin caches.
3. Ask one setup question at a time.
    - Follow the required sequence under `Setup Question Sequence` below.
    - In the guided workflow, ask for setup mode first, then ask for project kind in both modes.
    - When `project-setup` supplies a schema-valid evidence record, accept only
      `explicit` or `strong` inferred facts and ask for every `unresolved` required field.
    - In `expedited` mode, tell the user that the signed CLI bridge inherits global language, Wiki, persona, and Skill preferences. Do not ask those preference questions.
    - In `custom` mode, collect explicit project overrides for interface language, Wiki enablement and language, persona, Skill selection, and an equal-or-higher usage-guard threshold when the global guard is enabled.
    - Infer repository facts before asking the user.
    - Do not infer preference, risk tolerance, host choice, or optional Skill approval.
4. Resolve the v0.9 owner and capabilities.
    - Default a new run to the active host's verified native capabilities without asking an owner question.
    - Treat OMX and OMC as external compatibility options only. Accept one only when the user explicitly requests and confirms it before the run starts; installation or capability evidence alone never changes the default.
    - Preserve any owner already pinned by an existing run, including a 0.8.x OMX/OMC owner. Reconfiguration never migrates or replaces that owner implicitly.
    - Normalize host-native capability support to `supported`, `best-effort`, `unsupported`, or `unverified`. A required `unsupported` or `unverified` capability stops before writes with `host_capability_unsupported`.
    - Retain `available`, `absent`, `incompatible`, or `unknown` external detection only for an explicitly selected compatibility layer or validation of legacy 0.8.x state.
    - Compute `evidence_digest` as `sha256(RFC 8785 JCS(normalized capability-resolution object excluding only evidence_digest))`. This binds host, version, surface, detection, external runtime, resolved owner, capability claims, and evidence.
    - Positive evidence may come only from active-host Skill/plugin capability metadata or a public executable path with side-effect-free `--version`.
    - An explicitly selected external layer requires positive compatibility evidence. Missing, incompatible, or unknown evidence is unsupported and never triggers an automatic owner fallback.
    - Never install, update, configure, or invoke OMX/OMC.
    - Never infer state by reading `.omx/`, `.omc/`, plugin caches, session state, or host-global configuration.
    - Install Hive-native iterative, team, multi-goal, or scheduler capabilities only when the signed release implements them, the selected host passes the required capability checks, the feature is activated, and every optional Skill has explicit approval.
    - Never substitute an OMX/OMC runtime, namespace, command, or state tree for a missing Hive-native capability.
5. Present optional Skills individually.
    - Show name, purpose, source, pinned revision, content digest, requested tools, and overlap.
    - Require explicit approval for every requested capability and Skill. An empty approval list is valid.
    - Sort capability IDs and bind consent version, displayed provenance, content digest, requested/approved capabilities, and UTC-seconds approval time with `sha256(RFC 8785 JCS(payload))`.
    - Recompute the digest before staging and never repair a mismatch automatically.
6. Offer optional data-integrity hooks only on a supported host-native hook surface.
    - Do not ask, render, register, or execute a hook when the host-native hook surface is `unsupported` or `unverified`, or when an explicit external compatibility owner is active.
    - Show each exact capability, event, `.hive/hooks/<capability>` path, `hive hook --capability <capability> --event <event> --capabilities .hive/runtime/current-capability-resolution.json --output json` command, and content digest.
    - Require explicit approval per hook capability. Declining every hook is fully supported and must create no hook approval artifact or command.
    - Limit hooks to `protect-hive-owned-state`, `update-integrity-guard`, `derived-state-invalidation`, and `checkpoint-reminder`.
    - Require the host adapter to refresh `.hive/runtime/current-capability-resolution.json` immediately before each non-Stop invocation. Setup never creates or tracks this ephemeral file; missing, stale, malformed, unsupported, or unverified host-native evidence leaves the hook inert before hook input is read.
    - Hook adapters pass a versioned JSON object on stdin. It contains `schema_version` and `event`, plus only the typed fields needed by the approved capability: `tool`/`operation`/`path`, `action` with dry-run/backup/staging gates, canonical `path`, or `status_path`/`checkpoint_present`.
    - Hooks never classify prompt-submission events, rewrite prompts, activate Skills, ingest memory, spawn subagents, orchestrate work, or decide continuation.
    - A `Stop` hook always returns a neutral allow result without a block decision, continue instruction, or re-invocation prompt.
7. Run a dry run and validate the write set.
    - Run `hive setup --target <project-root> --quick-answers <setup-quick-answers.yml> --capabilities <capability-resolution.json> --user-root <user-root> --dry-run --output json`.
    - Require the CLI to render into staging first.
    - Reject writes outside Hive-owned paths and the exact Hive marker in shared files.
    - Show conflicts and unsupported host capabilities before mutation.
8. Apply setup.
    - Apply the same validated inputs with `--user-root <user-root> --apply`.
    - Preserve non-Hive text and third-party marker blocks byte-for-byte.
    - Materialize each approved role seed into `.hive/team/roles/<role-id>.md` in staging.
    - On reconfiguration, preserve existing assignment, handoff, and Markdown body; require explicit approval for definition drift.
    - Do not commit or push unless the user explicitly requested the Git operation.
9. Verify.
    - Run `hive setup --target <project-root> --quick-answers <setup-quick-answers.yml> --capabilities <capability-resolution.json> --user-root <user-root> --validate --output json` with the same validated inputs used for the dry run and apply.
    - Confirm role seeds have schema-valid canonical role documents, Markdown canonical files exist, no project-local SQLite exists, the user-root project registry and shared index are valid, setup quick-answers are tracked, and the selected host can discover the generated entrypoint.
    - Report generated paths, skipped optional components, detected limitations, and exact recovery steps.

## Setup Question Sequence

Ask only questions whose quick-answers cannot be established from the repository.

## Required order

1. **Setup mode**
    - Offer `expedited` or `custom`.
    - `expedited` inherits global interface language, Wiki enablement and language, persona, and selected Skills through the signed CLI bridge.
    - `custom` records explicit project overrides for those preferences and, only when the global guard is enabled, a user-chosen equal-or-higher usage-guard threshold.
2. **Project kind**
    - Ask this in both guided modes.
    - `project-setup` may infer `general` only from an explicit canonical project purpose;
      it must ask when evidence is missing, contradictory, or points to unsupported domain rules.
    - Offer only project kinds present in the signed release.
    - Explain that `custom` project kind installs the base domain contract without guessing domain rules. Project kind is independent of `custom` setup mode.
3. **Project identity**
    - Confirm the detected project name and repository root.
4. **Custom preference overrides**
    - Ask only when setup mode is `custom`.
    - Interface language: `en` or `ko`.
    - Wiki: explicit `enabled` state and `en`, `ko`, or `both`.
    - Persona: `strict`, `balanced`, `friendly`, or `custom`; require a non-empty custom description.
    - Skills: recommended suite or an explicit non-empty built-in Skill list.
    - Usage guard: inherit the global threshold or choose a higher integer from `1` through `99`. Do not suggest or create a project-type default.
    - Do not silently enable a project Wiki when the global Wiki is disabled. The signed CLI must either keep it disabled or include a global re-enable in the same approved action.
5. **Primary host**
    - `codex`, `claude`, or `antigravity`.
6. **Persistent roles**
    - Ask which stable team roles the project needs.
    - Record `role_id`, display name, responsibilities, non-responsibilities, context paths, allowed capabilities, write scope, and verification duties.
    - Store role identity and handoff, not a permanent process or model session.
7. **Knowledge scope**
    - Confirm which project files may be ingested into Raw/Wiki.
    - Record explicit project-relative include and exclude paths/globs.
    - Exclude credentials, private keys, tokens, and unrelated repositories.
8. **Root knowledge promotion**
    - Ask which of `fact`, `preference`, and `workflow` may be explicitly promoted.
    - Ask which categories are confidential and must never leave the project.
    - Record a stable project identity plus the SHA-256 binding of the selected user store root.
    - An empty promotion category list keeps all knowledge project-local.
9. **Usage guard inheritance**
    - Inherit the global opt-in state and remaining threshold; enabled global setup defaults to 20%.
    - Explain that the threshold is enforceable only when a fresh local subscription usage sensor exists.
    - Without a trustworthy sensor, automatic continuation must fail closed.
10. **Judge policy**

- Normal risk: one independent judge when requested.
- Elevated risk: two of three independent judges.
- Critical risk: three of three plus human approval.

11. **Optional Skills**

- Present each candidate separately with provenance and overlap.
- Present requested filesystem, shell, network, subagent, and external-app capabilities.
- Require a direct approval or rejection for each capability and candidate.
- Sort capability IDs and record `sha256(RFC 8785 JCS(payload))` over consent version, exact displayed name/source/revision/content digest, requested/approved capabilities, and UTC-seconds approval time.

12. **Optional data-integrity hooks**

- Ask only when the active host exposes a supported native hook surface and no explicit external compatibility owner is active.
- Do not ask when the native hook surface is `unsupported` or `unverified`.
- Show each exact capability, event, `.hive/hooks/<capability>` path, executable command, and content digest.
- Require approval per capability. Rejecting all hooks is valid and produces no hook artifact.
- Explain that hooks perform only bounded data-integrity diagnostics and never prompt classification or rewriting, Skill activation, memory ingestion, subagent orchestration, or continuation.
- A `Stop` event always returns a neutral allow result.

13. **Write preview**
    - Show files, marker edits, ignored SQLite paths, and any conflicts.

## Fixed product decisions

Do not ask about these:

- Local-only operation on an authenticated subscription host
- No provider API calls or provider API keys
- Markdown canonical knowledge/role/run data plus typed tracked YAML/TOML configuration and consent, with a rebuildable SQLite index
- Git tracking for non-confidential canonical files
- SQLite, WAL/SHM, generated backup, and runtime cache exclusion
- Seven-day maximum backup retention
- Hive-native iterative, team, multi-goal, and logical-scheduler capabilities remain unavailable until their signed release, host qualification, and activation gates pass
- No provider session engine, model runtime, direct model/subagent process launcher, or OMX/OMC runtime dependency
- Orchestration owner selection: new v0.9 runs use verified host-native capabilities by default; OMX/OMC requires explicit user selection; existing 0.8.x owner pins remain unchanged
- Owner detection evidence sources: active-host capability metadata and side-effect-free public `--version` only

## Safety Invariants

- Never call a model-provider API or request an API key.
- Never write a consumer harness into the Hive source workspace.
- Never activate an optional Skill without explicit approval.
- Never activate a Skill whose consent payload or digest fails validation.
- Never claim persistent completion, subagents, or usage enforcement when the selected host does not expose the required capability.
- Never silently switch from a host-native, explicitly selected external, or legacy-pinned owner to another orchestration layer.
- Never offer or install data-integrity hooks without a supported host-native hook surface and exact user consent, or while an explicit external compatibility owner is active.
- Never treat `best-effort`, `unsupported`, or `unverified` as supported.
- Never allow a fallback `Stop` hook to continue or block a session.
- Never use Copier directly against the live consumer tree; Copier is an authoring and CI surface.
