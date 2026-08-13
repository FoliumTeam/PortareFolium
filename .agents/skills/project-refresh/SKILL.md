---
name: project-refresh
description: Scan, preview, apply, validate, or recover release-generated Aigent Hive project directives and Skills with a local-priority three-way merge.
---

# Hive project upgrade

Use only for an installed consumer project.

1. Run `hive project upgrade --target <project-root> --scan --output json`.
2. Report installed, base, local, and incoming digests plus every applicable change.
3. For preview, run `hive project upgrade --target <project-root> --dry-run --output json`.
4. Apply only after the user requests the update:
   `hive project upgrade --target <project-root> --apply --output json`.
5. Validate with
   `hive project upgrade --target <project-root> --validate --output json`.
6. If an interrupted or rejected activation needs recovery, run
   `hive project upgrade --target <project-root> --recover --output json`.

Merge contract:

- `local == base`: incoming exact replacement
- disjoint local and incoming changes: include both
- overlapping changes: preserve the local hunk and report the omitted incoming hunk
- missing or unauthenticated base: active bytes unchanged and conflict
- active conflict markers: forbidden
- existing run owner pins are canonical run state: preserve every 0.8.x OMX/OMC owner and every v0.9 host-native or explicitly selected external owner; never migrate an owner as a projection side effect

Do not edit `.omx/`, `.omc/`, provider credentials, or foreign paths.
