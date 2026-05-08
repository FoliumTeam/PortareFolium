# SQLite Refuge 운영 가이드

Supabase가 내려갔을 때만 SQLite refuge를 임시 primary DB처럼 사용한다. R2는 별도 서비스이므로 refuge mode에서도 이미지 업로드와 blog/portfolio asset move/delete는 계속 허용한다.

사용자가 직접 실행해야 하는 DB 전환 명령은 2개뿐이다.

```bash
# Supabase/backup → local SQLite refuge
pnpm db:use-local-sqlite

# local SQLite refuge → Supabase
pnpm db:restore-supabase
```

## Supabase/backup → SQLite refuge

1. 최신 backup JSON이 있는지 확인한다.

    ```txt
    backup/supabase-backups/public-schema-backup-20260421-172728.json
    ```

2. backup 또는 Supabase 데이터를 로컬 SQLite로 복원하고 refuge mode를 켠다.

    ```bash
    pnpm db:use-local-sqlite
    ```

3. 로컬 admin도 일반 credentials 로그인으로 들어간다.

    ```txt
    AUTH_SECRET=...
    AUTH_ADMIN_EMAIL=...
    AUTH_ADMIN_PASSWORD_HASH=scrypt\$...\$...
    ```

    refuge mode는 admin session을 자동 생성하지 않는다. `AUTH_SECRET`이 없으면 Auth.js가 `/api/auth/session`에서 `MissingSecret`으로 실패하므로, 로컬 `.env.local`에 명시적으로 둔다.

    `AUTH_ADMIN_PASSWORD_HASH`의 `$`는 `.env.local`에서 변수 치환 문자로 해석된다. raw `scrypt$...$...`를 넣으면 Next env loader가 salt/hash 조각을 날려 `scrypt`만 남길 수 있으므로, 로컬에는 `scrypt\$...\$...`처럼 escape한 값을 둔다.

    Supabase가 꺼진 상태에서 production build 기반 local smoke/push gate(`next start`)까지 refuge DB로 실행해야 하면 현재 shell에만 추가한다. Vercel에는 절대 등록하지 않는다.

    ```txt
    SQLITE_REFUGE_ALLOW_LOCAL_START=local-dev-only
    ```

4. 출력에서 다음을 확인한다.
    - `ok: true`
    - `activated: true`
    - `.local/refuge/refuge.db`
    - `.local/refuge/manifest.json`
    - `.local/refuge/mode.json`

5. 이 상태에서 앱은 server-side Supabase access를 supported table에 한해 `.local/refuge/refuge.db`로 라우팅한다.

주의:

- `.local/refuge/journal.ndjson`는 refuge mode 중 발생한 local mutation replay 기록이다.
- admin은 refuge mode에서도 credentials 로그인을 사용한다. local `next start`는 별도 `SQLITE_REFUGE_ALLOW_LOCAL_START=local-dev-only` opt-in이 있을 때만 refuge DB를 읽는다.
- `admin_login_attempts`는 SQLite refuge에서 local-only table로 동작한다. 로그인 rate limit은 로컬 DB로 fail-closed 상태를 유지하지만, Supabase 복귀 때 replay하지 않는다.
- unsupported DB mutation은 admin UI 또는 server action 경계에서 제한된다.
- R2 image upload, storage list/move/delete는 core asset 기능이므로 계속 동작해야 한다.

## SQLite refuge → Supabase

1. dev server를 먼저 종료한다. `pnpm db:restore-supabase`는 dev server가 실행 중이면 시작 단계에서 중단한다.

2. Supabase env가 준비됐는지 확인한다.

    ```txt
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    SUPABASE_SECRET_KEY
    ```

3. 단일 복귀 명령을 실행한다.

    ```bash
    pnpm db:restore-supabase
    ```

4. 명령은 confirmation 전에 다음을 자동 수행한다.
    - `.local/refuge-backups/<timestamp>/`에 local DB, journal, manifest, mode, env backup 생성
    - Supabase current rows와 journal `before` 값을 비교하는 remote-checked replay plan 생성
    - conflict가 있으면 Supabase write 없이 중단

5. conflict가 없으면 한 번만 confirmation을 묻는다.

    ```txt
    Proceed with Supabase apply and deactivate SQLite refuge mode? [y/N]
    ```

6. `y`를 입력하면 다음을 자동 수행한다.
    - Supabase pre-push snapshot 생성
    - journal apply 직전 drift 재검사
    - SQLite refuge journal을 Supabase로 replay
    - `.local/refuge/mode.json`을 `supabase-primary`로 전환
    - `.env.local`의 `SQLITE_REFUGE_ALLOW_LOCAL_START` 제거

7. 완료 후 admin 화면에서 Supabase-primary smoke check를 진행한다.

## 빠른 체크리스트

### refuge 진입

- [ ] backup JSON 위치 확인
- [ ] `pnpm db:use-local-sqlite`
- [ ] `.env.local`에 `AUTH_SECRET`, `AUTH_ADMIN_EMAIL`, `AUTH_ADMIN_PASSWORD_HASH` 확인
- [ ] `activated: true` 확인
- [ ] `/admin/login`으로 로그인 후 admin 핵심 화면 smoke check

### Supabase 복귀

- [ ] dev server 종료
- [ ] Supabase env 확인
- [ ] `pnpm db:restore-supabase`
- [ ] conflict 없음 확인
- [ ] confirmation에서 `y` 입력
- [ ] Supabase-primary smoke check

## 하지 말 것

- dev server가 켜진 상태에서 Supabase 복귀를 진행하지 않는다.
- conflict가 있는 replay plan을 강제로 반영하지 않는다.
- `.local/refuge/journal.ndjson`를 수동 편집하지 않는다.
- R2 asset move/delete를 refuge라는 이유만으로 끄지 않는다.
- `SQLITE_REFUGE_ALLOW_LOCAL_START`를 Vercel Production/Preview 환경변수에 등록하지 않는다.
