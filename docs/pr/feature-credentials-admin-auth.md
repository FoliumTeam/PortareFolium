# PR: feature/credentials-admin-auth → main

## Title

feature/credentials-admin-auth → main: credentials admin auth + 보안 hardening + .agents 도입 + repo 구조 정비

## Summary

이 branch 는 NextAuth credentials 관리자 로그인 도입 + 24+ 항목 보안 hardening + multi-AI 공유 directive 폴더 도입 + docs/repo 구조 전반 정비를 묶는다 (v0.12.78 → v0.12.116).

### 1. NextAuth credentials admin auth 전환

- Google OAuth + legacy Supabase migration bridge 제거 → 단일 관리자 email/password (`AUTH_ADMIN_EMAIL` + `AUTH_ADMIN_PASSWORD_HASH` scrypt) 구조
- JWT session, 4시간 max age, 30분 update interval. `getAdminAuthVersion()` env fingerprint 로 rotation 시 기존 세션 즉시 무효화
- `signIn` callback 이 provider + `isAdminEmail(user?.email)` 이중 검증
- `/admin/login` 에 setup guide UI (env 누락 시 안내 + 명령 복사)
- `/admin/migrate` 경로 + `AdminAccessGate`, `MigrationGuide` 삭제

### 2. 보안 hardening (v0.12.79~v0.12.94)

- 로그인 setup secret client prop 누락 차단 (v0.12.80)
- admin returnUrl 외부 redirect 차단 — `getSafeAdminReturnUrl` (v0.12.81)
- 로그인 rate limit account+IP 이중 key, hashed key 기반 Supabase `admin_login_attempts` 공유 store + DB 부재 시 fail-closed (v0.12.82, v0.12.85, v0.12.86, v0.12.89)
- Public search jobField PostgREST raw filter 검증 (v0.12.83)
- `pnpm overrides` production dependency 취약점 해소 (v0.12.84)
- R2 path policy — `src/lib/r2-path-policy.ts` allowlist (`portfolio/`, `blog/`, `books/`, `about/`, `resume/`, `misc/`) + segment regex + traversal reject + 확장자 기반 ContentType + 15MB size cap (v0.12.87)
- `AUTH_SECRET` dev fallback 제거 + setup gate (v0.12.88)
- LIKE wildcard escape + agent-token SQL filter + JSON.parse guard (v0.12.90)
- `AUTH_SECRET` 컨벤션 정렬 (Auth.js v5 표준, AUTH_SECRET 유지) (v0.12.91)
- MCP GET endpoint Bearer 인증 + invalid token IP throttle — `src/lib/mcp-rate-limit.ts` (v0.12.92)
- Admin route gate — `src/proxy.ts` (v0.12.93, v0.12.101 에서 middleware → proxy 마이그레이션)
- `docs/SECURITY.md` 추가 후 `.agents/directives/06-security.md` 로 흡수 (24개 lessons learned 정리)

### 3. Server action 경계 통일 (v0.12.54~v0.12.65)

- About / Resume / Posts / Portfolio / Books / Tags / Gantt / SiteConfig / EditorStates / Snapshots / AgentTokens / Lightbox 모든 admin CRUD 를 server action 으로 이관 — browserClient direct write 제거
- 모든 server action `requireAdminSession()` 통일 (62회)
- Bootstrap read 도 server action 으로 이전, 공개 검색은 `searchPublicContent` 별도

### 4. Audit follow-up (v0.12.98~v0.12.100)

- Bootstrap per-query error 로깅 (silent swallow 차단)
- `reorderFeaturedPortfolioItems` / batch updates parallel 화 + partial-write 감소
- `searchPublicContent` `.or()` 재할당 패턴
- `src/lib/request-ip.ts` 신규 — auth.ts + mcp/route.ts IP 추출 통합
- AdminDashboard inactivity timer visibility 가드 + 1분 사전 confirm 경고
- LoginForm sr-only label + autoComplete
- EditorStatePreservation modal `role="alertdialog"` + `aria-modal` + `aria-describedby`
- ResumePanel/AboutPanel `: any` 정리, console.error format 정규화

### 5. Multi-AI 공유 directive 폴더 (v0.12.95)

- `.agents/directives/` 신규 — Claude Code / Codex CLI / Gemini CLI 공유 canonical directive
- `.agents/directives/omc/` — `.claude/rules/` 의 commit-tracked snapshot (`scripts/sync-omc-directives.mjs` 일방향 sync, postinstall + pre-commit hook)
- `AGENTS.md` 를 manifest 로 refactor + "File locations" 섹션 추가
- `CLAUDE.md`, `GEMINI.md` 1줄 redirect

### 6. Repo 구조 정비 (v0.12.96~v0.12.97)

- `vendor/keditor-0.7.21/` 신설 (← `KEDITOR-0.7.21/`)
- `.agents/prompts/` (← `prompt-templates/`), `.agents/prompt-assets/` (← `prompt/`)
- `docs/plans/{active,archive}/`, `docs/pr/`, `docs/TODO.md`, `docs/USER_TASKS.md` (모두 gitignored, README placeholder)
- root 의 `PLAN_*.md`, `PR_*.md`, `TODO.md`, `USER_TASKS.md` 모두 docs/ 하위로 이동
- `docs/IMAGE_ORPHAN_CLEANUP.md`, `docs/MCP_GUIDE.md`, `docs/SEO.md`, `docs/TEST.md`, `docs/SECURITY.md`, `PLAN_SECURITY.md`, `PR_PROVIDER_API.md` 삭제 — directive/code 로 흡수 또는 ROI 낮음
- `docs/CHANGES.md` 를 index 로 변환 + `docs/changelogs/<YYYY-MM-DD>.md` 24개 날짜별 분리

### 7. Next.js 16 proxy 마이그레이션 (v0.12.101)

- `src/middleware.ts` → `src/proxy.ts` rename + export 함수명 `middleware` → `proxy`
- Next.js 16 deprecation 경고 해소

### 8. Admin MainPanel overview (v0.12.113)

- `/admin` 기본 패널을 MainPanel로 전환
- DB/frontend version, migration 최신 여부, active job field, posts/portfolio draft 현황 표시
- migration 필요 시 자동 적용 CTA 제공

### 9. Job field 삭제 cascade + ko 단일 resume 정리 (v0.12.114)

- 원인: `resume_data.ko.data.projects/work`가 section object인데 삭제 cascade가 legacy array로 가정해 중단
- 수정: resume JSON의 모든 `jobField` 키를 shape 보존 방식으로 변환하는 helper 추가
- 정리: 문제를 유발하던 `resume_data.lang = 'en'` row 제거 migration 추가, MCP resume 도구를 `ko` 전용으로 제한

### 10. Admin job field 렌더링 안정화 (v0.12.115)

- Posts/Portfolio 목록과 metadata sheet에서 job field id/value 중복을 렌더링 전에 정규화
- tag badge key 충돌을 index 포함 key로 방어
- SiteConfigPanel이 원시 문자열 `job_field = game`을 `JSON.parse`하지 않도록 parsing guard 추가

### 11. SQLite refuge credentials-only auth 정리 (v0.12.116)

- SQLite refuge에서 자동 admin session과 mode-local auth secret 경로 제거
- `/admin/login` credentials 로그인만 허용하고, proxy/API/server action은 기존 session cookie + `requireAdminSession()` 경계를 유지
- `admin_login_attempts`를 SQLite refuge local-only table로 지원해 rate limit fail-closed 정책을 유지하되 Supabase replay에서는 제외
- refuge 운영 가이드와 security/architecture directive를 credentials-only 원칙으로 갱신

### 12. Auth.js secret env 단일화 (v0.12.117)

- Auth.js secret env를 `AUTH_SECRET` 하나로 단일화
- legacy secret alias와 관련 문서 안내 제거
- Playwright start-mode 기본 secret 주입도 `AUTH_SECRET`로 정렬
- `/admin/login` first-run setup guide가 production에서도 missing/invalid auth env와 생성 명령을 안내하도록 보강
- README에 Vercel fork 직행 사용자를 위한 admin credentials 생성 절차 추가

## Test Plan

- [x] `pnpm exec tsc --noEmit`
- [x] `pnpm exec vitest run` — 28 files / 225 tests pass
- [x] `pnpm build` — clean (Proxy registered)
- [x] `BASE_URL=http://127.0.0.1:3100 E2E_SERVER_MODE=start pnpm exec playwright test --project=chromium --project=authenticated-chromium` — 54 tests pass (33.9s, push-time gate)
- [x] Security review (security-reviewer agent, Opus) — 0 high-confidence vulnerabilities introduced
- [x] Audit (code-reviewer agent, Opus) — P1/P2/P3 findings 적용 완료, out-of-scope 4건 사유 명시

## Manual deploy checklist

- [ ] Vercel env: `AUTH_SECRET` 설정
- [ ] Vercel env: `AUTH_ADMIN_EMAIL` + `AUTH_ADMIN_PASSWORD_HASH` 설정 (`scrypt$<salt>$<hash>` 형식)
- [ ] Supabase 운영 DB 에 `admin_login_attempts` migration 적용 확인
- [ ] 배포 후 `/admin/login` 외부 returnUrl 차단 + proxy redirect 동작 smoke check
- [ ] 기존 발급 MCP agent token 중 미사용 항목 revoke + 신규 발급
- [ ] Google OAuth, legacy Supabase auth 관련 env 제거 가능

## Risk notes

- `trustHost: true` — Vercel 또는 신뢰 가능한 reverse proxy 한정 안전
- MCP invalid attempt throttle 는 in-memory (instance-local) — 토큰 entropy 256bit 라 brute force 위협 낮음. 후속 PR 에서 Vercel KV 또는 Supabase 테이블 이전 검토
- MDX content trust — admin/MCP token authoring 신뢰 모델. 외부 contributor 입력 경로 추가 시 sanitize / sandbox renderer 필수

## Commits (25)

```
d97d11a chore: middleware → proxy 파일 컨벤션 마이그레이션 (v0.12.101)
f330397 refactor: shared IP 헬퍼 통합과 admin panel any/console.error 정리 (v0.12.100)
cc84efc fix: admin dashboard inactivity 가드와 로그인/모달 a11y 보강 (v0.12.99)
c3d3d20 fix: server action bootstrap error 로깅과 reorder partial-write 감소 (v0.12.98)
e35ca7d chore: docs/CHANGES.md를 날짜별 changelogs 폴더로 분리 + directive 갱신 (v0.12.97)
38ffe1c chore: docs root 정리 — security/test 직책 directive 흡수, 잉여 가이드 삭제 (v0.12.97)
ad28f81 chore: root cleanup — vendor 분리 + plans/pr/TODO 위치 정리 (v0.12.96)
86b2b96 feat: shared agent directive 폴더 .agents/ 도입 (v0.12.95)
a4f7d1a docs: SECURITY 가이드 추가 (v0.12.94)
d2bb7a6 feat: admin route middleware gate (v0.12.93)
4801e32 fix: MCP 엔드포인트 인증 및 invalid token throttle (v0.12.92)
2e41af0 chore: AUTH_SECRET 컨벤션 정렬 (v0.12.91)
21d0a1b fix: nextauth signIn 검증 강화 + LIKE escape + agent token 필터 (v0.12.90)
d4b2ebc fix: admin 로그인 rate limit DB 부재 시 fail-closed (v0.12.89)
6afd1ce fix: AUTH_SECRET 제거 + admin 로그인 setup gate (v0.12.88)
4334759 fix: R2 storage 경로 검증 강화 (v0.12.87)
22b6870 fix: admin rate limit 정책 조정 (v0.12.86)
20fa961 fix: admin rate limit 공유 저장소 추가 (v0.12.85)
83f832d fix: production dependency audit 취약점 해소 (v0.12.84)
937375c fix: public search jobField filter 검증 추가 (v0.12.83)
2c0ae55 fix: admin 로그인 rate limit key 보강 (v0.12.82)
1c10649 fix: admin returnUrl 외부 redirect 차단 (v0.12.81)
b862b0a fix: 로그인 setup secret 노출 차단 (v0.12.80)
02e080e fix: credentials 관리자 인증 보안 hardening (v0.12.79)
ddb2045 test: 로그인 페이지 env 안내 회귀 테스트 추가 (v0.12.78)
```
