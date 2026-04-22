## Title

feature/nextauth-sqlite-refuge → main: NextAuth 전환과 SQLite refuge 기반 정리

## Summary

- NextAuth Google OAuth 기반 관리자 세션 골격 추가
- legacy Supabase 이메일/비밀번호 로그인은 `/admin/migrate` 전용 1회 브리지로 제한
- R2 admin route와 민감 server action을 NextAuth 관리자 세션으로 보호

## Changed Files

### feat
- `src/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/components/AuthSessionProvider.tsx`
- `src/components/admin/AdminAccessGate.tsx`
- `src/components/admin/MigrationGuide.tsx`
- `src/app/admin/migrate/page.tsx`
- `src/lib/admin-auth.ts`
- `src/lib/server-admin.ts`

### fix
- `src/app/admin/page.tsx`
- `src/app/admin/login/page.tsx`
- `src/components/admin/LoginForm.tsx`
- `src/components/admin/AdminDashboard.tsx`
- `src/components/UserMenu.tsx`
- `src/components/PdfExportButton.tsx`
- `src/components/BlogPage.tsx`
- `src/app/api/upload-image/route.ts`
- `src/app/api/storage-ops/route.ts`
- `src/lib/image-upload.ts`
- `src/app/admin/actions/revalidate.ts`
- `src/app/admin/actions/agent-tokens.ts`
- `src/app/admin/actions/snapshots.ts`
- `src/app/admin/actions/lightbox-sidecars.ts`

### test
- `src/__tests__/admin-auth.test.ts`
- `src/__tests__/image-upload.test.ts`

### docs
- `AGENTS.md`
- `PR_feature-nextauth-sqlite-refuge.md`
- `docs/CHANGES.md`
- `.env.example`

## Test Plan

- [x] `pnpm exec tsc --noEmit`
- [x] `pnpm exec vitest run src/__tests__/admin-auth.test.ts src/__tests__/image-upload.test.ts`
- [x] `pnpm build`
