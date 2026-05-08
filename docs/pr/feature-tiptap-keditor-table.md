# PR: feature/tiptap-keditor-table

## v0.12.136 - KEditor residue DB 복귀 정리

- 실패한 KEditor migration의 `content_mode` residue를 Supabase 복귀 전에 local refuge DB/journal/manifest에서 자동 제거.
- Supabase 복귀 replay conflict에서 posts/portfolio/books 등 replay 대상 table은 local SQLite row가 우선하도록 local-wins override 적용.
- SQLite refuge 운영 문서에 local-wins conflict 정책과 KEditor `content_mode` 재도입 금지 사항 반영.

## v0.12.135 - DB 복귀 명령 단순화

- 사용자용 DB 전환 명령을 `db:use-local-sqlite`, `db:restore-supabase` 2개로 정리하고 각 wrapper script 추가.
- Supabase 복귀 전에 dev server 실행 여부, local backup, remote conflict check를 자동 검증.
- SQLite refuge 운영 문서를 two-command workflow 기준으로 갱신.

## v0.12.134 - Supabase legacy key 제거

- Supabase client와 maintenance scripts에서 legacy env fallback 제거.
- `.env.example`, README, SQLite refuge 문서의 legacy key 안내 제거.
- current Supabase key resolution 회귀 테스트 갱신.

## v0.12.133 - Gantt Chart export shadow 제거

- JPG export 중 preview card shadow를 임시 제거해 export image left edge shadow artifact 제거.

## v0.12.132 - Gantt Chart export 설정 추가

- Gantt Chart preview에 column span, aspect ratio, export resolution control 추가.
- category 내부 duplicate task name 저장을 warning dialog와 server action validation으로 차단.
- task title/category duplicate render key 충돌과 timeline label formatting 보강.
