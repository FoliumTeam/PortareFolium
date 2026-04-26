# SQLite Refuge 운영 가이드

Supabase가 내려갔을 때만 SQLite refuge를 임시 primary DB처럼 사용한다. R2는 별도 서비스이므로 refuge mode에서도 이미지 업로드와 blog/portfolio asset move/delete는 계속 허용한다.

## Supabase → SQLite refuge

1. 최신 backup JSON이 있는지 확인한다.

    ```txt
    backup/supabase-backups/public-schema-backup-20260421-172728.json
    ```

2. backup을 로컬 SQLite로 복원하고 refuge mode를 켠다.

    ```bash
    pnpm refuge:pull --activate
    ```

3. 로컬에서 admin을 항상 활성화해야 하면 `.env.local`에만 explicit opt-in을 둔다.

    ```txt
    SQLITE_REFUGE_ADMIN_BYPASS=local-dev-only
    ```

    이 값은 Vercel 환경변수에 등록하지 않는다. 코드도 `VERCEL=1`, `VERCEL_ENV=production`, non-localhost host에서는 bypass를 거부한다.

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
- admin 자동 활성화는 local dev + explicit opt-in + localhost + active refuge mode에서만 허용된다. local `next start`는 별도 `SQLITE_REFUGE_ALLOW_LOCAL_START=local-dev-only` opt-in이 있을 때만 refuge DB를 읽는다.
- unsupported DB mutation은 admin UI 또는 server action 경계에서 제한된다.
- R2 image upload, storage list/move/delete는 core asset 기능이므로 계속 동작해야 한다.

## SQLite refuge → Supabase

1. Supabase가 복구되고 env가 준비됐는지 확인한다.

    ```txt
    NEXT_PUBLIC_SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
    ```

2. 먼저 dry-run replay plan을 만든다.

    ```bash
    pnpm refuge:push
    ```

3. `.local/refuge/replay-plan.json`와 CLI 출력을 확인한다.
    - `ok: true`
    - `conflicts: []`
    - 예상한 `touchedTables`
    - 예상한 `operationCount`

4. 실제 Supabase 반영이 필요하고 conflict가 없을 때만 apply한다.

    ```bash
    pnpm refuge:push --apply
    ```

    `--apply`는 Supabase snapshot을 먼저 저장하고, 각 journal entry를 쓰기 직전에 drift를 다시 검사한다. drift/conflict가 있으면 중단해야 정상이다.

5. Supabase-primary로 복귀한다.

    ```bash
    pnpm refuge:deactivate
    ```

6. `.local/refuge/mode.json`이 `supabase-primary`인지 확인한다.

## 빠른 체크리스트

### refuge 진입

- [ ] backup JSON 위치 확인
- [ ] `pnpm refuge:pull --activate`
- [ ] local admin 자동 활성화가 필요하면 `.env.local`에 `SQLITE_REFUGE_ADMIN_BYPASS=local-dev-only`
- [ ] `activated: true` 확인
- [ ] admin 핵심 화면 smoke check

### Supabase 복귀

- [ ] Supabase env 확인
- [ ] `pnpm refuge:push` dry-run
- [ ] `conflicts: []` 확인
- [ ] 필요 시 `pnpm refuge:push --apply`
- [ ] `pnpm refuge:deactivate`
- [ ] Supabase-primary smoke check

## 하지 말 것

- `refuge:push --apply`를 dry-run 확인 없이 실행하지 않는다.
- conflict가 있는 replay plan을 강제로 반영하지 않는다.
- `.local/refuge/journal.ndjson`를 수동 편집하지 않는다.
- R2 asset move/delete를 refuge라는 이유만으로 끄지 않는다.
- `SQLITE_REFUGE_ADMIN_BYPASS` 또는 `SQLITE_REFUGE_ALLOW_LOCAL_START`를 Vercel Production/Preview 환경변수에 등록하지 않는다.
