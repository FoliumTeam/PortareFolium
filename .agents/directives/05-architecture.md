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
- **SQLite refuge admin auth**: 로컬 복구 모드에서도 NextAuth credentials 로그인만 사용. 자동 admin session, mode-local secret, proxy 우회 금지. `admin_login_attempts`는 local-only SQLite table로 처리하고 Supabase replay에서 제외.
- `browserClient`: anon 키 + RLS — Client Component 전용.
- **DB 마이그레이션**: `src/lib/migrations.ts`의 `MIGRATIONS` 배열로 관리. 서버 시작 시 자동 실행.
- **컬러 스킴**: 21개 런타임 전환 가능. `data-color-scheme` attribute 기반, DB 저장 (localStorage 미사용).
- **Admin 저장 바**: `AdminSaveBar.tsx` — `createPortal`로 `#admin-save-bar-slot`에 렌더링.
- **공개 경로 ISR**: recruiter 공개 경로는 `revalidate = 3600` 기반 정적 ISR 우선. `revalidate = false`는 캐시 정책 기본값이 아니며, 명시적 무기한 cache·무효화 요구가 있는 독립 경로에만 제한.

## Admin customization contract

- PortareFolium의 핵심 제품 계약: 사용자가 Admin Dashboard 로그인만으로 자신의 사이트에 무엇을 어떤 방식으로 표시할지 결정 가능. 코드 수정, CLI, DB 직접 조작, MCP, AI agent는 사용자 설정의 전제 조건 금지
- 적용 대상: 모든 사용자 노출 정보와 표현 요소. 문구, label, 날짜·숫자 형식, metadata, media, link, section 이름, 항목 순서, 공개 범위, 직무별 내용, layout·design 선택지를 포함
- 모든 사용자 노출 정보는 Admin Dashboard에서 생성·수정·삭제 또는 초기화 가능해야 하며, 개별 표시 여부 제어 필수. 같은 성격의 반복 항목에는 순서 변경 지원 필수
- 표현 방식에 의미 있는 선택지가 존재하면 지원 가능한 형식·layout·design variant를 Admin 설정으로 제공. 디자인 선택은 2~4개의 coherent preset, preview, 추천 기본값 우선. spacing·width·alignment·color 같은 저수준 control은 preset으로 해결 불가한 반복 요구가 있는 경우만 허용
- Frontend component의 사용자 노출 값과 표시 정책 hardcode 금지. 코드 기본값은 초기 fallback으로만 허용하며 Admin에서 override·reset 가능해야 함
- 필수 범위: Resume의 모든 section과 개인 정보, 모든 Portfolio entry, About Me 정보, Blog post, Landing page, navigation·footer의 사용자 노출 정보, 앞으로 추가되는 모든 public content surface
- 신규 기능은 public consumer와 같은 작업 범위에 Admin 입력, 표시 여부, 필요한 순서·preset 기반 표현 설정, 저장·초기화 경로를 포함. Admin 경로 없는 사용자 노출 기능은 미완료 상태
- 민감하거나 선택적인 정보는 값 입력과 공개 여부를 분리. 저장된 값이 있다는 이유만으로 자동 공개하는 동작 금지
- section이 public layout에서 disabled이거나 content가 Draft·Unpublished 상태여도 Admin 편집 경로 유지. 공개 여부와 편집 가능 여부 분리
- 공통 기본값과 직무별 차이가 필요한 정보는 기존 job-field override 구조 사용. 공통값 상속, 독립 override 생성, 공통값 복귀 지원
- 공개 화면과 Admin editor는 같은 DB schema와 source of truth 사용. Admin 누락을 우회하기 위한 중복 data source 금지
- 보안 경계, 권한 검사, 접근성 attribute, semantic markup, routing·cache 규칙, pagination 알고리즘 같은 내부 기술 계약은 코드 관리 대상. 단, 그 결과가 사용자가 선택해야 하는 시각·콘텐츠 표현이면 지원 범위를 Admin 설정으로 노출
- 사용자 노출 정보를 임시 hardcode해야 하는 예외는 구현 전 사용자 승인, 제한된 적용 기간, Admin 설정 후속 계획 필요

## Public route performance contract

- 대상: recruiter가 열람하는 `/`, `/{jobField}`, `/{jobField}/resume`, `/{jobField}/portfolio`, `/{jobField}/blog`와 Published 상세 경로. Admin·API·인증 경로는 별도 security·runtime 계약 적용.
- 공개 route의 build 표시는 `○` 또는 `●` 필수. 공개 경로에 `ƒ`가 남으면 원인·사용자 승인·대체 성능 측정 없이는 배포 불가.
- 알려진 dynamic param은 상위 layout 또는 해당 page의 `generateStaticParams`로 build 시 생성. `jobField`와 `slug` 조합은 공개 DB 상태에서 완전 생성.
- 공개 dynamic segment는 `revalidate = 3600`과 `dynamic = "force-static"` 우선. `dynamicParams = false`는 새 Published content의 runtime 생성이 필요 없는 경우에만 사용.
- 공개 Server Component에서 `auth()`, `cookies()`, `headers()` 또는 관리자 세션 조회 금지. 관리자 전용 표시·조작은 client session 확인 또는 `/admin` 경계로 이동.
- 공개 Supabase query는 요청 간 Data Cache 적용. `unstable_cache`는 모듈 레벨 함수·명시 key·`public-content` tag·1시간 revalidate 조합 사용. `React.cache`만으로 요청 간 cache를 대체하지 않음.
- 공개 content를 변경하는 Admin action·MCP mutation은 관련 `revalidatePath`와 `revalidateTag(PUBLIC_CONTENT_CACHE_TAG, "max")` 동시 호출. 새 mutation 추가 시 적용 route·tag 단위 테스트 추가.
- 목록·landing query는 화면에 필요한 column만 select하고, 독립 query는 `Promise.all`로 병렬화. 공개 목록에서 article body·대형 JSON을 기본 조회하지 않음.
- Vercel Function Region은 Supabase Region과 동일 또는 최인접 위치 유지. 현재 production pair: Northeast Asia (Tokyo).
- fork 기반 Vercel deployment에서는 upstream `main` push 뒤 fork 갱신·deployment 완료 뒤에만 production 결과 판정.
- 공개 route 변경의 필수 검증: `pnpm build`에서 대상 route `○`·`●` 확인, 공개 Chromium runtime error 0개 확인, production에서 첫 요청 `PRERENDER` 또는 `MISS` 뒤 반복 요청 `HIT`와 public `Cache-Control` 확인.

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
- **MDX raw HTML은 browser HTML이 아니라 JSX**: editor가 저장하는 HTML은 MDX evaluate 전에 JSX-safe 해야 함. 특히 KTable HTML은 `<img />` 같은 void tag self-close, `className`/`colSpan`/`rowSpan` 같은 React attribute casing, string `style="..."` 제거가 필수. KTable 관련 저장 또는 render 경로를 변경할 때는 `normalizeKTableMdxHtml` 적용 여부, `docs/logic/ktable-mdx-safe-html.md`, image-in-table/row-height regression test 확인.

## MCP Agent Guide

**Endpoint:** `https://gvm1229-portfolio.vercel.app/api/mcp`
**인증:** `Authorization: Bearer <token>` 헤더 필수.

- **Protocol**: JSON-RPC 2.0.
- 진입 시 반드시 `method: "tools/list"` 먼저 호출.
- `job_field`는 `"web"` 또는 `"game"`.
- Portfolio MCP create·update는 저장 즉시 Published한다. Post는 명시적 Published 설정을 유지한다.
- 긴 `content`는 파일로 작성 후 `fs.readFileSync`로 읽어 전달.
- `update_resume` 호출 전 `get_resume`으로 전체 데이터 확인 후 deep-merge.
