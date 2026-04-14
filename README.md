# PortareFolium

Next.js 16 App Router + Supabase 기반 포트폴리오 & 기술 블로그 템플릿. Admin 대시보드에서 블로그, 포트폴리오, About me 콘텐츠를 직접 관리함.

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

## 방법 A — Fork 배포 _(업데이트 받기)_

### 2A단계 — 저장소 Fork

1. GitHub에서 **[Fork 하기](https://github.com/FoliumTeam/PortareFolium/fork)** 버튼을 클릭함.
2. 내 GitHub 계정에 Fork가 생성됨.

### 3A단계 — Vercel에 배포

1. [vercel.com/new](https://vercel.com/new)에서 **Import Git Repository**를 클릭함.
2. 방금 Fork한 저장소를 선택함.
3. **Environment Variables**에 아래 값을 입력함:

| 변수                            | 값                       |
| ------------------------------- | ------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase 프로젝트 URL    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service_role 키 |

4. **Deploy**를 클릭함.

### 업데이트 받는 법

템플릿에 새 업데이트가 나오면, 내 GitHub Fork 페이지에서 **Sync fork** 버튼을 클릭함. Vercel이 자동으로 재배포함.

---

## 방법 B — 원클릭 배포 _(독립 복사본)_

### 2B단계 — Vercel에 배포

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/FoliumTeam/PortareFolium&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY&envDescription=Supabase%20인증%20정보.%20아래%20README%를%20참고.&envLink=https://github.com/FoliumTeam/PortareFolium&project-name=portare-folium&repository-name=portare-folium)

위 버튼을 클릭하고 환경 변수를 입력함:

| 변수                            | 값                       |
| ------------------------------- | ------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase 프로젝트 URL    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service_role 키 |

---

## 이후 공통 설정

### 3단계 — Admin 계정 생성

첫 배포 완료 후, Supabase 프로젝트 → **Authentication → Users → Add user**에서 계정을 만듦. 이 계정으로 `yoursite.vercel.app/admin`에 로그인함.

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

## 개발자용: GitHub Actions CI 설정

> 이 섹션은 이 저장소를 **clone하여 직접 개발**하는 분을 위한 내용임. Fork 배포 또는 원클릭 배포로 사이트만 운영하는 경우 설정할 필요 없음.

이 프로젝트는 `main` 또는 `test` 브랜치에 push하거나, `main`으로 PR을 생성하면 GitHub Actions가 자동으로 빌드 + E2E 테스트(Chromium/Firefox/WebKit)를 실행함. CI가 정상 동작하려면 GitHub Secrets에 Supabase 인증 정보를 등록해야 함.

### 설정 방법

1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions** 클릭
2. **New repository secret** 버튼으로 아래 3개를 각각 추가:

| Secret 이름                     | 값                              | 어디서 찾나                              |
| ------------------------------- | ------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase 프로젝트 URL           | Supabase → Settings → API → Project URL  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public 키         | Supabase → Settings → API → anon public  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service_role secret 키 | Supabase → Settings → API → service_role |

3. 설정 완료 후 push하면 **Actions** 탭에서 테스트 실행 결과를 확인할 수 있음.

### CI가 실행하는 항목

| 단계      | 내용                                               |
| --------- | -------------------------------------------------- |
| Install   | `pnpm install --frozen-lockfile`                   |
| Build     | `pnpm build` (Next.js 정적 생성)                   |
| Unit Test | `pnpm test run` (Vitest)                           |
| E2E Test  | Chromium / Firefox / WebKit 병렬 실행 (Playwright) |

테스트가 실패하면 PR에 ❌가 표시되고, **Actions** 탭에서 실패 로그와 Playwright 리포트를 다운로드할 수 있음.
