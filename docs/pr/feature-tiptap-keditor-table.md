# PR: feature/tiptap-keditor-table

## v0.12.133 - Gantt Chart export shadow 제거

- JPG export 중 preview card shadow를 임시 제거해 export image left edge shadow artifact 제거.
- `.env.example` legacy Supabase fallback key 주석에 deprecated 표기 추가.

## v0.12.132 - Gantt Chart export 설정 추가

- Gantt Chart preview에 column span, aspect ratio, export resolution control 추가.
- category 내부 duplicate task name 저장을 warning dialog와 server action validation으로 차단.
- task title/category duplicate render key 충돌과 timeline label formatting 보강.
## v0.12.131 - Editor table border contrast 조정

- ProseMirror table border를 editor 전용 token으로 분리해 light mode grid를 더 진하게 조정.
- dark mode에서 `--color-border`가 이기지 않도록 explicit `border-color` override 추가.
- KTable border tone과 borderless table cascade 기준 문서화.

## v0.12.130 - Debug DB migration failsafe 추가

- Admin Debug panel에 pending DB migration을 수동 적용하는 failsafe 버튼 추가.
- 관리자 세션 기반 server action으로 Supabase/SQLite refuge migration 실행 경로 제공.
- generated migration catalog가 repo Prettier 설정을 따르도록 generator 보강.

## v0.12.129 - DB migration panel 제거

- Admin sidebar, command palette, dashboard에서 migration tab과 panel render path 제거.
- `/api/run-migrations` 수동 적용 route와 proxy matcher 제거.
- Admin main DB 상태 카드는 유지하고 README에 자동 migration 동작 안내 반영.

## v0.12.128 - SQL 기반 migration catalog 생성

- `supabase/migrations/001_*.sql` 파일들을 migration SQL의 단일 source of truth로 정리.
- `scripts/generate-migrations.ts`가 SQL 파일을 검증해 `src/lib/migrations.ts`를 build/dev 전에 생성하도록 추가.
- Vercel runtime은 파일 시스템 SQL 읽기 없이 생성된 TS catalog로 autonomous migration을 실행.

## v0.12.127 - Remove legacy ColoredTable

- Remove `ColoredTable` / `FoliumTable` frontend component mapping, editor node, table extension, and color sync client component.
- Remove `::colored-table` / `::folium-table` directive conversion and rendered colored-table cleanse paths.
- Remove colored-table-only CSS, MCP schema guidance, prompt template usage, and related unit tests.

## v0.12.126 - Rendered table MDX cleanse

- Automatically restores saved `colored-table-wrapper` HTML back to canonical `<ColoredTable ... />` JSX.
- Normalizes raw `class` / `colspan` / `rowspan` HTML attributes before MDX render and editor saves.
- Prevents `$0` and `$0.01` inside HTML table cells from being interpreted by remark-math/KaTeX.
- Applies one shared cleanse path to frontend rendering and `RichMarkdownEditor` initial load/source/update flows, with regression tests.

## v0.12.125 - RichMarkdownEditor setContent flushSync 경고 제거

- source mode 종료 후 Tiptap `setContent`를 React effect 본문에서 직접 실행하지 않도록 timer task로 지연.
- 빠른 mode 재전환과 unmount 시 예약 작업을 정리해 stale editor update 방지.
- `flushSync was called from inside a lifecycle method` browser 경고 원인 제거.

## v0.12.124 - v0.12 이후 Supabase 단일 migration script 추가

- `src/lib/migrations.ts` / MigrationsPanel 기준으로 v0.12.0 이후 DB migration SQL을 단일 파일로 정리.
- `admin_login_attempts` 테이블 생성과 `resume_data` 영문 row 제거 migration을 순서대로 포함.
- v0.12.0 이전 DB에는 `migration-whole.sql`을 사용하도록 guard와 주석 추가.

## v0.12.123 - Supabase modern key 전환 지원

- Supabase client와 maintenance script가 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` 를 우선 사용하도록 변경.
- 기존 `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 는 전환용 fallback 으로 유지.
- README, `.env.example`, SQLite refuge 문서에 Vercel env 교체와 legacy cleanup 안내 반영.
- modern key 우선순위와 legacy fallback 회귀 테스트 추가.

## v0.12.122 - KTable dark mode 색상 채도 완화

- dark mode custom cell 색상을 고채도 Tailwind 계열 hex에서 저채도 `oklch()` muted palette로 조정.
- light mode 색상 선택 목록과 저장값은 그대로 유지.
- `data-tw-color` 대비 로직 문서를 muted dark palette 기준으로 갱신.
- OmX 포함 모든 agent co-author trailer 금지 규칙과 hook 충돌 시 commit 절차 문서화.

## v0.12.121 - RichMarkdownEditor KTable 편집 추가

- original Tiptap `RichMarkdownEditor`에 KTable 삽입/편집 toolbar 통합.
- table/row/column 조작, merge/split, border toggle, header toggle, 셀 색상과 정렬 지원.
- markdown HTML에 `data-ktable`, `data-tw-color`, `data-text-align` attribute 보존.
- editor와 frontend 양쪽에서 KTable border, 배경, light/dark 대비 CSS 공유.
- unit/E2E 회귀 테스트와 `data-tw-color` 대비 로직 문서 추가.

