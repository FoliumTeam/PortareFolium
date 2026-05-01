# PR: feature/tiptap-keditor-table

## v0.12.127 - Remove legacy ColoredTable

- Remove `ColoredTable` / `FoliumTable` frontend component mapping, editor node, table extension, and color sync client component.
- Remove `::colored-table` / `::folium-table` directive conversion and rendered colored-table cleanse paths.
- Remove colored-table-only CSS, MCP schema guidance, prompt template usage, and related unit tests.

## v0.12.126 - Rendered table MDX cleanse

- Automatically restores saved `colored-table-wrapper` HTML back to canonical `<ColoredTable ... />` JSX.
- Normalizes raw `class` / `colspan` / `rowspan` HTML attributes before MDX render and editor saves.
- Prevents `$0` and `$0.01` inside HTML table cells from being interpreted by remark-math/KaTeX.
- Applies one shared cleanse path to frontend rendering and `RichMarkdownEditor` initial load/source/update flows, with regression tests.

## v0.12.124 - RichMarkdownEditor setContent flushSync 경고 제거

- source mode 종료 후 Tiptap `setContent`를 React effect 본문에서 직접 실행하지 않도록 timer task로 지연.
- 빠른 mode 재전환과 unmount 시 예약 작업을 정리해 stale editor update 방지.
- `flushSync was called from inside a lifecycle method` browser 경고 원인 제거.

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
