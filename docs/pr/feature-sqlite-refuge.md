# feature/sqlite-refuge → main: SQLite refuge 운영 경로 추가

## Summary

- Supabase 중단 시 `backup/supabase-backups/public-schema-backup-20260421-172728.json` 같은 public schema backup을 로컬 SQLite DB로 복원하고, admin `serverClient`를 SQLite refuge projection으로 라우팅합니다.
- refuge mode에서도 R2 image upload와 blog/portfolio asset move/delete를 유지하고, MCP/auth token 영역을 제외한 admin 기능을 로컬에서 계속 사용할 수 있게 했습니다.
- local SQLite refuge auth shortcut(removed)는 explicit opt-in + localhost + non-production/non-Vercel runtime으로 제한하고, mutation route에는 same-origin guard를 추가했습니다.
- Supabase 복귀 시 `refuge:push`가 journal replay dry-run/apply plan을 만들며, journal은 SHA-256 hash chain으로 변조를 감지합니다.
- SQLite-local migration 적용 경로를 추가해 local schema version을 먼저 올리고, Supabase 복귀 후 migration panel이 필요한 SQL을 다시 보여줄 수 있게 했습니다.

## Changed Files

### SQLite refuge operations

- `package.json` — `refuge:pull`, `refuge:push`, `refuge:deactivate` script 추가 및 version `0.12.108` 반영
- `scripts/refuge-pull.ts` — backup/Supabase source에서 `.local/refuge/refuge.db`, manifest, journal, mode state 생성
- `scripts/refuge-push.ts` — conflict-aware replay dry-run/apply, supported table delete replay, `journalHeadHash` plan 출력 추가
- `scripts/refuge-deactivate.ts` — SQLite refuge mode를 Supabase primary mode로 전환
- `src/lib/refuge/*` — SQLite projection store, schema/table support, mode gate, serverClient adapter, local migration helper 추가
- `src/lib/supabase.ts` — active mode에 따라 Supabase client 또는 SQLite refuge client 선택

### Admin feature parity

- `src/app/admin/actions/about.ts`, `site-config.ts`, `tags.ts`, `snapshots.ts`, `public-data.ts` — refuge mode에서 about/site config/tag/category/snapshot/schema version 작업 지원
- `src/app/api/run-migrations/route.ts`, `src/lib/auto-migrate.ts`, `src/lib/migrations.ts` — SQLite-local migration apply와 schema version 갱신 경로 추가
- `src/components/admin/AdminDashboard.tsx`, `AdminSidebar.tsx`, `panels/MigrationsPanel.tsx`, `panels/SiteConfigPanel.tsx` — refuge admin tab 범위 확대와 migration/config UI 제한 제거
- `src/app/api/upload-image/route.ts`, `src/app/api/storage-ops/route.ts` — R2 upload/list/move/delete를 refuge mode에서도 유지

### Security hardening

- `src/lib/server-admin.ts` — explicit local-only refuge admin session helper 추가
- `src/app/api/*/route.ts` — local refuge auth shortcut(removed) 중 cross-site/cross-origin mutation 차단
- `src/lib/refuge/mode.ts` — production/Vercel/preview runtime에서 SQLite refuge mode 및 local shortcut(removed) 차단
- `src/lib/refuge/store.ts`, `src/lib/refuge/schema.ts` — journal `prevHash`/`hash` chain 기록과 read-time 검증 추가
- `src/proxy.ts`, admin/auth/API entrypoints — effective admin session과 local-only proxy pass-through 적용

### Adjacent fixes and docs

- `src/app/(frontend)/blog/[slug]/page.tsx`, `src/app/(frontend)/portfolio/[slug]/page.tsx`, `src/lib/image-url.ts` — animated GIF thumbnail에만 `<Image unoptimized>` 적용
- `docs/SQLITE_REFUGE.md` — Supabase ↔ SQLite refuge 전환 운영 가이드 추가
- `.env.example`, `.agents/directives/05-architecture.md`, `.agents/directives/06-security.md` — local refuge shortcut(removed) 조건과 Vercel 등록 금지 원칙 문서화
- `.claude/commands/ship.md`, `.agents/directives/04-workflow.md` — commit message body 및 rewrite 보존 규칙 강화
- `docs/changelogs/2026-04-26.md` — v0.12.103~v0.12.108 변경 이력 추가

## Test Plan

- [x] `pnpm exec tsc --noEmit`
- [x] `pnpm exec vitest run` — 29 files / 220 tests
- [x] `pnpm build`
- [x] `pnpm format:check`
- [x] `pnpm audit --audit-level moderate`
- [x] `pnpm refuge:pull --activate`
- [x] `pnpm refuge:push`

## Notes / Risks

- SQLite refuge는 local/dev 운영용입니다. `NODE_ENV=production`, `VERCEL=1`, `VERCEL_ENV=production|preview`에서는 mode/shortcut(removed)가 열리지 않도록 막았습니다.
- journal hash chain은 local journal 내용 변조를 감지하지만, local attacker가 DB와 journal 전체를 함께 재생성하는 공격까지 방지하지는 않습니다. 그 수준의 보장이 필요하면 `.local` 밖의 signed manifest 또는 외부 signing key가 필요합니다.
- Supabase 복귀 전에는 `refuge:push` dry-run으로 conflict를 확인하고, migration panel의 Supabase SQL 목록을 별도로 적용해야 합니다.
