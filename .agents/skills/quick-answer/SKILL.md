---
name: quick-answer
description: Answer a self-contained question after required usage and knowledge gates, without project inspection, external research, multi-step work, or mutation. Preserve reusable user statements only through the separate memory gate.
---

# Hive Simple Question

Answer directly after the required pre-quick-answer gates complete.

## Isolation

- Do not read project files, run state, or role state. Use only the single bounded retrieval result
  already produced by `$aigent-hive:knowledge-recall`, if any.
- Never read project memory or the Wiki directly, invoke a subagent, or begin orchestration.
- Do not call another tool, access current external data, launch another worker, or start a run.
- Do not create or modify project files or capture the quick-answer as knowledge.
- If the user's own message contains a durable reusable preference, fact, or workflow, let the
  separate `$aigent-hive:knowledge-capture` completion gate review only that statement. Ordinary
  questions, greetings, acknowledgements, quick-answers, and agent inference remain write-free.
- Keep the quick-answer proportionate to the question.

## Boundary

If an accurate quick-answer depends on repository state, fresh external data, mutation, or multi-step execution:

1. Do not inspect, transition, or write automatically.
2. State briefly that the request is outside the isolated simple-question path.
3. Suggest the narrow owning action without starting it.
