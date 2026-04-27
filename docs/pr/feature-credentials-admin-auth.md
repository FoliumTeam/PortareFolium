# PR: feature/credentials-admin-auth → main

## Title

Credentials admin auth와 관리자 보안 hardening

## Summary

- Google OAuth / legacy Supabase auth 흐름을 제거하고 단일 관리자 credentials 로그인으로 전환했습니다.
- Admin server action, route, storage, MCP, search, rate-limit 경계를 보강해 관리자 기능의 인증/인가와 입력 검증을 정리했습니다.
- Fork → Vercel 직행 사용자를 위해 `/admin/login` first-run setup guide와 `AUTH_SECRET` 단일 설정 흐름을 추가했습니다.

## Related PRs

- SQLite refuge 운영 경로는 별도 PR에서 다룹니다: [#38 feature/sqlite-refuge](https://github.com/FoliumTeam/PortareFolium/pull/38)

## Changed Files

### feat: credentials admin auth

- `src/auth.ts`, `src/lib/admin-credentials.ts`, `src/lib/admin-auth.ts`, `src/lib/admin-auth-version.ts`:
  NextAuth credentials provider, single admin email/password, scrypt hash 검증, auth version fingerprint 도입
- `src/app/admin/login/page.tsx`, `src/components/admin/LoginForm.tsx`:
  admin login page, setup 상태 안내, invalid env 진단, first-run command copy guide 추가
- `src/proxy.ts`, `src/lib/server-admin.ts`:
  admin page/API unauthenticated request filter와 server-side admin session 검증 경계 정리

### fix/security: admin hardening

- `src/lib/admin-login-rate-limit.ts`, `src/lib/request-ip.ts`:
  account + IP 기반 로그인 rate limit, shared store fail-closed, request IP helper 통합
- `src/lib/admin-return-url.ts`, `src/app/admin/actions/public-data.ts`:
  admin returnUrl open redirect 차단과 public search raw filter/wildcard 검증
- `src/lib/r2-path-policy.ts`, `src/app/api/upload-image/route.ts`, `src/app/api/storage-ops/route.ts`:
  R2 upload/move/delete path allowlist, MIME 결정, size cap, traversal 차단
- `src/app/api/mcp/route.ts`, `src/lib/mcp-rate-limit.ts`, `src/lib/agent-token.ts`:
  MCP GET/POST Bearer 인증, invalid token throttle, token SQL filter와 write throttle 보강

### refactor: admin data boundary

- `src/app/admin/actions/*`, `src/components/admin/panels/*`:
  admin CRUD를 server action 중심으로 정리하고 browserClient direct write 경계 축소
- `src/app/admin/actions/main.ts`, `src/components/admin/panels/MainPanel.tsx`:
  admin 첫 화면에 DB/frontend version, migration 상태, draft 요약, active job field 표시 추가
- `src/lib/resume-job-field.ts`, `src/app/admin/actions/site-config.ts`, `src/lib/migrations.ts`:
  job field 삭제 cascade와 ko 단일 resume 정리

### docs/chore: repo 운영 문서와 agent directive 정리

- `.agents/directives/*`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`:
  shared agent directive 구조와 security/workflow 지침 정리
- `docs/CHANGES.md`, `docs/changelogs/*`, `docs/pr/feature-credentials-admin-auth.md`:
  날짜별 changelog index와 branch PR 문서 정리
- `README.md`, `.env.example`, 운영 문서:
  Vercel fork 배포용 admin credentials env 설정 안내 갱신

### test

- `src/__tests__/admin-*.test.ts*`, `src/__tests__/login-form-guide.test.tsx`, `src/__tests__/job-field.test.ts`, `src/__tests__/r2-path-policy.test.ts`:
  auth setup, rate limit, route gate, returnUrl, storage policy, job field, first-run guide 회귀 테스트 추가/보강
- `e2e/*`:
  credentials login 기반 authenticated Playwright setup 정렬

## Test Plan

- [x] `pnpm exec tsc --noEmit`
- [x] `pnpm exec vitest run` — 29 files / 227 tests pass
- [x] `pnpm build` — clean (Proxy registered)
- [ ] `BASE_URL=http://127.0.0.1:3100 E2E_SERVER_MODE=start pnpm exec playwright test --project=chromium --project=authenticated-chromium` — push 전 재실행

## Manual deploy checklist

- [ ] Vercel env: `AUTH_SECRET` 설정
- [ ] Vercel env: `AUTH_ADMIN_EMAIL` + `AUTH_ADMIN_PASSWORD_HASH` 설정 (`scrypt$<salt>$<hash>` 형식)
- [ ] Supabase 운영 DB에 `admin_login_attempts` migration 적용 확인
- [ ] 배포 후 `/admin/login` setup guide, 정상 로그인, 외부 returnUrl 차단 smoke check
- [ ] 기존 Google OAuth / legacy Supabase auth 관련 env 제거
- [ ] 기존 MCP agent token 중 미사용 항목 revoke + 신규 발급

## Risk notes

- `trustHost: true`는 Vercel 또는 신뢰 가능한 reverse proxy 환경을 전제로 합니다.
- MCP invalid attempt throttle은 instance-local입니다. 토큰 entropy가 높아 brute force 위험은 낮지만, multi-instance shared throttle은 후속 개선 여지입니다.
- MDX content trust 모델은 admin/MCP token authoring을 신뢰합니다. 외부 contributor 입력 경로를 추가하면 sanitize/sandbox renderer가 필요합니다.
