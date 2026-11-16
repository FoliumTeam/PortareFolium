---
name: poseidon
description: "(poseidon) Assigns roles across several tasks and records handoffs between them. Use only when the user names poseidon, 포세이돈."
---

# Poseidon

<!-- Generated from harness/gods.toml by scripts/generate-gods.py. -->

Use this entry only when the user names poseidon, 포세이돈. Generic task requests use the existing task-specific Skills.

At entry, announce in the user-selected response language: English `Calling upon Poseidon — coordination`; Korean `포세이돈 호출 — 조율`. CLI display prefix: `[Poseidon]`. Preserve JSON stdout; display notices on stderr.

1. Read the project's AGENTS.md and preserve its scope, authority and usage boundaries.
2. Open only the relevant owned Skill: [team-execution](../team-execution/SKILL.md), [run-handoff](../run-handoff/SKILL.md). Follow its procedure; this entry grants no additional authority.
3. Use team-execution for bounded team coordination or run-handoff for role handoff; preserve exact run, authority, receipt and cancellation bindings.
4. Keep model calls and process launch host-owned. New orchestration stays disabled until qualified host receipts, cancellation and reclaim exist.
