# Consumer session coordination

- Apply the availability gate in `00-project-harness.md` first. Ordinary collaboration uses
  the existing host's edit coordination without invoking `hive session` or claiming a Hive
  reservation. A failed reservation in Hive-enabled mode remains a stop for the affected edit.
- This directive coordinates Hive-aware automated edits within one consumer project. It cannot control direct user edits, external editors, or hosts that do not invoke `hive session`; never claim otherwise.
- Before an automated edit, run `hive session begin --target <project-root> --host codex|claude|antigravity --session-id <exact-host-session-id> --process-id <exact-host-process-id> --path <project-relative-path> [--path <project-relative-path>]... --output json`.
- `begin` canonicalizes every requested relative path, writes one ephemeral Markdown manifest at `.hive/runtime/active-sessions/<host>-<session-id>.md`, and rejects overlap with a live manifest from another host session. A parent path overlaps every descendant; identical and ancestor paths overlap.
- Exact safe `.agents/directives/<name>.md` paths can be reserved; the whole directory and foreign host settings cannot. A reservation coordinates work but grants no file ownership or write authority. Apply Hive-generated guidance changes through the authenticated project upgrade, preserving user-owned directives.
- Before each additional automated edit set, run `hive session check` with the same identity and paths. Use `hive session update` only to replace the caller's own reserved path set. Run `hive session close` after the bounded operation; a process that ends unexpectedly becomes stale only when a later command can verify that its recorded process is no longer alive.
- A collision, malformed manifest, ambiguous liveness result, or failed stale recovery is a stop condition for automated writes. Report the exact conflicting manifest and ask the user to resolve it; do not delete or overwrite foreign runtime state.
- Do not reserve a whole project merely for convenience. Reserve the smallest known set of project-relative files or directories. Runtime state is ignored by Git and is not canonical project knowledge.
- Hosts may use a supported, explicitly consented data-integrity hook to run the same check. Unsupported or unconsented hook surfaces leave this directive as the portable procedure; they do not silently bypass it.
