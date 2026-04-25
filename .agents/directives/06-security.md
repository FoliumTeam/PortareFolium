# 06. Security

이 directive 는 신규 인증/인가/저장 코드 작성 시 반드시 follow. 본 branch (`feature/credentials-admin-auth`, v0.12.79~v0.12.94) 의 보안 수정에서 도출된 규칙 포함.

## Trust boundaries

### Admin

- Single admin (`AUTH_ADMIN_EMAIL`) authenticated via NextAuth Credentials provider
- Password hashed with `scrypt` (`AUTH_ADMIN_PASSWORD_HASH`) — bcrypt/argon2 사용 안 함
- JWT session, 4시간 max age, 30분 update interval
- `getAdminAuthVersion()` (env email + password hash 기반 fingerprint) 가 변경되면 기존 JWT 즉시 무효화
- 로그인 시도 rate limit: account 단위 + ip+account 단위 — 10회/10분 초과 시 10분 차단
- DB store(`admin_login_attempts`) 부재 또는 에러 시 fail-closed (로그인 거부)

### MCP agent

- `Bearer <token>` 인증 — token 은 SHA-256 hash 로 저장
- GET / POST 모두 인증 필수
- invalid attempt → IP 단위 in-memory throttle (5분 30회 초과 시 5분 차단)

### Public

- 모든 frontend 페이지는 익명으로 접근 가능
- 공개 검색은 `published: true` row 만 조회. query 는 PostgREST `ilike` wildcard escape 후 사용

## MDX content trust model

`src/lib/markdown.tsx` 의 `evaluate()` 는 DB 저장 MDX content 를 실행/렌더한다. 이는 **admin-authored 또는 MCP token 으로 작성된 content 가 신뢰 가능한 코드라는 가정**에 의존한다.

- admin 세션 또는 MCP token 탈취 시 stored XSS / 임의 component 렌더로 확장
- 공개 사용자가 content 를 작성할 수 있는 경로 없음
- 외부 contributor 입력 경로 신설 시 sanitize / sandboxed renderer 필수 (현 모델 무효화)

## Operational guard-rails

### Storage (Cloudflare R2)

- 업로드/이동/삭제 경로는 `src/lib/r2-path-policy.ts` 의 allowlist (`portfolio/`, `blog/`, `books/`, `about/`, `resume/`, `misc/`) 이내로만 허용
- 업로드 ContentType 은 client `file.type` 무시하고 확장자 기반 서버 결정 (`png/jpg/jpeg/webp/avif/gif`)
- 업로드 size cap: `MAX_UPLOAD_BYTES` (현재 15MB)

### Routes

- `/admin/(?!login)` + `/api/upload-image|storage-ops|run-migrations` 는 `src/middleware.ts` 에서 session cookie 부재 시 401/redirect
- 실제 admin 권한 검증은 server action / API route 의 `requireAdminSession()` / `isAdminSession()` 에서 수행 (defense-in-depth 2단)

### Deployment assumptions

- `trustHost: true` 는 Vercel 또는 신뢰 가능한 reverse proxy 뒤에서만 사용
- self-host 시 forwarded header 가 신뢰 불가능하면 `trustHost` 를 deployment 에 맞게 재설정 + X-Forwarded-\* 화이트리스트

## Lessons learned (must apply on new code)

### Authentication

1. **Hardcoded fallback secret 금지** — `process.env.NEXTAUTH_SECRET || "local-dev"` 패턴 금지. NODE_ENV 오설정 시 prod 까지 노출 가능. env 부재면 boot fail.
2. **Setup gate 가 rate limit counter 를 소모하지 않게** — env 미완료 / DB 미설정 같은 환경 문제는 counter 증가 없이 즉시 reject. 정상 admin 의 lockout 회피.
3. **JWT invalidation fingerprint** — admin email + password hash 기반 fingerprint 를 token claim 에 포함, 매 검증 시 비교. env rotation 즉시 모든 세션 무효화.
4. **Provider + email 이중 검증** — `signIn` callback 에서 provider 매칭 외에 `isAdminEmail(user?.email)` 추가 검증. 다른 경로의 user 객체 생성에도 admin 권한 부여 차단.
5. **AUTH_SECRET 우선** — Auth.js v5 표준 (`getAuthSecret()` helper). `NEXTAUTH_SECRET` 은 backward-compatible fallback 으로만 유지.
6. **scrypt salt + length 검증** — password hash 파싱 시 prefix / hex 패턴 검사 후 `timingSafeEqual` 비교. 길이 불일치 시 즉시 false.

### Rate limiting

7. **Fail-closed when shared store unavailable** — Vercel multi-instance 환경에서 in-memory fallback 은 분산 brute force 우회 통로. DB store 부재 / 에러면 로그인 거부.
8. **Account + IP 이중 key** — single-key bucket 은 IP 회전으로 우회. account 단위와 ip+account 단위 둘 다 검사.
9. **Block 갱신 시 blockedUntil 연장** — 차단 중 추가 시도면 `now + BLOCK_MS` 로 다시 push. attacker 가 계속 시도하면 차단 시간 누적 연장.
10. **MCP rate limit 도 별도** — admin login 과 별도로 invalid token attempt counter 운영. tool name 노출도 reconnaissance 가치 있으므로 GET 도 인증 + throttle.

### Authorization & route gating

11. **Middleware + per-route 이중 검증** — `src/middleware.ts` 에서 session cookie 부재 시 redirect/401, 실제 권한 검증은 server action / API route 에서 `requireAdminSession()` 으로. middleware 의 forged cookie 우회를 server-side check 가 막음.
12. **신규 admin route / action 작성 시** — 반드시 `requireAdminSession()` 호출. middleware 만으로 부족. server action 은 RPC-like 직접 호출 가능하므로 entry 별 gate 필수.
13. **API endpoint 모든 method 인증** — GET 도 단순 health 라도 Bearer 필수 (MCP). 의도적 unauthenticated 가 아닌 한 default deny.

### Input validation

14. **Storage path allowlist** — 업로드/이동/삭제 경로는 `r2-path-policy` allowlist 만 허용. 빈 prefix / leading slash / `..` traversal / non-allowlist root 모두 차단. 빈 prefix 는 bucket-wide wipe 위험.
15. **Server-determined ContentType** — client `file.type` 신뢰 금지. 확장자 allowlist 후 서버에서 MIME 결정. SVG / HTML 업로드 자동 차단.
16. **Upload size cap** — `MAX_UPLOAD_BYTES` 검증. memory 폭주 + R2 비용 누수 방지.
17. **PostgREST raw filter sanitize** — `or()`, `eq()` 등 raw string 결합 입력은 charset allowlist (`/^[a-z0-9_-]{1,64}$/i`) 통과만 허용. 콤마 / 괄호 / `.eq.` 등 PostgREST 구분자 포함 입력 즉시 reject.
18. **LIKE wildcard escape** — `ilike` 입력의 `%`/`_`/`\\` 는 `\\` escape 후 사용. 미 escape 시 enumeration.
19. **Open redirect 차단** — 외부 redirect 후보 URL 은 `new URL(value, sentinel-base)` + origin 비교 + path prefix 비교 + scheme 차단. `javascript:`, `data:`, `//evil`, `\\evil` 모두 fallback.
20. **JSON.parse on user-influenced data 는 try/catch** — site_config 등 admin 자유 텍스트 입력 가능한 필드의 JSON.parse 는 broken JSON 시 500 유발. 반드시 가드.

### Resource handling

21. **Agent token SQL filter** — revoked / expired 검사를 app code 가 아닌 SQL filter (`gt("expires_at", now)`, `eq("revoked", false)`) 로. row fetch 후 app-side filter 는 누락 위험 + 불필요 DB read.
22. **`last_used_at` write throttle** — 매 호출마다 write 하면 invalid token 폭격 시 DB 폭주. 60초 throttle.
23. **token 노출 1회 원칙** — agent token 발급 응답에만 raw 포함, DB 는 SHA-256 hash 만 저장.

### Dependencies

24. **`pnpm audit --prod` 정기 실행** — production dependency 취약점 발견 시 `pnpm overrides` 로 즉시 패치. transitive dependency 도 추적.

## Known limitations

이번 hardening 으로 처리되지 않은 영역. 별도 PR 또는 운영 절차 추적.

1. **MCP invalid attempt throttle 가 instance-local** — `src/lib/mcp-rate-limit.ts` 는 in-memory `Map`. multi-instance 분산 brute force 시 instance 수배 시도 허용. 토큰 entropy 256bit 라 brute force 위협은 낮음. 후속: Supabase 테이블 또는 Vercel KV 이전 검토.
2. **trustHost 자체 호스트 가정** — Vercel 외 환경 전환 시 deployment env 기반 `trustHost` 게이트 + X-Forwarded-\* 화이트리스트 추가 필요.
3. **MDX content trust 경계 확장 시** — 외부 contributor 가 content 작성 가능해지면 sanitize / sandboxed renderer 필수.
4. **R2 size cap (15MB)** — 자산 크기 변동 시 조정. video / 큰 binary 추가 시 별도 prefix + 별도 cap 검토.
5. **Supabase RPC `exec_sql` 권한** — `service_role` 만 호출 가능한지 + 다른 코드 경로 호출 여부 정기 점검.
