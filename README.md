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
