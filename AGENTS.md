# AGENTS.md

This is the canonical agent manifest for this project. Claude Code, OpenAI Codex, and Google Gemini all read from here.
Directives, prompts, and reference assets live under `.agents/`. Tool-specific config (`.claude/`, `.codex/`, `.gemini/`) only holds tool-local settings.

## User directives (canonical)

Direct edits go here.

- [.agents/directives/01-behavior.md](.agents/directives/01-behavior.md) — Persona, chat rules, autonomous workflow (TODO.md), behavioral guidelines.
- [.agents/directives/02-code.md](.agents/directives/02-code.md) — Coding rules, comment formatting, file naming, testing policy.
- [.agents/directives/03-design.md](.agents/directives/03-design.md) — Design system, Tailwind usage, UI implementation details.
- [.agents/directives/04-workflow.md](.agents/directives/04-workflow.md) — Branch strategy, commit/PR conventions, testing gates, documentation.
- [.agents/directives/05-architecture.md](.agents/directives/05-architecture.md) — Project structure, directory layout, PDF export, pitfalls, MCP guide.
- [.agents/directives/06-security.md](.agents/directives/06-security.md) — Trust boundaries, MDX trust model, R2/route guard-rails, lessons from past security fixes.
- [.agents/directives/07-local-db-content-mutation.md](.agents/directives/07-local-db-content-mutation.md) — Local clone-only DB content mutation workflow, ephemeral MCP token lifecycle, verification boundaries.

## OMC directives (auto-synced from `.claude/rules/`)

Do not edit directly — managed by oh-my-claudecode. `scripts/sync-omc-directives.mjs` mirrors `.claude/rules/` (gitignored) into `.agents/directives/omc/` (tracked snapshot) on `pnpm install` and pre-commit.

- [.agents/directives/omc/coding-style.md](.agents/directives/omc/coding-style.md)
- [.agents/directives/omc/git-workflow.md](.agents/directives/omc/git-workflow.md)
- [.agents/directives/omc/karpathy-guidelines.md](.agents/directives/omc/karpathy-guidelines.md)
- [.agents/directives/omc/performance.md](.agents/directives/omc/performance.md)
- [.agents/directives/omc/security.md](.agents/directives/omc/security.md)
- [.agents/directives/omc/testing.md](.agents/directives/omc/testing.md)

User directives take precedence over OMC directives on conflict.

## Other shared resources

- `.agents/prompts/` — reusable prompt templates.
- `.agents/prompt-assets/` — reference images for prompts (gitignored).

## File locations (must follow)

| Kind                      | Location                                      |
| ------------------------- | --------------------------------------------- |
| Active plan               | `docs/plans/active/<slug>.md` (gitignored)    |
| Archived plan             | `docs/plans/archive/<slug>.md` (gitignored)   |
| PR body per branch        | `docs/pr/<branch-name>.md` (gitignored)       |
| Working TODO              | `docs/TODO.md` (gitignored)                   |
| Operator notes            | `docs/USER_TASKS.md` (gitignored)             |
| Vendored 3rd-party source | `vendor/<package>-<version>/` (gitignored)    |
| Shared agent assets       | `.agents/{directives,prompts,prompt-assets}/` |

Never create `.md` at repo root except whitelist (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `README.md`).
Plan slugs use kebab-case without `PLAN_` prefix — folder location encodes status.
Detailed naming and commit policy: see [.agents/directives/04-workflow.md](.agents/directives/04-workflow.md).

## Tool-specific entry points

- Claude Code: this file is auto-loaded. `.claude/CLAUDE.md` is a thin redirect.
- Codex CLI: this file is auto-loaded.
- Gemini CLI: `GEMINI.md` redirects here.

<!-- AIGENT-HIVE:START -->

# Aigent Hive

## Hive

- Read `.agents/directives/00-project-harness.md` for availability, planning, editing, tests, host ownership, and closure.
- Read `.agents/directives/01-project-knowledge.md` for lookup and the agent-reviewed memory gate.
- Read `.agents/directives/02-project-upgrade.md` for setup, refresh, migration, and rollback.
- Read `.agents/directives/03-session-coordination.md` before automated project edits.
- Read `.agents/directives/04-korean-language.md` before Korean output.
- Interface language: `ko`. Prompt language is a separate current-request choice; default English.
- Setup mode: `expedited`. Preference provenance: `global-inherited`.
- Primary host: `codex`. Owner: `host-native`.
- Preserve user bytes outside Hive markers. The host owns model calls; no provider API or credential access.
- Hive Skills missing on this PC: use the installed user plugin or explicitly select project-local Skills; ordinary work remains available.
  <!-- AIGENT-HIVE:END -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
