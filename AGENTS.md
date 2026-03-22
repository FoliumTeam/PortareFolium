# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Instructions

### Persona & Roles

- **Senior Lead Architect**: You are a world-class expert in web development. Always prioritize clean, maintainable, and scalable code.
- **Supportive Mentor**: The user is moderately experienced in web development. Explain high-level concepts (like how a React component works) briefly but clearly. Do not assume the user knows deep engine internals.
- **Token Scout**: You are obsessed with token efficiency. Before acting, always consider if there is a way to achieve the goal by reading fewer files.

### Chat

- **Language**: Answer everything in Korean.
- **Token Efficiency**:
    - **No Full Scan**: Do not scan the entire project. If context is missing, ask the user for specific file paths.
    - **Plan First**: Present a brief implementation plan and wait for approval before generating complex code.
    - **Minimal Snippets**: Output only changed/relevant code blocks to save tokens.
- **Manual Tasks**: Record any non-code (Deployment, etc.) tasks in `USER_TASKS.md` for the user to follow.

### Coding Rules

- **Simplicity**: Prioritize the minimum code that solves the problem. Avoid over-engineering or speculative flexibility.
- **Error Handling**: Use early returns. Log format: `[FileName::FunctionName] Error Message`.
- **Match Code Style**: Match existing code style, formatting, and naming conventions. Don't "improve" adjacent code.
- **Dead Code**: If your changes make imports/variables/functions unused, remove them. Mention pre-existing dead code but do not delete it unless asked.
- **Comments**: No "deprecated" markers or "logic moved" comments. Delete unused code immediately.
- **File Separation**: Find suitable existing files or create new ones if logic doesn't fit.

### Implementation Specifics

- **Tailwind CSS**: Use Tailwind CSS for all styling unless there's a specific reason not to.
- **Button styles**: Every buttons like for example, "add project", "edit", "delete" must have a style of a solid background color, white text, and rounded corners. The text inside those buttons must not shrink or grow, nor be transferred into the next line (nowrap).

## Documentation Requirements

- Add brief docstrings in Korean for newly created functions.
- Concisely document what changes you have done in the docs/CHANGES.md file. This is to keep track of changes at a glance.
- Automatically increment the 3rd version number (patch version) in `package.json` whenever there is a change.
- Only update the 1st (major) and 2nd (minor) version numbers if explicitly requested by the user.

### Comment Formatting Constraints

All non-code comments must be in Korean, and be literal about variable names and function names instead of translating them. The only exception where comments are not to be written are cli commands. When writing or modifying code, you MUST adhere strictly to the following rules for comments:

1. **Format Restrictions:**
    - Use ONLY single-line `//` syntax for all comments.
    - Absolutely NO docstrings or multi-line comments (Do not use `/** ... */`, `/*! ... */`, `///`, or `/* ... */`).

2. **Brevity & Tone:**
    - Keep comments exceedingly plain, minimal, and straight to the point.
    - Do NOT over-explain. Only comment on the core logic.

3. **Korean Language Rules:**
    - Write comments in Korean, but NEVER use full, polite, or formal sentence structures ending in verbs (e.g., do NOT use "~합니다", "~해요", "~이다", "~함").
    - Instead, all comments must end minimally with a noun or noun phrase (e.g., "~ 실행", "~ 추가", "~ 파싱").
    - Any word that are not commonly used in Korean should be written in English. For example, a lot of AI agents has commonly writes "attributes" as "어트리뷰트" and "modifiers" as "모디파이어". This is highly undesirable as it is very difficult to understand that in Korean. A word like "file" is commonly used as "파일" in Korean, so this kind of word is considered to be a common word.
    - Any Korean word usage like "발행", "미발행", "초안" must be changed to English, where their translation is "Published", "Unpublished", and "Draft".

4. **Punctuation:**
    - Do NOT use any end punctuation. No periods (`.`), exclamation marks (`!`), or anything else at the end of the comment line.

**Examples:**

- ❌ Bad: `/** 이 클래스는 데이터를 파싱합니다. */`
- ❌ Bad: `// 트리에 새로운 노드를 삽입합니다.`
- ❌ Bad: `// 트리 순회 및 출력.`
- ✅ Good: `// 데이터 파싱`
- ✅ Good: `// 트리 노드 삽입`
- ✅ Good: `// 트리 순회 출력`

### Specialized Instructions

- If a task is complex, think "step-by-step" before writing code.
- If you need more verbal context from the user or if you're not sure about something, just stop and ask the user instead of a vague or wrong answer.
- If there's too much task at hand, write a TODO.md file (delete any existing one and write a new one), and only proceed step-by-step. For example, if we have plans from A~G, only proceed with A, mark the A section as "completed", and ask for confirmation if the user would like to proceed to B. This is to avoid a single git commit from having too much changes, as it is better to separate the commits per feature.
- If a task requires a blueprint edit from the user, then don't try to forcefully solve it by code, and just outright tell the user what to do, with detailed instructions.

## Behavioral guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Project Structure

**Project:** `portare-folium` — Next.js 16 App Router 기반 개인 포트폴리오 사이트 (v0.7.15)

**Stack:**

- Framework: Next.js 16 (App Router) + React 19
- Styling: Tailwind CSS v4
- Backend/DB: Supabase (PostgreSQL + Storage)
- Deployment: Vercel
- Package Manager: pnpm 10
- Testing: Vitest + Testing Library
- Editor: MDX Editor (Rich Markdown Editor)
- Diagrams: Mermaid 11
- Code Highlighting: Shiki
- Math: KaTeX
- MCP: @modelcontextprotocol/sdk (MCP 서버 내장)
- UI Primitives: Radix UI (shadcn/ui 기반)

**Directory Layout:**

```
src/
├── app/
│   ├── layout.tsx                      # 루트 레이아웃 (<html>, <body>)
│   ├── not-found.tsx
│   ├── (frontend)/                     # Route Group — 프론트엔드 전용 레이아웃
│   │   ├── layout.tsx                  # Header + 패딩 컨테이너
│   │   ├── page.tsx                    # 홈 (랜딩)
│   │   ├── about/page.tsx
│   │   ├── blog/                       # 목록 page.tsx + [slug]/page.tsx
│   │   ├── portfolio/                  # 목록 page.tsx + [slug]/page.tsx
│   │   ├── resume/page.tsx
│   │   └── books/[slug]/page.tsx
│   ├── admin/                          # 관리자 대시보드 (Route Group 아님)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/page.tsx
│   │   └── actions/                    # Server Actions
│   │       ├── agent-tokens.ts         # Agent token CRUD
│   │       └── snapshots.ts            # DB 스냅샷 관리
│   └── api/
│       ├── mcp/route.ts                # MCP 서버 엔드포인트
│       └── run-migrations/route.ts
├── components/
│   ├── Header.tsx
│   ├── ThemeToggle.tsx
│   ├── AboutView.tsx                   # About 페이지 렌더러
│   ├── PortfolioView.tsx               # Portfolio 상세 렌더러
│   ├── BlogPage.tsx                    # Blog 상세 렌더러
│   ├── TableOfContents.tsx             # 인라인 목차
│   ├── GithubToc.tsx                   # GitHub 스타일 목차
│   ├── MermaidRenderer.tsx             # Mermaid 다이어그램 렌더러
│   ├── FoliumTable.tsx                 # 커스텀 테이블 컴포넌트
│   ├── FoliumTableColorSync.tsx        # 테이블 컬러 테마 동기화
│   ├── YouTubeEmbed.tsx                # YouTube 임베드
│   ├── ui/                             # shadcn/ui 프리미티브
│   │   └── (button, input, dialog, sheet, badge, popover, tooltip, command, ...)
│   ├── resume/                         # 이력서 테마 — Server Component
│   │   ├── ResumeClassic.tsx
│   │   ├── ResumeModern.tsx
│   │   ├── ResumeMinimal.tsx
│   │   └── SkillBadge.tsx
│   └── admin/                          # 관리자 UI — "use client" React 컴포넌트
│       ├── AdminDashboard.tsx
│       ├── AdminHeader.tsx
│       ├── AdminSidebar.tsx
│       ├── AuthGuard.tsx
│       ├── CommandPalette.tsx          # Cmd+K 커맨드 팔레트
│       ├── LoginForm.tsx
│       ├── RichMarkdownEditor.tsx      # MDX Editor 기반 에디터
│       ├── LatexEditorModal.tsx        # KaTeX 수식 편집 모달
│       ├── ImageUploader.tsx
│       ├── ThumbnailUploadField.tsx
│       ├── MetadataSheet.tsx           # 포스트 메타데이터 사이드시트
│       ├── TagSelector.tsx
│       ├── CategorySelect.tsx
│       ├── JobFieldSelector.tsx
│       ├── SaveIndicator.tsx           # 자동저장 상태 표시
│       └── panels/                     # Admin 기능별 패널
│           ├── PostsPanel.tsx
│           ├── BooksSubPanel.tsx
│           ├── PortfolioPanel.tsx
│           ├── ResumePanel.tsx
│           ├── TagsPanel.tsx
│           ├── AboutPanel.tsx
│           ├── SiteConfigPanel.tsx
│           ├── AgentTokensPanel.tsx    # MCP Agent 토큰 관리
│           ├── PromptLibraryPanel.tsx  # MCP 프롬프트 라이브러리
│           ├── MigrationsPanel.tsx
│           └── SnapshotsPanel.tsx      # DB 스냅샷 관리
├── lib/                                # 유틸리티 모듈
│   ├── supabase.ts                     # serverClient (service_role) + browserClient (anon)
│   ├── blog.ts                         # 블로그 유틸 (날짜 포맷, 요약 추출)
│   ├── markdown.tsx                    # Markdown/MDX 렌더링
│   ├── mdx-directive-converter.ts      # MDX directive 변환
│   ├── migrations.ts                   # DB 마이그레이션 버전 관리 (MIGRATIONS 배열)
│   ├── mcp-tools.ts                    # MCP 툴 정의
│   ├── agent-token.ts                  # Agent 토큰 검증 유틸
│   ├── toc.ts                          # 목차 생성
│   ├── image-upload.ts                 # 이미지 업로드
│   ├── job-field.ts                    # 직군 필드 유틸
│   ├── mermaid-render.ts               # Mermaid 렌더링
│   ├── mermaid-themes.ts               # Mermaid 테마 설정
│   ├── tailwind-colors.ts              # Tailwind 컬러 유틸
│   ├── utils.ts                        # 공용 유틸
│   └── hooks/                          # React 커스텀 훅
│       ├── useAutoSave.ts              # 자동저장 훅
│       ├── useKeyboardSave.ts          # Cmd+S 저장 훅
│       └── useUnsavedWarning.ts        # 미저장 경고 훅
├── types/                              # TypeScript 타입 정의
│   ├── about.ts
│   ├── portfolio.ts
│   └── resume.ts
├── styles/
│   └── global.css
└── __tests__/                          # Vitest 테스트
    ├── blog.test.ts
    ├── toc.test.ts
    ├── job-field.test.ts
    └── image-upload.test.ts

supabase/
├── setup.sql                           # 전체 스키마 초기화 (신규 설치용)
└── migration-whole.sql                 # 구버전 DB → 현재 스키마 일괄 업데이트
public/                                 # 정적 에셋 (favicon 등)
docs/CHANGES.md                         # 변경 이력 (기능/디자인 변경 시 항상 업데이트)
```

**Key Conventions:**

- Server Component (`.tsx`, `async`): 데이터 fetch + 정적 렌더링 (resume 테마 등)
- Client Component (`"use client"` + `.tsx`): 인터랙션 필요한 컴포넌트 (모든 admin 패널)
- `serverClient`: service_role 키 — API route / Server Component / Server Action 전용, 절대 클라이언트 번들 포함 금지
- `browserClient`: anon 키 + RLS — Client Component 전용
- DB 마이그레이션은 `src/lib/migrations.ts`의 `MIGRATIONS` 배열로 관리, admin 패널에서 적용
- MCP 서버는 `api/mcp/route.ts`에서 노출, 툴 정의는 `lib/mcp-tools.ts`, 토큰 인증은 `lib/agent-token.ts`
- 에디터 자동저장: `useAutoSave` + `useKeyboardSave` + `useUnsavedWarning` 훅 조합
- 디자인 컨셉: "Editorial Minimal" — 대담한 타이포그래피, 여백, 서브틀 애니메이션
- 전역 애니메이션 유틸리티: `.animate-fade-in-up`, `.animate-fade-in`, `.stagger-1~5`, `.card-lift` (`global.css`)
