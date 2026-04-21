# TEST

## 테스트 인프라

| 도구                     | 용도                                         | 실행 명령어       |
| ------------------------ | -------------------------------------------- | ----------------- |
| Vitest + Testing Library | 단위 테스트 (유틸 함수, 데이터 변환)         | `pnpm test`       |
| Playwright               | E2E 테스트 (크로스 브라우저 + 반응형 + 인증) | `pnpm test:e2e`   |
| Husky pre-push           | 로컬 strict E2E gate (push 시 자동 실행)     | `.husky/pre-push` |

## Playwright 구조

### 실행 방법

```bash
pnpm test:e2e              # 전체 (5 공개 + 3 인증 프로젝트)
pnpm test:e2e:chromium     # Chromium만 (빠른 확인)
pnpm test:e2e:ui           # Playwright UI 모드 (디버깅)
```

### 브라우저 프로젝트

`playwright.config.ts`에 정의된 프로젝트:

| 프로젝트                 | 브라우저        | 인증   | 설명                       |
| ------------------------ | --------------- | ------ | -------------------------- |
| `chromium`               | Desktop Chrome  | 불필요 | 공개 페이지 테스트         |
| `firefox`                | Desktop Firefox | 불필요 | 공개 페이지 테스트         |
| `webkit`                 | Desktop Safari  | 불필요 | 공개 페이지 테스트         |
| `mobile-chrome`          | Pixel 5         | 불필요 | 모바일 반응형 테스트       |
| `mobile-safari`          | iPhone 12       | 불필요 | 모바일 반응형 테스트       |
| `authenticated-chromium` | Desktop Chrome  | 필요   | 인증 필요 기능 테스트      |
| `authenticated-firefox`  | Desktop Firefox | 필요   | 인증 필요 기능 테스트      |
| `authenticated-webkit`   | Desktop Safari  | 필요   | 인증 필요 기능 테스트      |
| `setup`                  | Chromium (기본) | —      | 로그인 + storageState 저장 |

### 인증 흐름

`e2e/auth.setup.ts`가 Supabase 로그인을 수행하고 `.auth/user.json`에 `storageState`를 저장. `authenticated-*` 프로젝트는 이 파일을 브라우저 세션에 로드하여 로그인 상태로 테스트 실행.

필요 환경 변수 (`.env.local`):

- `E2E_EMAIL` — Supabase에 등록된 Admin 이메일
- `E2E_PASSWORD` — 해당 계정 패스워드

### 서버 기동

| 환경 | 명령어       | 이유                                  |
| ---- | ------------ | ------------------------------------- |
| 로컬 | `pnpm dev`   | 빠른 HMR, `reuseExistingServer: true` |
| CI   | `pnpm start` | 빌드 결과물 서빙 (빠르고 안정적)      |

`playwright.config.ts`의 `webServer` 설정이 환경(`process.env.CI`)에 따라 자동 선택.

## E2E 테스트 목록

### 공개 페이지 (인증 불필요)

#### `e2e/smoke.spec.ts` — 페이지 로딩 (6 테스트)

- 홈, Resume, Portfolio, Blog, About 페이지가 HTTP 400 미만 상태로 로딩
- 존재하지 않는 경로 → 404 반환

#### `e2e/navigation.spec.ts` — 네비게이션 (3 테스트)

- 헤더가 모든 페이지에 표시
- Resume 링크 클릭 → `/resume` 이동
- 로고/홈 링크 → `/` 복귀

#### `e2e/theme.spec.ts` — 테마 전환 (1 테스트)

- 다크/라이트 모드 토글 버튼 클릭 시 `<html>` class 변경

#### `e2e/responsive.spec.ts` — 반응형 레이아웃 (9 테스트)

- mobile (375px), tablet (768px), desktop (1440px) 3개 viewport
- 홈, Resume, Portfolio 각 페이지에서 수평 스크롤바(overflow) 없음 확인

#### `e2e/seo.spec.ts` — SEO + 접근성 (9 테스트)

- 5개 주요 페이지에 `<title>` 존재
- 홈 페이지 `<meta name="description">` 존재
- `<meta name="viewport">` 존재
- Resume 페이지의 모든 `<img>`에 `alt` 속성 존재
- `<html lang>` 속성 존재

#### `e2e/content-rendering.spec.ts` — 콘텐츠 렌더링 (5 테스트)

- 코드 블록 (Shiki): `pre code[data-language]` 존재 확인
- 이미지 lazy loading: `img[loading="lazy"]` 존재 확인
- 목차 (TOC): `nav a[href^="#"]` anchor 링크 존재 확인
- Mermaid 다이어그램: mermaid 블록이 있을 때 SVG 렌더링 확인
- KaTeX 수식: `.katex` 요소 존재 확인

### 인증 필요 (Admin 로그인 후)

#### `e2e/authenticated/pdf-export.spec.ts` — PDF Export (7 테스트)

**Resume:**

- PDF 내보내기 버튼이 인증 상태에서 표시
- 프리뷰 모달 열림 — 사이드바 (Color Scheme 드롭다운, 페이지 수, 다운로드 버튼) 확인
- 페이지 구분선 (dashed red line) 존재 확인
- 컬러 스킴 변경 (Black & White → Blue) 시 페이지 수 동일 유지
- 프로젝트 카드 grid 2열 레이아웃 유지 확인
- ESC 키로 모달 닫기

**Portfolio:**

- PDF 내보내기 버튼 표시 + 모달 열림 + 페이지 수 표시

## Push Gate (로컬 Husky pre-push)

v0.12.50부터 GitHub Actions E2E workflow (`.github/workflows/e2e.yml`)는 제거됨. Cloudflare R2 `pub-*.r2.dev` 가 GitHub Actions runner IP를 abuse filter로 상시 차단해 Next.js image optimization이 항상 400 반환, CI E2E 통과 불가였기 때문.

대체 gate: `.husky/pre-push`

```sh
pnpm exec playwright test --project=chromium --project=authenticated-chromium
```

- `git push` 시 자동 실행
- Chromium + authenticated-chromium 프로젝트만 (Firefox/WebKit/mobile은 로컬 수동 실행)
- 실패 시 push 차단. `--no-verify` 우회 금지 — 유일한 E2E 통과 검증 수단
- 필요 `.env.local` 항목: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `E2E_EMAIL`, `E2E_PASSWORD`, `R2_PUBLIC_URL`

## 수동 테스트 체크리스트

E2E로 커버하기 어려운 항목. 해당 영역을 수정했을 때만 수동 확인.

### PDF Export

- [ ] 모든 섹션이 페이지 경계에서 잘리지 않음
- [ ] 프로젝트 카드가 행 단위로 페이지 이동
- [ ] PDF 다운로드 후 각 페이지 콘텐츠 잘림 없음
- [ ] 4종 Resume 레이아웃 모두 확인

### Admin CRUD

- [ ] 포스트 생성 → 편집 → 발행 → 삭제
- [ ] 자동저장 동작 (SaveIndicator 상태 변화)
- [ ] 발행 후 프론트엔드 반영 (ISR revalidation)

## 새 E2E 테스트 추가 시

1. `e2e/` 디렉토리에 `*.spec.ts` 파일 생성 (공개 페이지)
2. 인증 필요 시 `e2e/authenticated/` 디렉토리에 생성 — `storageState` 자동 적용
3. 데이터 비의존적 테스트 우선 (DB 상태에 관계없이 통과)
4. 셀렉터는 `id`, `role`, `getByText({ exact: true })` 우선 — `text=` 셀렉터는 strict mode 위반 주의
