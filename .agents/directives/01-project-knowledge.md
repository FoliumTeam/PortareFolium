# Project knowledge boundary

- Apply the availability gate in `00-project-harness.md` first. Ordinary collaboration skips
  Hive lookup, capture, indexing, and lint; leave canonical knowledge unchanged. Read existing
  Markdown only as project documents and never claim a CLI operation succeeded.
- Keep project canonical knowledge under `.hive/knowledge/{Raw,Wiki,Schema}`.
- When Wiki is enabled, Hive knowledge replaces host memory: record a fact you would otherwise keep
  in the host's own memory as canonical Markdown here, never as a second copy in host memory. Use
  user-root knowledge only for a fact that applies beyond this project, under the promotion rules
  below. With Wiki disabled, say so and suggest enabling it; only then may host memory keep the fact.
- Use the configured user-root shared SQLite index as a disposable projection. A project-local
  `.hive/index/hive.sqlite3` belongs only to historical compatibility, not current setup.
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
