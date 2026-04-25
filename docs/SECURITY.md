# SECURITY

This document captures the trust model and operational guard-rails for portare-folium.

## Trust boundaries

### Admin

- Single admin (`AUTH_ADMIN_EMAIL`) authenticated via NextAuth Credentials provider
- Password hashed with `scrypt` (`AUTH_ADMIN_PASSWORD_HASH`) — bcrypt/argon2 사용 안 함
- JWT session, 4시간 max age, 30분 update interval
- `getAdminAuthVersion()` (env email + password hash 기반 fingerprint) 가 변경되면 기존 JWT 즉시 무효화
- 로그인 시도 rate limit: account 단위 + ip+account 단위 — 10회/10분 초과 시 10분 차단
- DB store(`admin_login_attempts`) 부재 또는 에러 시 fail-closed (로그인 거부)

### MCP agent

- `Bearer <token>` 인증 — token은 SHA-256 hash로 저장
- GET / POST 모두 인증 필수
- invalid attempt → IP 단위 in-memory throttle (5분 30회 초과 시 5분 차단)

### Public

- 모든 frontend 페이지는 익명으로 접근 가능
- 공개 검색은 `published: true` row만 조회, query는 PostgREST `ilike` wildcard escape 후 사용

## MDX content trust model

`src/lib/markdown.tsx` 의 `evaluate()` 는 DB에 저장된 MDX content를 실행/렌더한다. 이는 **admin-authored 또는 MCP token으로 작성된 content가 신뢰 가능한 코드라는 가정**에 의존한다.

- 결과적으로 admin 세션 또는 MCP token이 탈취되면 stored XSS / 임의 component 렌더로 확장된다
- 공개 사용자가 content를 작성할 수 있는 경로는 없다
- MCP token은 신규 발급 시 한 번만 노출 — 발급 직후 secret manager에 저장 + 미사용 token은 즉시 revoke

## Operational guard-rails

### Storage (Cloudflare R2)

- 업로드/이동/삭제 경로는 `src/lib/r2-path-policy.ts` 의 allowlist (`portfolio/`, `blog/`, `books/`, `about/`, `resume/`, `misc/`) 이내로만 허용
- 업로드 ContentType은 client `file.type` 무시하고 확장자 기반 서버 결정 (`png/jpg/jpeg/webp/avif/gif`)
- 업로드 size cap: 15MB

### Routes

- `/admin/(?!login)` + `/api/upload-image|storage-ops|run-migrations` 는 `src/middleware.ts` 에서 session cookie 부재 시 401/redirect
- 실제 admin 권한 검증은 server action / API route 의 `requireAdminSession()` / `isAdminSession()` 에서 수행 (defense-in-depth 2단)

### Deployment assumptions

- `trustHost: true` 는 Vercel 또는 신뢰 가능한 reverse proxy 뒤에서만 사용해야 한다
- self-host 시 forwarded header 가 신뢰 불가능하면 `trustHost` 를 deployment 에 맞게 재설정

## Token / secret rotation

- `AUTH_ADMIN_PASSWORD_HASH`, `AUTH_SECRET` (혹은 backward-compatible `NEXTAUTH_SECRET`) 가 노출 의심되면 즉시 rotate
- MCP token 노출 의심 시 admin 패널 → Agent Tokens → revoke + 신규 발급
- rotate 후 기존 JWT 세션은 admin auth version fingerprint 변경으로 자동 무효화
