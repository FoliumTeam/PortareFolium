# NextAuth + SQLite Refuge Final Plan

## Goal

- Supabase를 **auth provider**로 더 이상 사용하지 않음
- 인증은 **NextAuth** 로 이관
- 데이터는 평소 **Supabase primary**
- 비상 시 **local SQLite refuge** 로 전환
- `pnpm refuge:pull --activate` 한 번으로 refuge 활성화
- `pnpm refuge:push` 한 번으로 Supabase primary 복귀

## Current State

- Supabase public schema 백업 JSON 확보 완료
  - `.local/supabase-backups/public-schema-backup-20260421-172728.json`
- 백업 대상 row 수
  - `site_config`: 13
  - `about_data`: 1
  - `resume_data`: 2
  - `posts`: 39
  - `portfolio_items`: 10
  - `tags`: 6
  - `books`: 0
  - `ai_agent_tokens`: 10
  - `database_snapshots`: 3
  - `editor_states`: 42
  - `gantt_chart_archives`: 1

## Core Decision

최종 구조는 아래와 같음

- **Auth**: NextAuth
- **Primary DB**: Supabase
- **Refuge DB**: project-local SQLite
- **Files**: Cloudflare R2

Release 1은 **full Supabase parity** 가 아니라 **supported surface continuity** 를 목표로 함

## Auth Decision

### Chosen Stack

- NextAuth
- Google OAuth
- JWT session strategy
- Resend magic link는 **후속 단계**

### Reference Projects

- NextAuth 구조 레퍼런스: `../ship-fast-ts-main`
- Google + magic link UX 레퍼런스: `../ship-fast-ts-supabase`

### Auth Scope

- 최종적으로 Supabase Auth 제거
- admin/login/session/guard/UI affordance를 NextAuth 기준으로 교체
- 기존 Supabase 이메일/비밀번호 로그인은 **1회 migration bridge**로만 유지
- refuge mode에서도 Supabase Auth와 무관하게 로그인 가능해야 함

## Existing User Migration Bridge

전제:

- 기존 사용자는 사실상 **오너 1명**
- 현재 legacy 로그인 방식은 **Supabase 이메일/비밀번호**
- 공개 로그인 버튼은 제거. 관리자만 `/admin/login` URL 직접 진입

### Desired User Flow

1. 앱 업데이트
2. 오너가 `/admin/login` URL로 직접 진입
3. 오너가 기존 **Supabase 이메일/비밀번호**로 1회 로그인
4. 일반 admin 화면 대신 `/admin/migrate`로 강제 이동
5. 화면에서 Google OAuth 전환 가이드 확인
6. Google 로그인 완료
7. 완료 버튼으로 legacy Supabase 세션 해제
8. 이후부터는 NextAuth Google 로그인만 사용

### Public Login UX

- 공개 방문자에게는 로그인 버튼을 노출하지 않음
- 관리자만 `/admin/login` URL을 알고 직접 진입
- 로그인 완료 후에는 기존처럼 프로필 이미지와 dropdown 표시

### Legacy Bridge Entry

- legacy Supabase 로그인은 `/admin/login` 화면 안에서만 잠시 허용
- public header에서는 legacy login / migration affordance를 노출하지 않음

### Release 1 Migration Policy

- legacy Supabase 이메일/비밀번호 로그인은 **bridge 기간에만 허용**
- bridge 로그인 성공 시 일반 admin 접근 금지, migration 화면으로만 이동
- migration 완료 후 local/session 기준으로 legacy 로그인 차단 가능 상태 확보
- magic link는 목표 스택에 포함하지만 **Release 1 필수 범위는 아님**

### Why Google First

- 현재 오너 계정 1명 기준으로 가장 단순
- NextAuth Email provider는 verification token 저장용 adapter가 필요
- 따라서 Release 1은 Google OAuth 전환을 먼저 끝내고, magic link는 후속 단계로 둠

## Refuge Decision

Release 1은 **surface-first sqlite refuge + local mutation journal + guarded replay**

- 읽기: SQLite mirror
- 쓰기: 제한된 admin 작업만 server 경유 + local journal 기록
- 복귀: journal replay를 Supabase에 guarded push
- 제외: Supabase Auth parity, Storage parity, managed schema parity

## Supported Tables in SQLite Refuge

- `site_config`
- `about_data`
- `resume_data`
- `posts`
- `portfolio_items`
- `tags`
- `books`
- `editor_states`
- `gantt_chart_archives`

## Excluded Tables

- `ai_agent_tokens`
- `database_snapshots`
- `auth.*`
- `storage.*`

## Supported Public Reads

- 홈
- `/about`
- `/resume`
- `/blog`
- `/blog/[slug]`
- `/portfolio`
- `/portfolio/[slug]`
- `/books/[slug]`

홈은 아래 read 포함

- `about_data`
- `site_config`
- `resume_data`
- `portfolio_items`
- `posts`

## Degraded Public Surfaces

- `GlobalSearch` 비활성화 또는 server-backed fallback 전까지 숨김
- `UserMenu`의 Supabase session affordance 제거
- `PdfExportButton`은 local admin auth가 없으면 숨김
- `BlogPage`의 manage affordance 제거

## Supported Admin Writes in Release 1

### `AboutPanel`
- 허용: `about_data` 저장
- 금지: `resume_data.basics.image` 수정
- 금지: `site_config.github_url` 수정

### `ResumePanel`
- 허용: `resume_data` 저장
- 허용: `site_config.resume_layout`
- 허용: `site_config.resume_section_layout`

### `SiteConfigPanel`
- 허용 key
  - `color_scheme`
  - `site_name`
  - `job_field`
  - `job_fields`
  - `seo_config`
  - `resume_layout`
  - `resume_section_layout`
- 금지
  - `plain_mode`
  - `github_url`
  - cascade로 다른 테이블 수정

### `PostsPanel`
- 허용: create
- 허용: update
- 허용: publish toggle
- 금지: delete
- 금지: slug rename
- 금지: category/tag mass effect
- 금지: asset move/delete
- 금지: snapshot/editor state 연계
- 금지: 이미지 업로드

### `PortfolioPanel`
- 허용: create
- 허용: update
- 허용: publish toggle
- 금지: delete
- 금지: slug rename
- 금지: storage mutation
- 금지: destructive reorder

### `BooksSubPanel`
- 허용: create
- 허용: update
- 허용: publish toggle
- 금지: delete
- 금지: 이미지/storage 연계 작업

### `EditorStatePreservation`
- 허용: snapshot load
- 허용: `Initial` / `Auto-save` / `Bookmark` 생성
- 허용: snapshot delete
- 허용: bulk delete
- 금지: cross-entity restore parity

### `GanttChartPanel`
- 허용: archive list
- 허용: create
- 허용: update
- 허용: delete
- 허용: `title`, `tasks`, `category_colors`, `bar_style` 수정
- 금지: DB 외부 자산 동기화 범위 확장

### Release 1 Non-goals

- `TagsPanel`
- MCP token 관리
- image/storage mutation parity
- Supabase managed schema parity

## Runtime Contract

- 브라우저는 SQLite 파일에 직접 접근하지 않음
- 여기서 server는 **Supabase 서버가 아니라 PortareFolium의 Next.js 서버 런타임**
- refuge mode에서 브라우저는:
  - 브라우저 → Route Handler / Server Action / server-only DAL → local SQLite
  - 이 경로로만 read/write 수행
- 앱은 request 시 `mode.json`을 읽고 backend 선택
  - `supabase-primary`
  - `sqlite-refuge`

## Commands

### Pull + Activate

```bash
pnpm refuge:pull --activate
```

내부 단계

1. Supabase service-role 전용 client로 지원 테이블 export
2. `.local/refuge/refuge.db` 생성
3. `.local/refuge/manifest.json` 생성
4. `.local/refuge/journal.ndjson` 초기화
5. `.local/refuge/mode.json` 기록

### Deactivate

```bash
pnpm refuge:deactivate
```

- mode를 `supabase-primary` 로 복귀
- refuge auth/session 무효화

### Push Back

```bash
pnpm refuge:push
```

전제

- 현재 mode가 `sqlite-refuge`

## Write Model

- supported admin write는 server boundary에서만 처리
- 각 write는 `.local/refuge/journal.ndjson` 에 append
- append 성공 후 local SQLite projection 갱신

### Write Flow

1. 브라우저가 refuge 전용 Route Handler 또는 Server Action 호출
2. Next.js 서버가 auth + mode 상태 확인
3. 서버가 local SQLite와 journal 함께 갱신
4. 필요 시 route-level revalidation 수행

### Journal Identity Keys

- `site_config.key`
- `resume_data.lang`
- `about_data` singleton
- `posts.slug`
- `portfolio_items.slug`
- `books.slug`
- `editor_states.id`
- `gantt_chart_archives.id`

## Push-back Safety

`pnpm refuge:push` 는 항상 순서대로 수행

1. pre-push Supabase snapshot
2. journal replay dry-run plan
3. conflict detection
4. apply
5. targeted revalidation

### Replay Policy

- content tables 허용: upsert
- content tables 허용: publish toggle
- `editor_states` 허용: insert / delete replay
- `gantt_chart_archives` 허용: insert / update / delete replay
- 금지: content tables delete
- 금지: slug rename
- 금지: storage mutation
- 금지: excluded table touch
- 금지: token mutation
- 금지: `database_snapshots` mutation

### Conflict Rule

- 기본값: reject
- refuge activation 이후 Supabase row 변경 감지 시 abort
- `editor_states` 는 baseline hash mismatch 시 abort
- 명시적 override 없이는 apply 안 함

## Delivery Order

### Phase 1 — NextAuth independence

- `ship-fast-ts-main` 구조 기준으로 NextAuth skeleton 추가
- Google OAuth + Resend magic link 연결
- JWT session 전략 적용
- Supabase login/logout/session watcher 제거
- admin guard를 `auth()` 기반으로 교체

### Phase 2 — Data provider boundary

- direct `serverClient` / `browserClient` 의존을 provider/DAL 경계 뒤로 이동
- supported read/write surface를 server-only 경유로 재구성

### Phase 3 — SQLite refuge activation

- sqlite schema
- `refuge:pull --activate`
- `refuge:deactivate`
- manifest/mode/journal 파일 생성

### Phase 4 — Supported write migration

- release 1 write surface를 server boundary로 이동
- local sqlite projection + journal append 적용

### Phase 5 — Guarded push-back

- dry-run replay
- conflict reject
- apply
- rollback rehearsal

## Pre-mortem

### 1. 숨은 `browserClient` 경로가 refuge에서 터짐
- 대응: supported/degraded manifest
- 대응: unsupported direct path runtime guard
- 대응: surface별 integration test

### 2. auth 이관 중 admin 접근이 깨짐
- 대응: NextAuth phase를 refuge보다 먼저 완료
- 대응: admin guard/login/session UI를 동일 milestone로 묶음

### 3. replay가 semantic mismatch로 Supabase를 오염
- 대응: release 1은 upsert-only
- 대응: content tables는 no delete / no rename / no storage mutation
- 대응: `editor_states`, `gantt_chart_archives`만 table-local replay 허용
- 대응: pre-push snapshot + staging rollback rehearsal 필수

## Expanded Test Plan

### Unit
- NextAuth session typing
- provider factory mode resolution
- sqlite codec for JSONB/TEXT[]/UUID/timestamp
- journal append
- projection update
- conflict detector
- activation timestamp guard

### Integration
- Google / magic link auth flow
- admin guard/login/deactivate
- `refuge:pull --activate` 후 sqlite/manifest 생성
- supported read routes가 sqlite에서 읽음
- supported admin write → journal append → sqlite projection update
- `refuge:push` dry-run이 replay plan만 생성
- `refuge:push` apply가 no-drift 환경에서 Supabase 반영
- snapshot 기반 rollback staging 검증

### E2E
- auth login
- `pull --activate -> browse public routes`
- refuge mode에서 selected admin edit
- unsupported action explicit error 또는 disabled UI
- `push dry-run -> push apply -> Supabase primary 복귀`
- console/pageerror 0개

### Observability
- auth mode status
- refuge mode status
- supported/degraded surface report
- table counts
- checksums
- replay plan JSON
- push result JSON
- conflict summary
- snapshot id

## Acceptance Criteria

1. Supabase Auth 제거 후 NextAuth 로그인 가능
2. `pnpm refuge:pull --activate` 가 sqlite file, manifest, mode file, unsupported surface report 생성
3. supported public routes가 refuge mode에서 sqlite 기반으로 render
4. supported admin writes가 browser direct DB access 없이 동작
5. `pnpm refuge:push` 가 snapshot + dry-run 없이 절대 write하지 않음
6. conflicts는 기본 reject
7. excluded tables / storage / managed schemas는 push에서 절대 touch하지 않음
8. staging에서 activate → edit → dry-run → apply → rollback 전체 재현 가능
9. 문서에 full Supabase parity 아님을 명시

## Expected Outcome

구현 후 최종 상태:

- Supabase가 auth provider가 아님
- admin 접근은 NextAuth 기준으로 독립 동작
- Supabase DB가 살아 있을 때는 primary DB로 사용
- Supabase outage/suspension 시에는 SQLite refuge로 전환 가능
- `editor_states`, `gantt_chart_archives` 포함 핵심 작업 지속 가능
- Supabase 복귀 시 single-command guarded restore 가능
