# Explicit source ingest

Read only for an explicitly selected source-ingest request.

## Explicit source ingest

1. Confirm the source is explicitly selected or created by the current authorized task, bounded,
   non-confidential, and suitable for tracking.
2. Prepare an agent-reviewed Wiki Markdown draft that follows the installed knowledge schema and
   includes bounded outcome, criteria, and normalized provenance.
3. Run:

   ```text
   hive knowledge ingest --target <project-root> --user-root <user-root> --source <source-file> --wiki <reviewed-wiki-draft> --output json
   ```

4. Require a schema-valid success result and report its changed paths and evidence digest.
5. Run `hive knowledge lint --target <project-root> --user-root <user-root> --output json`.
6. If the result returns `data.graph_update.state=pending`, follow the main Skill's automatic
   derived relationships procedure for one bounded batch. Preserve the ingest success receipt;
   never call `remember` again for these derived relationships.
