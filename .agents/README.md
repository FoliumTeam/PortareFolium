# .agents/

이 폴더는 Claude Code, OpenAI Codex, Google Gemini 가 모두 참조하는 **공유 directive / prompt 폴더**다.
프로젝트 동작 규칙은 모두 여기서 관리한다 — tool 별 폴더(`.claude/`, `.codex/`, `.gemini/`)에는 tool-specific config만 둔다.

## 구조

```
.agents/
├── directives/                # 사용자 custom directive (canonical, tracked)
│   ├── 01-behavior.md
│   ├── 02-code.md
│   ├── 03-design.md
│   ├── 04-workflow.md
│   ├── 05-architecture.md
│   └── omc/                   # OMC 가 관리하는 .claude/rules/ 의 commit snapshot
├── prompts/                   # 실제 prompt 본문 (재사용 template 포함)
└── prompt-assets/             # prompt 작업용 reference 이미지
```

## 편집 정책

- `directives/01-..05-*.md` — 사용자 custom directive. 직접 편집한다.
- `directives/omc/*.md` — **편집 금지**. OMC plugin 이 `.claude/rules/` 를 갱신하면 `pnpm sync-omc` 또는 pre-commit hook 이 자동 동기화한다.
- `prompts/`, `prompt-assets/` — 자유 편집.

## sync 동작

`scripts/sync-omc-directives.mjs` — `.claude/rules/*.md` → `.agents/directives/omc/*.md` 일방향 복사.

실행 시점:

- `pnpm install` (postinstall hook)
- `git commit` (husky pre-commit hook)
- 수동: `pnpm sync-omc`

`.claude/rules/` 자체는 gitignored. OMC 업데이트 후 `.agents/directives/omc/` 만 commit 추적.

## tool 별 인식

| Tool        | 진입점                | 동작                                                                    |
| ----------- | --------------------- | ----------------------------------------------------------------------- |
| Claude Code | AGENTS.md / CLAUDE.md | manifest 따라 user directive 읽음 + OMC 가 `.claude/rules/` 직접 inject |
| Codex CLI   | AGENTS.md (native)    | manifest 따라 user + omc/ 둘 다 ref                                     |
| Gemini CLI  | GEMINI.md → AGENTS.md | 동상                                                                    |

User directive 와 OMC directive 가 충돌하면 user directive 가 우선이다.
