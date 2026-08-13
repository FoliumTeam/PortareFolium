---
name: project-transition
description: Apply a local integrity-bound, compiled Aigent Hive migration route when the user explicitly requests a version migration, especially a cross-major transition; never infer a major target or run release-provided scripts.
---

# Hive Migrate

Migration is a constrained `hive update` path, not a general code or data migration tool.

## Workflow

1. Run `hive update --help` and require a local release bundle obtained through npm registry
   integrity or a verified GitHub artifact attestation.
2. For same-major migration, use the normal `product-update` dry-run and apply workflow.
3. For a cross-major release, require all of:
    - the exact target version explicitly supplied by the user;
    - a separate human confirmation bound to source version, release-plan digest,
      compatibility-report digest, and migration-table digest;
    - a manifest-bound route whose `migration_id` is compiled into the running Rust CLI.
4. Dry-run with the exact authority:

    ```text
    hive update --target <project-root> --bundle <release-dir> --dry-run --exact-major-target <X.Y.Z> --major-confirmation <target-relative-confirmation.json> --output json
    ```

5. Apply only after the dry-run proves project source, docs, user Markdown bodies, preferences,
   approvals, role/run state, and foreign bytes remain preserved.
6. Require SQLite rebuild from canonical source; never migrate or restore a database file.

## Boundaries

- Never calculate, suggest as approved, or silently advance a major version.
- Never execute shell, DLL, dylib, WASM, script, or arbitrary migration code from a release.
- Never rewrite user project source or docs as part of a Hive system representation migration.
- Homebrew and WinGet remain the binary owner. Migration may update only the consumer harness
  after the installed CLI supports the integrity-bound route; it never invokes either package manager or
  replaces their executable.
- On conflict, validation failure, crash, or unsupported route, keep the active generation
  unchanged or use the durable journal for exact recovery.
- Never combine migration with knowledge deletion, suppression, retention GC, or provider APIs.
