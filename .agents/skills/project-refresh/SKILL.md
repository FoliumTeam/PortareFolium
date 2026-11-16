---
name: project-refresh
description: (project-refresh) Update existing Hive-generated project guidance when the user asks to refresh or upgrade a project's Hive directives or Skills. Supports preview-only requests; not global Hive installation or ordinary application updates.
---

# Hive project upgrade

Use only for an installed consumer project.

## Request routing

- Select this Skill for a natural request such as "update this project's Hive guidance" or
  "이 프로젝트의 Hive 지침을 갱신해 줘". The user need not name the Skill or type CLI commands;
  the agent runs the commands below and explains the changes in the user's language.
- A preview-only request authorizes inspection and preview, not apply. An explicit request to
  update the identified project authorizes the reviewed in-scope update; do not ask again for
  the same authority. Ask only for a missing target, material conflict decision, or new scope.
- General questions and ordinary code or dependency updates do not select this workflow.
  Global Hive installation or updates belong to `user-setup` or `product-update`.
- Apply the project's `00-project-harness.md` availability gate before commands. Missing local
  Hive or setup blocks only the requested Hive upgrade, not ordinary collaboration. Do not
  install Hive, alter global settings, or substitute hand-written generated files implicitly.
- Older projects may lack that gate. Resolve `hive` with the current host's normal command
  lookup and use this collaborator's existing local setup; project files or a version string
  alone do not prove readiness. Let the command validate authority. An execution error,
  malformed setup, or an existing protected stop is not non-installation and must not be bypassed.
- Resolve the project and verified executable, inspect Git changes and Hive ownership, and
  preserve unrelated edits. Never select a different release or install it without authority.

## First project Skill policy update

- A missing project_skill_policy_version proposes daily-work as the new default, with 23 Skills
  when Wiki is enabled. Explain the selected list, removals and plugin/local delivery in preview.
- The user can accept the default or customize it. For a requested customization, use project-setup
  to change only the Skill selection with the other validated preferences retained, then preview
  again. Do not force the default or restart unrelated questions.
- Policy 1 records the final choice. Later upgrades retain that choice, including an empty list.
  Preserve modified and foreign Skills and explain remaining duplicates; global updates never
  apply this transition across projects.

## Upgrade workflow

Resolve the authenticated user root from Hive setup; pass it to every command below.
An update automatically removes exact Hive-owned plugin-covered copies. Preserve modified
Skills and their resources; report their paths and remaining duplicate discovery.

1. Run `hive project upgrade --target <project-root> --user-root <user-root> --scan --output json`.
2. Report installed, base, local, and incoming digests plus every applicable change, including retired Hive Skill removal only when ownership is authenticated.
3. For preview, run `hive project upgrade --target <project-root> --user-root <user-root> --dry-run --output json`.
4. Apply only after the user requests the update:
   `hive project upgrade --target <project-root> --user-root <user-root> --apply --output json`.
5. Validate with
   `hive project upgrade --target <project-root> --user-root <user-root> --validate --output json`.
6. If an interrupted activation leaves an upgrade journal requiring recovery, run
   `hive project upgrade --target <project-root> --user-root <user-root> --recover --output json`.
   Inspect whether recovery rolled back or completed forward. This is not an undo command for
   a successful upgrade. Stop on an unauthenticated base or unresolved ownership conflict.

Report changed paths, preserved local changes, validation results, and remaining conflicts.
Validation proves the Hive projection state, not application tests or the host's compliance.

## Combined customized Skills

Combine incoming Hive improvements with user project rules. Keeping only an old customized file
does not prove that it received the new improvements.

- An authenticated base permits automatic disjoint three-way changes. Inspect
  `reports[].omitted_incoming_hunks`; omitted incoming Skill changes require a reviewed combination.
- No old base for an occupied Skill means no automatic takeover. Never invent a base, move/delete
  the file, or exclude the built-in as the default repair. Unrelated foreign Skills stay foreign.
- For the user's requested combination, run
  `hive project upgrade --target <project-root> --scan --skill-merge-inputs <skill-name> --output json`.
  Read only the indicated local files and applicable project rules. The result supplies exact
  incoming contents, project base digest and local/incoming digests.
- Write a coherent combination of applicable new Hive workflow and user checks, not contradictory
  concatenated files. Preserve legal notices, resource links and the incoming Skill name. Retain
  other settings and unrelated files; ask only about unresolved meaning.
- Use temporary JSON matching `project-skill-merge.schema.json`: `schema_version: 1`,
  `product_version`, `project_base_digest`, and `files` with `path`, `local_digest`,
  `incoming_digest`, `merged_content`. Cover each occupied companion needing combination.
- Preview with `--skill-merges <request.json> --dry-run`. Show the full combined diff, preserved
  checks, new improvements and any omitted rules with reasons. Obtain approval for that exact
  content and `skill_merge_approval_digest`; general upgrade authority alone is insufficient.
- Apply the same request with `--apply --approve-skill-merge <approved-digest>`, using existing
  exact-path reservations. Changed local/incoming/base/target/plan requires fresh review. Never
  force stale approval or manually edit ownership ledgers.
- Run `--validate` without the old request. The new upstream stays the next comparison base;
  the combined Skill is a local override. Verify the next unchanged preview has zero writes.
  CLI checks prove bytes and authority, not semantic equivalence or host compliance.

Merge contract:

- `local == base`: incoming exact replacement
- disjoint local and incoming changes: include both
- overlapping changes: preserve the local hunk and report the omitted incoming hunk, except a direct conflict with an incoming Hive safety or ownership rule
- an outdated Hive directive or the Hive marker in `AGENTS.md`: replace only a Hive-owned clause that directly contradicts an incoming safety or ownership rule; preserve user-authored text, foreign blocks, and non-conflicting local Hive clauses byte-for-byte
- retired Hive Skill: remove only a retired-name path proved by the authenticated project base; preserve modified or foreign paths and report any resulting conflict
- missing or unauthenticated base: active bytes unchanged and conflict
- active conflict markers: forbidden
- existing run owner pins are canonical run state: preserve every 0.8.x OMX/OMC owner and every v0.9 host-native or explicitly selected external owner; never migrate an owner as a projection side effect

Do not edit `.omx/`, `.omc/`, provider credentials, or foreign paths.

## Existing directive recovery

If the project has a user-owned `.hive-context.toml`, preserve it during projection upgrades.
After validation, inspect `hive policy hooks status --host <host> --target <project> --output json`.
A changed policy or selected excerpt requires the optional directive recovery flow in project-setup:
review the canonical text and exact preview before updating pins or hook registration. Never silently
accept a new digest, broaden protected paths, or claim compaction adherence from installation alone.
A guidance refresh does not implicitly authorize new hooks. Missing hooks do not prevent ordinary
project development for collaborators without Hive.
