# Vitest 테스트 스위트 문서 (Testing Suite Documentation)

이 문서는 `portare-folium` 프로젝트에 구성된 Vitest 테스트 스위트의 범위와 역할을 설명합니다.

## 코어 설정 (Core Setup)

- **프레임워크**: [Vitest](https://vitest.dev/)
- **환경**: JS DOM (`jsdom`)을 사용하여 프론트엔드 유틸리티를 위한 브라우저 환경을 모킹(mock)합니다.
- **글로벌 모킹 (Global Mocks)**:
    - 테마 로딩(Theme loading) 로직을 테스트할 때 오류가 발생하지 않도록 `window.matchMedia`를 모킹합니다.
    - DOM 교차 이벤트(예: TableOfContents 목차 하이라이팅) 테스트 시 에러를 방지하기 위해 `IntersectionObserver`를 모킹합니다.

## 테스트 스위트 (Test Suites)

### 1. 목차(TOC) 추출기 (`src/__tests__/toc.test.ts`)

블로그 및 포트폴리오 게시글의 계층적 구조를 생성하는 AST 매핑을 검증합니다.

- `extractTocFromHtml()`:
    - HTML `<h2>` 및 `<h3>` 태그가 텍스트와 `id` 속성을 올바르게 추출하는지 확인합니다.
    - 정확한 트리 구조 형성 여부를 검증합니다: `<h3>` 요소가 직전의 `<h2>` 요소 아래에 올바르게 중첩되는지 확인합니다.
    - 끊어진 계층이나 잘못된 형식의 HTML 에지 케이스를 안전하게 무시하여 크래시를 방지하는지 테스트합니다.

### 2. 마크다운 문자열 파싱 (`src/__tests__/blog.test.ts`)

요약 텍스트 및 대체 텍스트 생성을 담당하는 문자열 조작 로직을 검증합니다.

- `getFirstImageFromContent()`:
    - 표준형 `![alt](url)` 형태의 마크다운 구문에서 이미지 URL만 온전하게 추출합니다.
    - 마크다운을 분석했을 때 이미지가 존재하지 않으면 시스템 오류 없이 `null`을 반환합니다.
- `getFirstThreeSentences()`:
    - 마크다운 문법(볼드 지정, 링크, 코드 블록 등)을 문자열에서 완벽하게 필터링합니다.
    - 세 번째 마침표 또는 구두점 끝에서 글 설명을 안전하게 자릅니다 (truncate).
- `formatPubDateKST()`:
    - 기초 Date Javascript 객체를 한국(KST) 표준시 기준의 한글 표현 형식 문자열로 올바르게 변환합니다.

### 3. 이미지 업로드 및 변환 (`src/__tests__/image-upload.test.ts`)

네트워크 호출 없이 Vitest 내부에서 JSDOM 및 Supabase 모킹을 통해 WebP 변환 및 API 파이프라인을 철저하게 검증합니다.

- `toWebPBlob()`:
    - JSDOM 캔버스(Canvas) 파싱과 WebP 생성 콜백이 오차 없이 트리거되는지 검증합니다.
- `uploadImageToSupabase()`:
    - WebP가 아닌 일반 이미지 파일(PNG/JPG)이 전달될 때, 곧장 업로드되지 않고 강제로 WebP 변환 우회 파이프라인을 거치는지 확인합니다.
    - 이미 WebP 형식인 파일은 변환 낭비 과정을 생략하고, 곧장 Supabase `images` 버킷 저장소 파이프라인으로 전송되는지 검증합니다.
    - 스토리지 통신 오류, 혹은 권한/용량 문제 등 Supabase API 에러 발생 시 정상적으로 예외 처리(Error)를 뱉어내는지 테스트합니다.

## 테스트 실행 방법 (Running Tests)

로컬 콘솔에서 수동으로 테스트 스위트를 실행하려면 다음 명령어를 사용하세요:

- `pnpm test` : 터미널 콘솔 환경에서 전체 테스트를 실행합니다.
- `pnpm test:ui` : 브라우저에서 대화형 Vitest UI 대시보드 환경을 엽니다.
