# SEO 설정 가이드

Google과 NAVER 검색 엔진에 사이트를 등록하는 방법.

---

## 사전 준비

- 사이트가 Vercel에 배포된 상태여야 함
- 커스텀 도메인이 있으면 더 좋지만, `*.vercel.app` 도메인으로도 가능

---

## 1단계 — robots.txt 추가

`src/app/robots.ts` 파일을 생성:

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.vercel.app";

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/admin", "/api"],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
```

- `/admin`과 `/api`는 검색 엔진이 크롤링하지 않도록 차단
- `NEXT_PUBLIC_SITE_URL` 환경 변수를 Vercel에 등록 (예: `https://gvm1229-portfolio.vercel.app`)

---

## 2단계 — sitemap.xml 추가

`src/app/sitemap.ts` 파일을 생성:

```ts
import type { MetadataRoute } from "next";
import { serverClient } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.vercel.app";

    // 정적 페이지
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 1.0,
        },
        {
            url: `${baseUrl}/resume`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/portfolio`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.7,
        },
    ];

    // 동적 페이지: 블로그 글
    let blogPages: MetadataRoute.Sitemap = [];
    if (serverClient) {
        const { data: posts } = await serverClient
            .from("posts")
            .select("slug, updated_at")
            .eq("published", true);
        if (posts) {
            blogPages = posts.map((post) => ({
                url: `${baseUrl}/blog/${post.slug}`,
                lastModified: new Date(post.updated_at),
                changeFrequency: "weekly" as const,
                priority: 0.6,
            }));
        }
    }

    // 동적 페이지: 포트폴리오 상세
    let portfolioPages: MetadataRoute.Sitemap = [];
    if (serverClient) {
        const { data: items } = await serverClient
            .from("portfolio_items")
            .select("slug, updated_at")
            .eq("published", true);
        if (items) {
            portfolioPages = items.map((item) => ({
                url: `${baseUrl}/portfolio/${item.slug}`,
                lastModified: new Date(item.updated_at),
                changeFrequency: "monthly" as const,
                priority: 0.6,
            }));
        }
    }

    return [...staticPages, ...blogPages, ...portfolioPages];
}
```

배포 후 `https://yoursite.vercel.app/sitemap.xml`에 접속하면 XML이 표시됨.

---

## 3단계 — Google Search Console 등록

### 3-1. Search Console 접속

1. [Google Search Console](https://search.google.com/search-console) 접속
2. **속성 추가** 클릭
3. **URL 접두어** 선택 → 사이트 URL 입력 (예: `https://gvm1229-portfolio.vercel.app`)

### 3-2. 소유권 확인

**방법 A — HTML 태그 (권장)**

1. Google이 제공하는 메타 태그를 복사:
    ```html
    <meta name="google-site-verification" content="AbCdEf123456" />
    ```
2. `src/app/layout.tsx`의 `metadata`에 추가:
    ```ts
    export const metadata: Metadata = {
        title: "PortareFolium",
        description: "포트폴리오 & 기술 블로그",
        icons: { icon: "/favicon.svg" },
        verification: {
            google: "AbCdEf123456", // Google Search Console 인증 코드
        },
    };
    ```
3. 배포 후 Search Console에서 **확인** 클릭

**방법 B — HTML 파일**

1. Google이 제공하는 `googleXXXXXX.html` 파일을 다운로드
2. `public/` 디렉토리에 넣기
3. 배포 후 `https://yoursite.vercel.app/googleXXXXXX.html`에 접속되면 성공
4. Search Console에서 **확인** 클릭

### 3-3. 사이트맵 제출

1. Search Console → **Sitemaps** 메뉴
2. `sitemap.xml` 입력 후 **제출**
3. 상태가 **성공**으로 변경되면 완료

### 3-4. 색인 생성 요청

1. Search Console → **URL 검사**
2. 사이트 URL 입력 → **색인 생성 요청** 클릭
3. 주요 페이지(홈, Resume, Portfolio, Blog)에 대해 반복
4. 색인이 완료되기까지 보통 1~7일 소요

---

## 4단계 — NAVER Search Advisor 등록

### 4-1. Search Advisor 접속

1. [NAVER Search Advisor](https://searchadvisor.naver.com) 접속
2. 네이버 계정으로 로그인
3. **웹마스터 도구** → **사이트 추가** 클릭
4. 사이트 URL 입력

### 4-2. 소유권 확인

**방법 A — HTML 태그 (권장)**

1. NAVER가 제공하는 메타 태그를 복사:
    ```html
    <meta name="naver-site-verification" content="abcdef1234567890" />
    ```
2. `src/app/layout.tsx`의 `metadata`에 추가:
    ```ts
    export const metadata: Metadata = {
        title: "PortareFolium",
        description: "포트폴리오 & 기술 블로그",
        icons: { icon: "/favicon.svg" },
        verification: {
            google: "AbCdEf123456",
            other: {
                "naver-site-verification": "abcdef1234567890",
            },
        },
    };
    ```
3. 배포 후 Search Advisor에서 **확인** 클릭

**방법 B — HTML 파일**

1. NAVER가 제공하는 `naverXXXXXX.html` 파일을 다운로드
2. `public/` 디렉토리에 넣기
3. 배포 후 확인

### 4-3. 사이트맵 제출

1. Search Advisor → **요청** → **사이트맵 제출**
2. `https://yoursite.vercel.app/sitemap.xml` 입력 후 **확인**

### 4-4. RSS 제출 (선택)

블로그 글의 RSS 피드가 있다면 **요청** → **RSS 제출**에서 등록. 현재 프로젝트에는 RSS가 없으므로 별도 구현 필요.

### 4-5. 웹 페이지 수집 요청

1. Search Advisor → **요청** → **웹 페이지 수집**
2. 주요 페이지 URL을 하나씩 입력하여 수집 요청
3. NAVER 검색 결과에 반영되기까지 보통 3~14일 소요

---

## 5단계 — Open Graph 메타데이터 확인

검색 결과와 SNS 공유 시 미리보기를 위해 각 페이지의 `generateMetadata`에 `openGraph` 속성이 포함되어 있는지 확인:

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
    return {
        title: "글 제목",
        description: "글 설명",
        openGraph: {
            title: "글 제목",
            description: "글 설명",
            url: `https://yoursite.vercel.app/blog/${slug}`,
            type: "article",
            images: [{ url: "썸네일 URL" }],
        },
    };
}
```

각 페이지별 `generateMetadata`는 이미 `src/app/(frontend)/blog/[slug]/page.tsx`, `portfolio/[slug]/page.tsx` 등에 구현되어 있음. `openGraph.images`가 빠져 있다면 추가.

---

## 환경 변수 요약

| 변수                   | 값                                                           | 어디에           |
| ---------------------- | ------------------------------------------------------------ | ---------------- |
| `NEXT_PUBLIC_SITE_URL` | 사이트 전체 URL (예: `https://gvm1229-portfolio.vercel.app`) | Vercel 환경 변수 |

---

## 체크리스트

- [ ] `src/app/robots.ts` 생성
- [ ] `src/app/sitemap.ts` 생성
- [ ] `NEXT_PUBLIC_SITE_URL` Vercel 환경 변수 등록
- [ ] `https://yoursite.vercel.app/robots.txt` 접속 확인
- [ ] `https://yoursite.vercel.app/sitemap.xml` 접속 확인
- [ ] Google Search Console 소유권 확인 완료
- [ ] Google Search Console 사이트맵 제출 완료
- [ ] NAVER Search Advisor 소유권 확인 완료
- [ ] NAVER Search Advisor 사이트맵 제출 완료
- [ ] 주요 페이지 색인 생성 요청 (Google + NAVER)
