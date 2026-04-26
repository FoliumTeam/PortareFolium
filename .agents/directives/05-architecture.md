# 05. Architecture & Pitfalls

## File location conventions

모든 plan, PR body, working note, vendored source 는 정해진 경로에서만 관리한다. repo root 에는 `.md` 파일을 새로 만들지 않는다 (whitelist: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `README.md`).

| Kind                      | Location                                                                      | Tracked? | Notes                                |
| ------------------------- | ----------------------------------------------------------------------------- | -------- | ------------------------------------ |
| Active plan               | `docs/plans/active/<slug>.md`                                                 | ❌       | kebab-case slug, `PLAN_` prefix 금지 |
| Archived plan             | `docs/plans/archive/<slug>.md`                                                | ❌       | 완료/보류 시 active → archive 이동   |
| PR body per branch        | `docs/pr/<branch-name>.md`                                                    | ❌       | branch 의 `/` 는 `-` 로 치환         |
| Working TODO              | `docs/TODO.md`                                                                | ❌       | 단일 파일, task 진행 추적            |
| Operator notes            | `docs/USER_TASKS.md`                                                          | ❌       | 운영자가 직접 처리할 항목            |
| Vendored 3rd-party source | `vendor/<package>-<version>/`                                                 | ❌       | 예: `vendor/keditor-0.7.21/`         |
| Shared agent directives   | `.agents/directives/` (canonical) + `.agents/directives/omc/` (sync snapshot) | ✅       | OMC 는 `.claude/rules/` 갱신         |
| Shared prompt templates   | `.agents/prompts/`                                                            | ✅       | 재사용 prompt 본문                   |
| Prompt reference assets   | `.agents/prompt-assets/`                                                      | ❌       | 이미지 등 참고 자산                  |

폴더가 의미를 담당한다 — 예전 `PLAN_*.md` / `PR_*.md` prefix 컨벤션은 폐기됨.

## Project Structure

**Project:** `portare-folium` — Next.js 16 App Router 기반 개인 포트폴리오 사이트
**Stack:** Next.js 16 (App Router) + React 19, Tailwind CSS v4, Supabase (PostgreSQL) + SQLite refuge fallback, Cloudflare R2, Vercel, pnpm 10, Vitest/Playwright, NextAuth v5, Tiptap, MCP.

## Key Conventions

- **Server Component**: 데이터 fetch + 정적 렌더링.
- **Client Component** (`"use client"`): 인터랙션 필요한 컴포넌트 (모든 admin 패널).
- `serverClient`: service_role 키 — API route / Server Component 전용. 절대 클라이언트 번들 포함 금지. `.local/refuge/mode.json` 이 `sqlite-refuge` 이고 local/dev runtime gate가 열릴 때는 supported table read/write 를 로컬 SQLite refuge client 로 라우팅. local `next start`에서는 `SQLITE_REFUGE_ALLOW_LOCAL_START=local-dev-only` opt-in이 필요.
- **SQLite refuge admin bypass**: 로컬 복구 전용. `.env.local` 의 `SQLITE_REFUGE_ADMIN_BYPASS=local-dev-only` + localhost + active refuge mode 에서만 admin session 을 자동 활성화하며 Vercel 배포 환경에서는 금지. `SQLITE_REFUGE_ALLOW_LOCAL_START`도 Vercel에 등록 금지.
- `browserClient`: anon 키 + RLS — Client Component 전용.
- **DB 마이그레이션**: `src/lib/migrations.ts`의 `MIGRATIONS` 배열로 관리. 서버 시작 시 자동 실행.
- **컬러 스킴**: 21개 런타임 전환 가능. `data-color-scheme` attribute 기반, DB 저장 (localStorage 미사용).
- **Admin 저장 바**: `AdminSaveBar.tsx` — `createPortal`로 `#admin-save-bar-slot`에 렌더링.
- **페이지 레벨 ISR**: 모든 콘텐츠 페이지 `export const revalidate = false`. On-Demand `revalidatePath`로만 갱신.

## PDF Export (`data-pdf-block`) Convention

- `PdfPreviewModal.tsx`의 `paginateBlocks()`가 `data-pdf-block` / `data-pdf-block-item` attribute를 기준으로 페이지 분할 처리.
- **모든 시맨틱 블록**(`<section>`, `<header>`, `<article>`, 개별 entry `<div>`)에 `data-pdf-block` 추가 필수.
- **grid 카드**에는 `data-pdf-block-item` 사용.
- 부모/자식 중첩 시 부모는 자동으로 pagination 제외.
- **프리뷰 overlay 규칙**: 페이지 구분선은 반드시 `previewRef` DOM 외부에 absolute-positioned overlay로 렌더링. dashed line 위쪽에 배치할 것.

## Known Pitfalls

- **`unstable_cache` 클로저 패턴 금지**: `unstable_cache(() => fn(arg), [key])()` 사용 금지. 모듈 레벨에서 `const cached = unstable_cache(fn, ['key'])` 선언 후 호출.
- **`renderToString` 컨텍스트에서 `next/image` 금지**: MDX 렌더링 시 plain `<img>` (`MarkdownImage`) 사용.
- **MDX 콘텐츠 내 `next/image` import**: `renderMarkdown`에서 정규식으로 제거하고 `components`에 등록해 대체.
- **JSX 속성값의 `[`/`]` backslash-escape**: tiptap-markdown 이슈. `getCleanMarkdown`, `mdx-directive-converter.ts` 등을 통해 unescape 처리 필수.
- **JSX 속성값의 `$` 가 inline math로 오인되는 문제**: split 정규식(`/(```[\s\S]*?```|<[A-Z]\w*[\s\S]*?\/>|\$\$[\s\S]*?\$\$|\$(?!\$)[^
$]+?\$)/g`)에 self-closing JSX 태그 패턴 포함 필수.
- **MDX 렌더 에러 진단**: `src/lib/markdown.tsx`의 catch 블록 확인.

## MCP Agent Guide

**Endpoint:** `https://gvm1229-portfolio.vercel.app/api/mcp`
**인증:** `Authorization: Bearer <token>` 헤더 필수.

- **Protocol**: JSON-RPC 2.0.
- 진입 시 반드시 `method: "tools/list"` 먼저 호출.
- `job_field`는 `"web"` 또는 `"game"`.
- `published: false`가 기본값. 명시적 요청 없이 `true` 설정 금지.
- 긴 `content`는 파일로 작성 후 `fs.readFileSync`로 읽어 전달.
- `update_resume` 호출 전 `get_resume`으로 전체 데이터 확인 후 deep-merge.
