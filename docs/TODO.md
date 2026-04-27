# TODO — Security Hardening (RESOLVED)

**Branch:** `feature/credentials-admin-auth`
**Status:** All A1–A12 + PLAN_SECURITY.md #1–#6 resolved through commits v0.12.87 → v0.12.94.

## Commits

- v0.12.87 — `fix: R2 storage 경로 검증 강화` → A4, A5, PLAN #2
- v0.12.88 — `fix: AUTH_SECRET 제거 + admin 로그인 setup gate` → A1, A7
- v0.12.89 — `fix: admin 로그인 rate limit DB 부재 시 fail-closed` → A9
- v0.12.90 — `fix: nextauth signIn 검증 강화 + LIKE escape + agent token 필터` → A2, A6, A8, A10
- v0.12.91 — `chore: AUTH_SECRET 컨벤션 정렬` → PLAN #3
- v0.12.92 — `fix: MCP 엔드포인트 인증 및 invalid token throttle` → PLAN #5, #6
- v0.12.93 — `feat: admin route middleware gate` → A12
- v0.12.94 — `docs: SECURITY 가이드 추가` → PLAN #1, #4

## Findings → Resolution Map

| ID | Finding | Resolution |
|----|---------|------------|
| PLAN #1 | MDX content trust boundary | docs/SECURITY.md 의 trust 모델 + token rotation 절차 명시 (intentional admin trust 유지) |
| PLAN #2 | R2 path/prefix/key broad input | r2-path-policy allowlist + size cap + ContentType 서버 결정 |
| PLAN #3 | AUTH_SECRET vs AUTH_SECRET | AUTH_SECRET 우선 + AUTH_SECRET |
| PLAN #4 | trustHost: true | docs/SECURITY.md 에 deployment 가정 명시 |
| PLAN #5 | MCP GET 미인증 | GET 도 Bearer 인증 필수 |
| PLAN #6 | MCP invalid token throttle 부재 | mcp-rate-limit IP 기반 in-memory throttle |
| A1 | AUTH_SECRET dev fallback hard-coded | dev fallback 제거 — 미설정 시 부팅 실패 |
| A2 | signIn callback redundant | provider + isAdminEmail 이중 검증 |
| A3 | JWT email mutability | (분석 결과 정상 동작 — 변경 불필요) |
| A4 | upload-image Key/ContentType 무검증 | assertSafeR2Key + 확장자 기반 ContentType + size cap |
| A5 | storage-ops empty prefix bucket-wide wipe | assertSafeR2Prefix allowlist + 빈 prefix 차단 |
| A6 | LIKE wildcard injection | escapeLikePattern |
| A7 | setup gate rate counter 소모 | authorize 진입부 setup 검사 → counter 미소모 즉시 null |
| A8 | login JSON.parse unguarded | try/catch fallback |
| A9 | rate limit memory fallback 분산 우회 | DB-only fail-closed (store-unavailable sentinel) |
| A10 | agent-token filter 미사용 + write 증폭 | SQL filter + last_used_at 60s throttle |
| A11 | admin-return-url URL parser edge | (분석 결과 안전 — 변경 불필요) |
| A12 | middleware route gate 부재 | src/middleware.ts session cookie defense-in-depth |

## Verification

- `pnpm exec vitest run` — 23 files / 201 tests pass
- `pnpm build` — clean
- 새 테스트: r2-path-policy (14), mcp-rate-limit (3), admin-login-rate-limit fail-closed (1)
