---
name: hephaistos
description: "(hephaistos) Implements a saved plan and cleans up the resulting code. Use only when the user names hephaistos, 헤파이스토스, Hephaestus."
---

# Hephaistos

<!-- Generated from harness/gods.toml by scripts/generate-gods.py. -->

Use this entry only when the user names hephaistos, 헤파이스토스, Hephaestus. Generic task requests use the existing task-specific Skills.

At entry, announce in the user-selected response language: English `Calling upon Hephaistos — implementation`; Korean `헤파이스토스 호출 — 구현`. CLI display prefix: `[Hephaistos]`. Preserve JSON stdout; display notices on stderr.

1. Read the project's AGENTS.md and preserve its scope, authority and usage boundaries.
2. Open only the relevant owned Skill: [code-polish](../code-polish/SKILL.md), [custom-subagent-create](../custom-subagent-create/SKILL.md), [ship](../ship/SKILL.md). Follow its procedure; this entry grants no additional authority.
3. Follow the saved implementation plan and required checks. Use code-polish only for selected code review or cleanup, and ship only for verified focused commits.
