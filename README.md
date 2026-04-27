# PortareFolium

Next.js 16 App Router + Supabase 기반 포트폴리오 & 기술 블로그 템플릿. Admin 대시보드에서 블로그, 포트폴리오, About me 콘텐츠를 직접 관리함.

---

## 릴리즈 알림 구독

새 버전이 출시될 때 GitHub 알림을 받으려면:

1. 이 저장소 상단의 **Watch** 버튼을 클릭.
2. **Custom** 을 선택.
3. **Releases** 항목만 체크하고 **Apply** 를 클릭.
4. [GitHub Notification Settings](https://github.com/settings/notifications) 을 클릭.
5. 페이지 상단의 Custom Routing 섹션에 `FoliumTeam` 이 리스트에 있는지 확인.
    - 만약 있다면, 그 옆의 설정이 `Email` 이 아닌 `Inbox` 로만 되어있을 수도 있음.
    - 저걸 `Email` 또는 `Both` 로 바꿔야 함.

이후 새 릴리즈가 발행될 때마다 GitHub 알림(및 이메일)이 전송됨.

---

## 배포 방법 선택

|               | A — Fork 배포 _(권장)_                        | B — 원클릭 배포             |
| ------------- | --------------------------------------------- | --------------------------- |
| **추천 대상** | 비개발자, 템플릿 업데이트를 받고 싶은 분      | 웹 개발자, 직접 커스텀할 분 |
| **업데이트**  | GitHub **Sync fork** 버튼 한 번으로 자동 반영 | 없음 (직접 적용)            |
| **내 저장소** | 원본과 연결된 Fork                            | 독립 복사본                 |

---

## 1단계 — Supabase 프로젝트 생성 (공통)

두 방법 모두 먼저 Supabase를 설정해야 함.

1. [supabase.com](https://supabase.com)에서 무료 프로젝트를 만듦.
2. **SQL Editor**에서 이 저장소의 `supabase/setup.sql` 내용을 붙여넣고 실행. 테이블, RLS 정책, 이미지 Storage 버킷, 초기 설정이 한 번에 구성됨.
3. **Settings → API**에서 아래 값을 복사해 둠:
    - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
    - **anon public** 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - **service_role secret** 키 → `SUPABASE_SERVICE_ROLE_KEY` _(절대 외부에 노출하지 말 것)_

---

## 2단계 — Cloudflare R2 이미지 CDN 설정 (공통)

이미지 저장소로 Cloudflare R2를 사용함. Supabase Storage 대비 egress 비용이 $0이므로 트래픽 제한 없이 이미지를 서빙할 수 있음.

1. [Cloudflare 계정](https://dash.cloudflare.com) 생성 후 로그인
2. 좌측 메뉴 → **R2 Object Storage** → **"Create bucket"** 클릭
    - Bucket name: 원하는 이름 (예: `my-portfolio-images`)
    - Location: Automatic 또는 원하는 리전
3. 생성된 bucket → **Settings** → **Public Development URL** → r2.dev subdomain 생성 → 상단 대시보드의 **"Allow Access"** 부분이 활성화됨
    - 발급된 `https://pub-xxxxxxxxxxxx.r2.dev` URL을 복사해 둠
4. R2 페이지 우측 **Account Details** → **API Tokens** 옆 **"Manage"** 클릭
    - **Account API token** 선택
    - Permission: **Object Read & Write**
    - Bucket scope: 생성한 bucket 지정
    - 발급 후 **Access Key ID**와 **Secret Access Key**를 즉시 복사 (재조회 불가)
5. R2 개요 페이지에서 **Account ID** 확인 (또는 S3 endpoint URL `https://<account-id>.r2.cloudflarestorage.com`에서 추출)

---

## 방법 A — Fork 배포 _(업데이트 받기)_

### 2A단계 — 저장소 Fork

1. GitHub에서 **[Fork 하기](https://github.com/FoliumTeam/PortareFolium/fork)** 버튼을 클릭함.
2. 내 GitHub 계정에 Fork가 생성됨.

### 3A단계 — Vercel에 배포

1. [vercel.com/new](https://vercel.com/new)에서 **Import Git Repository**를 클릭함.
2. 방금 Fork한 저장소를 선택함.
3. **Environment Variables**에 아래 값을 입력함:

| 변수                            | 값                                |
| ------------------------------- | --------------------------------- |
| `AUTH_SECRET`                   | 아래 명령으로 생성한 랜덤 secret  |
| `AUTH_ADMIN_EMAIL`              | 관리자 로그인 email               |
| `AUTH_ADMIN_PASSWORD_HASH`      | 아래 명령으로 생성한 scrypt hash  |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase 프로젝트 URL             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service_role 키          |
| `R2_ACCOUNT_ID`                 | Cloudflare Account ID             |
| `R2_ACCESS_KEY_ID`              | R2 API token Access Key ID        |
| `R2_SECRET_ACCESS_KEY`          | R2 API token Secret Access Key    |
| `R2_BUCKET`                     | R2 bucket 이름                    |
| `R2_PUBLIC_URL`                 | R2 public URL (`https://pub-...`) |

1. **Deploy**를 클릭함.

### 업데이트 받는 법

템플릿에 새 업데이트가 나오면, 내 GitHub Fork 페이지에서 **Sync fork** 버튼을 클릭함. Vercel이 자동으로 재배포함.

### 새 버전 알림 받기 _(이메일)_

새 release가 올라올 때 이메일로 알림을 받으려면:

1. 원본 저장소 [FoliumTeam/PortareFolium](https://github.com/FoliumTeam/PortareFolium) 우상단 **Watch** → **Custom** → **Releases** 체크
2. GitHub 우상단 프로필 → **Settings** → **Notifications**에서 **Email** 수신 활성화 확인

이렇게 하면 새 minor 버전(`v*.*.0`) release가 발행될 때마다 등록된 이메일로 알림이 옵니다. patch 단위 변경은 알림 없이 누적되며, 의미 있는 업데이트 묶음만 release로 발행됩니다.

---

## 방법 B — 원클릭 배포 _(독립 복사본)_

### 2B단계 — Vercel에 배포

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/FoliumTeam/PortareFolium&env=AUTH_SECRET,AUTH_ADMIN_EMAIL,AUTH_ADMIN_PASSWORD_HASH,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,R2_ACCOUNT_ID,R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY,R2_BUCKET,R2_PUBLIC_URL&envDescription=Admin%20credentials%20%2B%20Supabase%20%2B%20Cloudflare%20R2%20%ED%99%98%EA%B2%BD%20%EB%B3%80%EC%88%98.%20%EC%95%84%EB%9E%98%20README%EB%A5%BC%20%EC%B0%B8%EA%B3%A0.&envLink=https://github.com/FoliumTeam/PortareFolium&project-name=portare-folium&repository-name=portare-folium)

위 버튼을 클릭하고 환경 변수를 입력함:

| 변수                            | 값                                |
| ------------------------------- | --------------------------------- |
| `AUTH_SECRET`                   | 아래 명령으로 생성한 랜덤 secret  |
| `AUTH_ADMIN_EMAIL`              | 관리자 로그인 email               |
| `AUTH_ADMIN_PASSWORD_HASH`      | 아래 명령으로 생성한 scrypt hash  |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase 프로젝트 URL             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service_role 키          |
| `R2_ACCOUNT_ID`                 | Cloudflare Account ID             |
| `R2_ACCESS_KEY_ID`              | R2 API token Access Key ID        |
| `R2_SECRET_ACCESS_KEY`          | R2 API token Secret Access Key    |
| `R2_BUCKET`                     | R2 bucket 이름                    |
| `R2_PUBLIC_URL`                 | R2 public URL (`https://pub-...`) |

---

## 이후 공통 설정

### 3단계 — Admin 계정 생성

Admin은 Supabase Auth 계정이 아니라 Vercel 환경 변수의 credentials로 로그인함.

1. `AUTH_SECRET` 값을 생성함:

    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```

2. 실제 로그인에 사용할 비밀번호로 `AUTH_ADMIN_PASSWORD_HASH`를 생성함. `YOUR_PASSWORD`를 원하는 비밀번호로 바꿔 실행:

    ```bash
    node -e "const { randomBytes, scryptSync } = require('crypto'); const salt = randomBytes(16).toString('hex'); const hash = scryptSync('YOUR_PASSWORD', salt, 64).toString('hex'); console.log('scrypt$' + salt + '$' + hash)"
    ```

3. Vercel → Project → **Settings → Environment Variables**에 아래 3개를 추가하고 redeploy:

    | 변수                       | 값                                            |
    | -------------------------- | --------------------------------------------- |
    | `AUTH_SECRET`              | 1번 명령 출력값                               |
    | `AUTH_ADMIN_EMAIL`         | `/admin/login`에서 입력할 관리자 email        |
    | `AUTH_ADMIN_PASSWORD_HASH` | 2번 명령 출력값 (`scrypt$<salt>$<hash>` 형식) |

4. `https://your-site.vercel.app/admin/login`에서 `AUTH_ADMIN_EMAIL`과 원래 비밀번호(`YOUR_PASSWORD`)로 로그인함.

설정이 누락되었거나 형식이 틀리면 `/admin/login`이 필요한 환경 변수와 생성 명령을 안내함. 실제 secret/hash 값은 화면에 표시하지 않음.

### 4단계 — 콘텐츠 입력

`/admin`에 로그인해 About me, 포트폴리오, 블로그 글을 채우면 됨. Color Scheme과 직군(Job Field)은 Admin → **Site Config**에서 언제든 변경 가능.

---

### 5단계 — SEO (검색 엔진 등록)

사이트를 Google과 NAVER 검색에 노출시키려면 아래 단계를 따를 것. `robots.txt`와 `sitemap.xml`은 이미 코드에 포함되어 있으므로 환경 변수 설정 + 검색 엔진 등록만 하면 됨.

#### 환경 변수 등록

Vercel 프로젝트 → **Settings** → **Environment Variables**에서 아래 변수를 추가:

| 변수                              | 값                               | 비고                 |
| --------------------------------- | -------------------------------- | -------------------- |
| `NEXT_PUBLIC_SITE_URL`            | `https://your-domain.vercel.app` | 사이트 canonical URL |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Google Search Console 인증 코드  | 아래 절차에서 발급   |
| `NEXT_PUBLIC_NAVER_VERIFICATION`  | NAVER Search Advisor 인증 코드   | 아래 절차에서 발급   |

#### Google Search Console

1. [Google Search Console](https://search.google.com/search-console) 접속 → **속성 추가** → URL 접두어 선택 → 사이트 URL 입력
2. 소유권 확인: **HTML 태그** 방식 선택 → 메타 태그의 `content` 값을 복사 → Vercel 환경 변수 `NEXT_PUBLIC_GOOGLE_VERIFICATION`에 등록 → 재배포 후 확인
3. **Sitemaps** 메뉴에서 `sitemap.xml` 제출
4. **URL 검사**에서 주요 페이지(홈, Resume, Portfolio, Blog) 색인 생성 요청 (반영까지 1~7일)

#### NAVER Search Advisor

1. [NAVER Search Advisor](https://searchadvisor.naver.com) 접속 → 사이트 추가
2. 소유권 확인: **HTML 태그** 방식 선택 → 메타 태그의 `content` 값을 복사 → Vercel 환경 변수 `NEXT_PUBLIC_NAVER_VERIFICATION`에 등록 → 재배포 후 확인
3. **요청** → **사이트맵 제출**에서 `https://your-domain.vercel.app/sitemap.xml` 입력
4. **요청** → **웹 페이지 수집**에서 주요 페이지 URL 수집 요청 (반영까지 3~14일)

---

## 개발자용: 로컬 테스트 gate

> 이 섹션은 이 저장소를 **clone하여 직접 개발**하는 분을 위한 내용임. Fork 배포 또는 원클릭 배포로 사이트만 운영하는 경우 설정할 필요 없음.

GitHub Actions CI E2E workflow는 v0.12.50에서 제거됐음. Cloudflare R2 `pub-*.r2.dev` 가 GitHub Actions runner IP를 abuse filter로 차단해 Next.js image optimization이 항상 400 반환, CI E2E 통과 불가였기 때문. 대신 로컬 Husky hook으로 gate를 대체.

### Husky 훅

| 훅                  | 실행 시점    | 검증 항목                                                                             |
| ------------------- | ------------ | ------------------------------------------------------------------------------------- |
| `.husky/pre-commit` | `git commit` | `pnpm exec lint-staged` + `pnpm vitest run` (Prettier + unit tests)                   |
| `.husky/pre-push`   | `git push`   | `pnpm exec playwright test --project=chromium --project=authenticated-chromium` (E2E) |

`--no-verify`로 hook 우회 금지 — push gate가 유일한 E2E 통과 검증.

### 필요 로컬 env (`.env.local`)

| 변수                            | 용도                         |
| ------------------------------- | ---------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase 프로젝트 URL        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public 키      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service_role secret |
| `R2_PUBLIC_URL`                 | Cloudflare R2 public URL     |
| `E2E_EMAIL`, `E2E_PASSWORD`     | 인증 E2E 로그인 자격         |
