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

Project: `portare-folium`
Profile: `general`
Setup mode: `expedited`
Preference provenance: `global-inherited`
Interface language: `ko`
Wiki: `enabled` (backend=`markdown`, language=`both`)
Persona: `strict`
Primary host: `codex`
Resolved orchestration owner: `host-native`
Resolution evidence: `sha256:5aa340049036a103b4b23f5b91795921baffc724d74db120edd7c9259850e41d`

- Read canonical Hive configuration from `.hive/config/harness.toml`.
- Before editing anything, read `.hive/directives/00-editing-discipline.md` in full. Apply all four sections as the highest-priority editing discipline within the Hive contract; never compact, summarize, omit, or substitute any part. Its literal `# CLAUDE.md` heading is original text, not Claude-only scope: the directive applies identically on Codex, Claude, and Gemini Antigravity. Higher-priority instructions and Hive security, ownership, credential, and production boundaries still control.
- Immediately before each new automatic dispatch, run `hive usage enforce --target <project-root> --session-id <exact-current-host-session-id> --process-id <exact-current-host-process-id> [--account-digest <active-account-digest>] --output json`. Do not run `enforce` for ordinary quick-answers, manual work, or other non-dispatch actions. The account digest may be omitted only when the qualified local sensor exposes exactly one unambiguous account. A current halt marker takes priority; exit `3` blocks that automatic dispatch. Exit `0` is only a session-bound preflight and never authorizes dispatch. Automatic dispatch requires a separate `hive run resume --dispatch-intent automatic` result with `data.usage_guard.enforced=true`, `outcome=authorized`, one authorization ID, and exactly one dispatch brief. A confirmed current-session disable bypasses this preflight but does not authorize dispatch. Non-Codex automatic dispatch fails closed until a qualified local sensor exists. Never transfer an override or halt marker to another host, session, or process. Recognize obvious threshold/off/on intent by meaning rather than a finite phrase list. A bare continue, resume, finish, urgency, or active run never authorizes bypass.
- Load only the directives and knowledge required by the current request.
- When Wiki is enabled, run at most one bounded `hive knowledge retrieve` before question, research, design, plan, debug, or implementation work. Skip retrieval during usage-guard or setup control, when Wiki is disabled, for acknowledgment-only or context-free requests, or after the current turn already performed the lookup.
- For a simple question, do not spawn agents or edit files. Load canonical memory only through that bounded retrieval preflight when the question needs project or user context.
- Route explicit prompt authoring or improvement intent, and ordinary work with material ambiguity, to `aigent-hive:prompt-refine` in `refine-only` mode unless the same request explicitly uses `--run`. Refine-only returns a digest-bound `awaiting-approval` state.
- Before exact approval of the current refined-prompt digest, do not read the project, call tools, write files, create runs, capture memory, spawn subagents, or execute the task. Do not automatically refine sufficiently clear ordinary work, simple or editless questions, explicit unrelated Skills, or explicit external workflows.
- Unless the user explicitly opts out for the current request, write every plan to an appropriate project Markdown file before presenting or executing it. Never mirror the persisted plan one-for-one in the session; reference it with a concise summary and file path, or provide the file path alone for extensive review.
- Before presenting pending actions or a user handoff, complete every safe, in-scope, automatable action that does not require new user authority, credentials, a protected external mutation, or a materially different product decision. Then give only the genuinely user-owned actions as a concise ordered guide with each exact location, command or operation, expected result or return evidence, and reason user authority is required. List failed or impossible work separately with its cause and recovery path.
- For “all todos”, “until completion”, “do not stop”, or an equivalent terminal request, continue while any in-scope agent-owned inspection, fix, verification, commit, permitted push, CI observation, or authorized publication remains. A progress report naming such work must not end the task. Before a final response, classify every remaining item as `agent-owned`, `awaiting-user-authority`, `awaiting-external-evidence`, or `blocked`; only no `agent-owned` work permits completion.
- Keep durable role identity in `.hive/team/roles/`; the active host owns sessions and subagents.
- Keep durable knowledge in Markdown. Treat `.hive/index/*.sqlite*` as disposable.
- Before the final response on every Wiki-enabled turn, perform agent-reviewed classification of current authorized user statements and outcomes as a reusable task fact, preference, or workflow. Record the bounded outcome, tool or project, criteria, and originating request summary. When reusable, run `hive knowledge remember`, require its canonical-write receipt, and only then finish. After a successful write, use `hive source-wiki lint` only for a valid source workspace; otherwise use `hive knowledge lint` against the enabled registered project, or against `user-root` when the current project is unregistered. Missing project setup, a project marker, or an attached collection never skips lint. Never write raw transcripts, secrets, ambiguous or ephemeral content, or confidential content without its exact authorized scope.
- Use the selected interface language `ko` for every question and response unless the user explicitly requests another language for the current response. A message written in another language does not by itself change this preference. In Korean, keep English only for proper nouns, product or package names, commands, code identifiers, paths, schema keys, exact UI labels, and terms without a clear Korean equivalent; replace ordinary English nouns with Korean. In English, write the full passage in English except for exact Korean names, literals, quotations, or text the user explicitly asks to preserve.
- Explain in simple terms by default. Use concrete examples when they materially improve understanding, but do not force irrelevant examples or weaken technical precision.
- Present every user-facing list as a readable Markdown list or table with one complete item per line. Never pack independently selectable options or unrelated items into comma-separated prose.
- Write human-readable project documents in concise Korean unless the user explicitly requests another language. Prefer short headings, bullets, tables, checklists, and semantic noun phrases.
- Do not end authored explanatory Korean prose with declarative or conversational forms. `~다`, `~한다`, `~된다`, `~이다`, `~있다`, `~없다`, `~않는다`, `~했다`, `~됐다`, `~합니다`, `~됩니다`, and `~해요` are non-exhaustive prohibited examples.
- Do not mechanically change those endings to `~음` or the attached `~ㅁ` form. This includes Korean stems, mixed English-Korean forms, state labels followed by a copula, and possibility clauses. Rewrite the full clause: avoid `Release 계약이 구현됐다.` and `Release 계약이 구현됐음.`; use `Release 계약 구현 완료`. Avoid `API key를 요청하거나 저장하지 않는다.` and `API key를 요청하거나 저장하지 않음.`; use `API key 요청·저장 없음`.
- Exact bad → good examples (not exhaustive): `Aigent Hive는 provider-neutral 로컬 agent harness다.` → `Aigent Hive: provider-neutral 로컬 agent harness`; `Product version은 0.7.0이다.` → `Product version: 0.7.0`; `Release 계약이 구현됐다.` → `Release 계약 구현 완료`; `API key를 요청하거나 저장하지 않는다.` → `API key 요청·저장 없음`; `이 기능을 사용합니다.` → `기능 사용`; `다음 단계에서 검증해요.` → `다음 단계: 검증`; `검증이 필요합니다.` → `검증 필요`; `업데이트가 완료되었습니다.` → `업데이트 완료`; `Release 계약이 구현됐음.` → `Release 계약 구현 완료`; `API key를 요청하거나 저장하지 않음.` → `API key 요청·저장 없음`.
- Mechanical nounization examples (not exhaustive): `Status는 INDETERMINATE다.` → `Status: INDETERMINATE`; `문서를 읽음.` → `문서 확인`; `작업이 끝남.` → `작업 완료`; `연결이 닫힘.` → `연결 종료`; `설정 값을 가짐.` → `설정 값 보유`; `정책을 따름.` → `정책 준수`; `compile됨.` → `compile 완료`; `검증할 수 있음.` → `검증 가능`; `검증할 수 없음.` → `검증 불가`.
- Do not use conversational imperative endings such as standalone `~줘` or attached `~해` in authored explanation. Exact user-prompt or UI-prompt samples require the path, line, reason, and exact line digest exception. Examples: `문서를 보여 줘.` → `문서 확인 요청`; `기능을 사용해.` → `기능 사용 요청`.
- Never gain brevity by removing a qualifier needed to interpret a result. For every passed, failed, skipped, deferred, unverified, or unsupported item, name the affected scope, exact reason, relationship to the current host or platform, whether it actually ran, and what the result does and does not prove. Do not use a platform adjective such as "Windows-only" or "Unix-only" without stating whether the current platform ran or skipped that item and why.
- Apply the same rule to authored callouts and blockquotes. Blockquote syntax is not proof of an exact quotation. Preserve narrative-form text only for an exact external quote, UI prompt, protocol sample, fixture payload, or another byte-sensitive literal with an explicit path, line, reason, and exact line digest.
- Do not call model-provider APIs or request provider API credentials.
- Require explicit approval before activating optional Skills.
- Start every new v0.9 run with verified host-native capabilities. Use OMX or OMC only when the user explicitly selects that external compatibility layer before the run starts. Preserve the owner already pinned by an existing run, including a 0.8.x OMX/OMC owner, and never switch owners mid-run.
- Treat OMX/OMC cancellation output as auxiliary evidence only; it never substitutes for the bound usage halt marker or durable goal/task state.
- Treat optional Hive hooks as data-integrity guards only. They require a supported host-native hook surface plus exact capability, event, path, command, and digest consent, and they remain absent for an explicitly selected external owner.
- Never use a fallback hook for prompt classification or rewriting, Skill activation, memory ingestion, subagent orchestration, or continuation. A `Stop` hook always returns a neutral allow result.
- Preserve user text and third-party marker blocks outside this Hive block.
  <!-- AIGENT-HIVE:END -->
