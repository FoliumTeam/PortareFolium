# PR: feature/tiptap-keditor-table

## v0.12.122 - KTable dark mode 색상 채도 완화

- dark mode custom cell 색상을 고채도 Tailwind 계열 hex에서 저채도 `oklch()` muted palette로 조정.
- light mode 색상 선택 목록과 저장값은 그대로 유지.
- `data-tw-color` 대비 로직 문서를 muted dark palette 기준으로 갱신.

## v0.12.121 - RichMarkdownEditor KTable 편집 추가

- original Tiptap `RichMarkdownEditor`에 KTable 삽입/편집 toolbar 통합.
- table/row/column 조작, merge/split, border toggle, header toggle, 셀 색상과 정렬 지원.
- markdown HTML에 `data-ktable`, `data-tw-color`, `data-text-align` attribute 보존.
- editor와 frontend 양쪽에서 KTable border, 배경, light/dark 대비 CSS 공유.
- unit/E2E 회귀 테스트와 `data-tw-color` 대비 로직 문서 추가.
