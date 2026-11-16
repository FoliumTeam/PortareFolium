---
name: run-checkpoint
description: (run-checkpoint) Save progress and evidence for an existing Hive run before handoff, interruption, or verification.
---

# Hive Run Checkpoint

Record state only. Execution and continuation remain owned by the run's pinned owner. New v0.9 runs default to host-native capabilities; an explicitly selected external compatibility owner or legacy 0.8.x OMX/OMC owner remains pinned.

## Workflow

1. Run `hive run checkpoint --help`. If unavailable, report the installed release as unsupported. Do not write `STATUS.md` directly.
2. Read only the selected run's `PLAN.md`, current `STATUS.md` if present, assigned role documents, exact shared `HANDOFF.md`, and referenced evidence files.
3. Derive required criterion IDs from `PLAN.md`; never accept a caller-supplied replacement criterion set.
4. Prepare a bounded JSON request matching `schemas/run-checkpoint-request.schema.json`.
    - Set `expected_revision` to `0` only when `STATUS.md` is absent; otherwise bind the exact current revision.
    - Record passed, failed, or unverified criteria truthfully.
    - Reference evidence only as `.hive/runs/<run-id>/evidence/<safe-file>#sha256:<64-lowercase-hex>`.
    - Include active role IDs whose documents bind the exact run and `.hive/runs/<run-id>/HANDOFF.md`.
    - Do not include an owner choice. Run creation supplies the owner: host-native by default for v0.9, explicitly selected external compatibility when requested, or the preserved owner of an existing 0.8.x run. The owner is immutable after the first checkpoint.
5. Obtain a fresh normalized capability-resolution JSON from the active host adapter. Do not probe or read `.omx/`, `.omc/`, plugin caches, session state, or host-global configuration.
6. Run:

    ```text
    hive run checkpoint --target <project-root> --request <request.json> --capabilities <fresh-capability-resolution.json> --output json
    ```

7. Accept only a schema-valid success result. An identical retry is a no-op; a lost revision, changed owner evidence, unsafe path, missing role handoff, or evidence digest mismatch is a stop condition.
8. Report the committed revision, state, next action, changed path, and evidence digests.
9. When this run contains reviewed policy-checker evidence or the user requests policy review, read [policy review](references/policy-review.md). A Stop notice is only a review reminder; it never changes completion, rules, or execution authority.

## Boundaries

- Never create or execute a plan, Ralph loop, team workflow, retry loop, subagent, model call, provider API request, or runtime process.
- Never select, replace, install, configure, or invoke OMX/OMC.
- Never switch owner when capability evidence changes mid-run.
- Never mark success while any required criterion is failed, unchecked, or unverified.
- Never rewrite role Markdown bodies, evidence, PLAN.md, foreign runtime state, or non-Hive-owned files.
