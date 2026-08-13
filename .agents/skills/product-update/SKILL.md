---
name: product-update
description: Run the authenticated interactive Hive binary updater or verify, dry-run, and activate a local integrity-bound project release when the user explicitly requests a Hive update; never use for ordinary dependency updates, publication, or knowledge deletion.
---

# Hive Update

Use only the installed Hive CLI. Do not recreate release verification, migration, backup, or
activation logic in shell or host instructions.

## Workflow

1. For a global Hive binary update, run only `hive update` in the user's interactive terminal.
   The CLI checks the npm `test` distribution, authenticates the current npm or direct-install
   owner, shows the exact operation in the selected language, and requires explicit confirmation.
   Do not quick-answer the confirmation on the user's behalf.
2. For a project harness update, run `hive update --help`. If unavailable, report the installed
   release as unsupported.
3. Require a local extracted release bundle obtained through npm registry integrity or a verified
   GitHub artifact attestation. Do not download, trust, or execute a release script inside this Skill.
4. Run a dry-run first:

    ```text
    hive update --target <project-root> --bundle <release-dir> --dry-run --output json
    ```

5. Show the exact source/target version, release manifest digest, plan digest, planned
   manifest-owned paths, migration route, and package-manager boundary.
6. Apply only after the requested update and exact dry-run plan remain current:

    ```text
    hive update --target <project-root> --bundle <release-dir> --apply --output json
    ```

7. Accept success only when local artifact lengths and SHA-256 values, downgrade refusal,
   version/classification policy, migration route, backup, staged validation, activation,
   installed parity, and disposable-index rebuild all pass.
8. On an interrupted transaction, run only:

    ```text
    hive update --target <project-root> --recover --output json
    ```

## Boundaries

- Preserve user-authored project files, docs, canonical Markdown/YAML/TOML, foreign host
  entries, `.omx/`, and `.omc/` bytes.
- Never treat SQLite, runtime state, cache, or backup bytes as migration authority.
- Never combine update with knowledge delete, suppression, or garbage collection.
- Never generate, read, store, or invoke a release private key or model-provider credential.
- Never reconstruct the binary update command, choose another install owner, or invoke a package
  manager directly. The authenticated CLI may delegate only to its exact current install owner
  after the user's confirmation.
- Homebrew and WinGet own their binaries; Hive may update the harness only after the installed
  CLI supports the signed route.
- A breaking release requires an exact user-supplied target and a separate bound human
  confirmation. Never infer a major version.
