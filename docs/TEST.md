# TEST

## 현재 테스트 인프라

- **Unit/Integration**: Vitest + Testing Library (happy-dom)
- **대상**: 유틸리티 함수, 데이터 변환, 순수 로직
- **한계**: DOM 레이아웃 API (`getBoundingClientRect`, `offsetWidth`, `getComputedStyle`) 미지원 — 레이아웃 의존 기능은 단위 테스트 불가

## 수동 테스트 체크리스트

코드 변경 후 배포 전 수동으로 확인해야 하는 항목. 해당 영역을 수정했을 때만 실행.

### PDF Export (Resume)

> 변경 대상: `PdfPreviewModal.tsx`, `Resume*.tsx`, `ProjectsSection.tsx`, `SkillsSection.tsx`, `CareerPhasesSection.tsx`

1. Resume 페이지 → PDF 내보내기 버튼 클릭
2. 프리뷰 확인:
    - [ ] 모든 섹션이 페이지 경계에서 잘리지 않음 (dashed line 아래로 콘텐츠가 시작)
    - [ ] 프로젝트 카드가 grid 레이아웃 유지 (2열)
    - [ ] 프로젝트 카드가 행 단위로 페이지 이동 (개별 카드 잘림 없음)
    - [ ] 페이지 구분선이 콘텐츠를 가리지 않음 (간격이 경계선 위쪽에 위치)
    - [ ] 사이드바에 총 페이지 수 표시
3. 컬러 스킴 변경:
    - [ ] neutral → 컬러: 블록 위치 동일 (밀림 없음)
    - [ ] 컬러 → neutral: 블록 위치 동일
    - [ ] 페이지 수 변화 없음
4. PDF 다운로드:
    - [ ] 파일 정상 생성 (`resume.pdf`)
    - [ ] 각 페이지에서 콘텐츠 잘림 없음
5. 4종 레이아웃 확인 (DB `resume_layout` 값 변경):
    - [ ] Modern: header + timeline 경력 + 카드 교육
    - [ ] Classic: 2열 사이드바 레이아웃
    - [ ] Minimal: 단일 열 간결 레이아웃
    - [ ] Phases: 핵심역량 + 커리어 타임라인 + 프로젝트

### PDF Export (Portfolio)

> 변경 대상: `PdfPreviewModal.tsx`, `PortfolioView.tsx`, `portfolio/page.tsx`

1. Portfolio 페이지 → PDF 내보내기 버튼 클릭
2. 프리뷰 확인:
    - [ ] 각 프로젝트 article이 페이지 경계에서 잘리지 않음
    - [ ] Books 섹션 카드가 잘리지 않음
    - [ ] 타임라인 레이아웃 유지
3. PDF 다운로드 → 페이지 확인

### 컬러 스킴

> 변경 대상: `color-schemes.ts`, `tailwind-color-schemes.css`, `ThemeToggle.tsx`

1. 헤더 토글로 light/dark 전환
    - [ ] 모든 페이지에서 색상 정상 적용
    - [ ] 새로고침 후에도 선택한 스킴 유지 (DB 기반)
2. PDF 내보내기에서 컬러 스킴 선택
    - [ ] 18종 스킴 모두 프리뷰에 정상 반영

### Admin 대시보드

> 변경 대상: `admin/` 하위 파일, `panels/`, Server Actions

1. 로그인 → 대시보드 접근
    - [ ] 사이드바 네비게이션 동작
    - [ ] Cmd+K 커맨드 팔레트 동작
2. 포스트 CRUD:
    - [ ] 생성 → 편집 → 발행 → 삭제
    - [ ] 자동저장 동작 (SaveIndicator 상태 변화)
    - [ ] 발행 후 프론트엔드 페이지 반영 (ISR revalidation)
3. Portfolio/Books CRUD: 동일 흐름

### 콘텐츠 렌더링

> 변경 대상: `markdown.tsx`, `MermaidRenderer.tsx`, `ColoredTable.tsx`

1. MDX 콘텐츠 포함 블로그 글 확인:
    - [ ] 코드 블록 (Shiki) 하이라이팅
    - [ ] Mermaid 다이어그램 렌더링
    - [ ] KaTeX 수식 렌더링
    - [ ] 이미지 lazy loading
    - [ ] 목차 생성 (TableOfContents / GithubToc)

## Playwright E2E 테스트 (도입 완료)

### 실행 방법

```bash
pnpm test:e2e              # 전체 (Chromium + Firefox + WebKit + mobile)
pnpm test:e2e:chromium     # Chromium만 (빠른 확인)
pnpm test:e2e:ui           # Playwright UI 모드 (디버깅)
```

### 테스트 구조

| 파일                     | 내용                                | 테스트 수 |
| ------------------------ | ----------------------------------- | --------- |
| `e2e/smoke.spec.ts`      | 주요 페이지 로딩 + 404              | 6         |
| `e2e/navigation.spec.ts` | 헤더 네비게이션, 페이지 이동        | 3         |
| `e2e/theme.spec.ts`      | 다크/라이트 모드 토글               | 1         |
| `e2e/responsive.spec.ts` | mobile/tablet/desktop overflow 검증 | 9         |
| `e2e/seo.spec.ts`        | 메타데이터, 접근성 기본             | 9         |

### 새 E2E 테스트 추가 시 원칙

- `e2e/` 디렉토리에 `*.spec.ts` 파일 생성
- 데이터 비의존적 테스트 우선 (DB 없이도 실행 가능)
- 인증 필요 시 `storageState` 패턴 사용 (`playwright.config.ts`에 setup project 추가)

## Playwright 확장 시점

아래 조건 해당 시 E2E 테스트 확장 고려:

| 조건                                         | 근거                                            |
| -------------------------------------------- | ----------------------------------------------- |
| 사용자 대면 기능 추가 (회원가입, 댓글, 검색) | 인증 흐름 + 사용자 인터랙션 E2E 검증 필요       |
| 2인 이상 협업 시작                           | 수동 테스트 누락 위험 증가, CI 자동화 가치 상승 |
| 배포 빈도 주 3회 이상                        | 수동 테스트 비용이 자동화 비용 초과             |
| 프론트엔드 회귀 버그 3회 이상 발생           | 수동 테스트로 잡지 못한 패턴 존재 증명          |
| 크로스 브라우저 지원 필요                    | Playwright의 multi-browser 기능 활용            |

### Playwright 도입 시 우선순위

1. **인증 흐름 자동화**: Supabase auth → `storageState` 저장 → 테스트 재사용
2. **콘텐츠 페이지 스모크 테스트**: 주요 페이지 로딩 + 404 없음 확인
3. **Admin CRUD E2E**: 포스트 생성 → 발행 → 프론트엔드 확인
4. **PDF Export visual regression**: 스크린샷 비교 (데이터 고정 필요)

### Playwright 도입 시 주의사항

- 테스트 데이터는 **시딩 스크립트**로 고정 (실제 DB 데이터에 의존하면 flaky)
- `webServer` 설정으로 dev 서버 자동 기동
- CI에서는 `--project=chromium`만 (속도 우선)
- Visual regression은 **별도 CI job**으로 분리 (느리고 flaky)
