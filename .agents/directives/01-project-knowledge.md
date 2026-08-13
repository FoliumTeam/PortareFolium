# Project knowledge boundary

- Keep project canonical knowledge under `.hive/knowledge/{Raw,Wiki,Schema}`.
- Treat `.hive/index/hive.sqlite3` as a disposable local projection.
- When the installed harness reports Wiki enabled, run agent-reviewed task-fact autocapture before
  the final response for material work that created or substantially revised reusable knowledge.
- Capture a bounded outcome, tool or project used, creation or acceptance criteria, and
  originating request summary from the current authorized task and reviewed Git-suitable
  artifacts. Preserve exact request text only after explicit retention intent and safety review.
- Use `hive knowledge ingest` and the installed schema; identical input is an idempotent no-op.
- Never autocapture an editless/simple question, raw transcript, complete conversation, hook
  payload, tool output, hidden prompt, cache, database, or runtime state.
- Do not capture when Wiki is disabled. Preserve existing canonical Markdown until an explicit
  destructive deletion request.
- Query project knowledge before user-scope knowledge and show provenance for both.
- Promote only a reviewed project-neutral fact, reusable preference, or portable workflow.
- Never promote confidential, credential-adjacent, customer, private-path, or project-exclusive content.
- Keep suppression, contradiction, replacement, and source-digest evidence with the canonical Markdown.
