# FoliumOnline

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/FoliumTeam/PortareFolium&env=PUBLIC_SUPABASE_URL,PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY&envDescription=Supabase%20인증%20정보.%20아래%20README%를%20참고.&envLink=https://github.com/FoliumTeam/PortareFolium&project-name=portare-folium&repository-name=portare-folium)

Astro 5 + Supabase 기반 포트폴리오 & 기술 블로그 템플릿. 코드 수정 없이 Vercel에 원클릭 배포 가능. Admin 대시보드에서 블로그, 포트폴리오, About me 콘텐츠를 직접 관리함.

---

## 배포 방법

### 1단계 — Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com)에서 무료 프로젝트를 만듦.
2. **SQL Editor**에서 이 저장소의 `supabase/setup.sql` 내용을 붙여넣고 실행. 테이블, RLS 정책, 이미지 Storage 버킷, 초기 설정이 한 번에 구성됨.
3. **Settings → API**에서 아래 값을 복사해 둠:
    - **Project URL** → `PUBLIC_SUPABASE_URL`
    - **anon public** 키 → `PUBLIC_SUPABASE_ANON_KEY`
    - **service_role secret** 키 → `SUPABASE_SERVICE_ROLE_KEY` _(절대 외부에 노출하지 말 것)_

### 2단계 — Vercel에 배포

위 **Deploy with Vercel** 버튼을 클릭하고 환경 변수를 입력함:

| 변수                        | 값                       |
| --------------------------- | ------------------------ |
| `PUBLIC_SUPABASE_URL`       | Supabase 프로젝트 URL    |
| `PUBLIC_SUPABASE_ANON_KEY`  | Supabase anon 키         |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role 키 |

### 3단계 — Admin 계정 생성

첫 배포 완료 후, Supabase 프로젝트 → **Authentication → Users → Add user**에서 계정을 만듦. 이 계정으로 `yoursite.vercel.app/admin`에 로그인함.

### 4단계 — Publish 버튼 설정 _(권장)_

Admin 대시보드의 **게시(Publish)** 버튼은 블로그·포트폴리오 내용 변경 후 Vercel 재빌드를 자동으로 트리거함.

1. Vercel 프로젝트 → **Settings → Git → Deploy Hooks**에서 Hook을 생성함.
2. 생성된 URL을 복사함.
3. Vercel → **Settings → Environment Variables**에 추가:
    - `PUBLIC_VERCEL_DEPLOY_HOOK_URL` = 위에서 복사한 URL

> 이 단계는 Vercel 프로젝트가 먼저 존재해야 하므로 초기 배포 후에 설정함.

### 5단계 — 콘텐츠 입력

`/admin`에 로그인해 About me, 포트폴리오, 블로그 글을 채우면 됨. Color Scheme과 직군(Job Field)은 Admin → **Site Config**에서 언제든 변경 가능.
