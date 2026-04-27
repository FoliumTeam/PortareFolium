# USER_TASKS

## NextAuth 전환 후 설정

- `.env.local` 또는 배포 환경변수에 아래 값 추가
  - `AUTH_SECRET` (Auth.js v5 표준 — 신규 배포 권장 키 이름)
  - `AUTH_ADMIN_EMAIL`
  - `AUTH_ADMIN_PASSWORD_HASH`
- 로컬 E2E 또는 push 전 검증은 실행 시 랜덤 비밀번호와 hash를 메모리에서 생성
- 필요하면 `E2E_EMAIL`만 설정해 테스트용 관리자 email override 가능
- `AUTH_ADMIN_PASSWORD_HASH` 생성 예시

```bash
node -e "const { randomBytes, scryptSync } = require('crypto'); const salt = randomBytes(16).toString('hex'); const hash = scryptSync('YOUR_PASSWORD', salt, 64).toString('hex'); console.log('scrypt$' + salt + '$' + hash)"
```

- `AUTH_ADMIN_EMAIL`에는 실제 관리자 이메일 1개만 입력
- E2E 평문 비밀번호는 `.env.local`에 저장하지 않음
- Google OAuth, legacy Supabase auth 관련 env는 제거 가능

## Credentials 보안 hardening 후 운영 점검

- 이미 배포된 로그인 페이지에 `AUTH_SECRET` 또는 `AUTH_ADMIN_PASSWORD_HASH`가 노출됐을 가능성이 있으면 두 값을 즉시 rotate
- 운영 DB에 `admin_login_attempts` migration 적용 여부 확인
- 배포 후 `/admin/login`에서 외부 `returnUrl`이 `/admin`으로만 처리되는지 smoke check
- MCP agent token이 외부에 유출됐을 가능성이 있으면 admin 패널 → Agent Tokens에서 즉시 revoke + 신규 발급
- `pub-*.r2.dev` 또는 자체 R2 public URL이 reverse proxy/CDN을 거치는 경우 `AUTH_TRUST_HOST` 가정이 유효한지 점검 — Vercel 외 self-host 시 신뢰할 수 없는 forwarded header가 들어오면 host spoofing 가능, 신뢰 가능한 proxy 뒤에서만 운영
- MCP 토큰은 신규 발급 시 한 번만 노출되므로 발급 직후 안전한 secret manager에 저장

## Lightbox Sidecar Backfill

- 기존 `blog/` / `portfolio/` 자산을 `thumb.webp` 하나만 남기는 구조로 정리하려면 아래 명령 실행

```bash
pnpm backfill:lightbox-sidecars
```

- 실행 전 `.env.local`에 `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` 값 확인
- 운영 R2 대상 실행 전 staging 또는 일부 key로 먼저 검증 권장
