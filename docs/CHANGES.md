# CHANGES

## 2026-03-24

### Feat: Portfolio 상세 페이지 메타데이터 ref.png 스타일 리디자인 (v0.7.53)

- `src/app/(frontend)/portfolio/[slug]/page.tsx`: `<dl>` 테두리 박스 그리드 → flat accent-dot 레이블 섹션으로 교체. 개발기간·역할·참여인원 2→4열 그리드, 개발 목적 전폭. 성과 섹션 테두리 래퍼 제거 → 2열 그리드 accent-dot 불릿 리스트. 레이블 타이포그래피 `text-[10px]` → `text-base`.

### Feat: Portfolio 리스트 뷰 ref.png 스타일 리디자인 (v0.7.52)

- `src/components/PortfolioView.tsx`: 블록 뷰·토글 버튼·`TAG_COLORS`·`ViewMode` 완전 제거. 타임라인 리스트만 유지. float-right 썸네일 (`w-48 tablet:w-80`, aspect-video), accent-dot 레이블 섹션(역할/참여인원 2열 그리드, 목표 전폭), 설명 `line-clamp-2`, 성과 2열 불릿 그리드. 레이블 `text-[10px]` → `text-base`, dot `h-1.5 w-1.5` → `h-2 w-2`.
- `src/app/(frontend)/portfolio/page.tsx`: `portfolioViewMode` site_config fetch 제거, `forcedViewMode` prop 제거.

### Feat: Admin 포트폴리오 패널 성과 필드 추가 (v0.7.51)

- `src/components/admin/MetadataSheet.tsx`: `PortfolioFields` 인터페이스에 `accomplishments: string` 추가. liveUrl 아래 "성과 (한 줄에 하나씩)" textarea(`rows={4}`, `resize-y`) 추가.
- `src/components/admin/panels/PortfolioPanel.tsx`: `ItemForm`에 `accomplishments: string` 추가, `EMPTY_FORM` 초기값 `""`. 로드 시 `accomplishments` 배열 `"\n"` join, 저장 시 `"\n"` split → trim → filter 후 배열로 변환.

### Feat: ResumeModern 프로젝트 카드 리디자인 (v0.7.50)

- `src/types/resume.ts`: `ResumeProject`에 `portfolioSlug?: string` 추가.
- `src/components/resume/ResumeModern.tsx`: 프로젝트 카드 전면 개편. 썸네일 `aspect-video` 16:9 비율. 날짜 일(day) 포함 전체 표시. `portfolioSlug` 있으면 카드 전체 stretched link로 포트폴리오 상세 페이지 연결. GitHub URL 있으면 `relative z-10` 독립 버튼 렌더링. `getPortfolioItem`으로 썸네일·태그·역할·팀 크기 fetch.

### Feat: SkillsSection 직무분야별 뷰 및 기본 정렬 설정 (v0.7.49)

- `src/types/resume.ts`: `ResumeSection<T>`에 `defaultView?: string` 추가.
- `src/components/resume/SkillsSection.tsx`: `groupByJobField` 함수 추가 — jobField 기준 그룹화, 카테고리 중첩. `SkillsView` 타입에 `"by-job-field"` 추가. `defaultView` prop 지원.
- `src/components/resume/ResumePhases.tsx`: `SkillsSection`에 `defaultView={resume.skills?.defaultView}` prop 전달.
- `src/components/admin/skills/SkillsAdminSection.tsx`: 섹션 헤더에 "기본 정렬" select 추가 (직무 분야별/경력별/카테고리별/프로젝트별). `resumeData.skills.defaultView` 연동.

## 2026-03-24

### Feat: 스킬 행에 직무 분야 표시 (v0.7.48)

- `src/components/admin/skills/SkillsAdminSection.tsx`: `renderSkillRow`에 직무 분야 행 추가 (카테고리 아래). `JobFieldBadges` 컴포넌트로 emoji+name 배지 렌더링. `jobField`가 없으면 행 미표시.

### Feat: 스킬 어드민 드래그 앤 드롭 재정렬 (v0.7.47)

- `src/components/admin/skills/SkillsAdminSection.tsx`: 카테고리별 정렬 모드에서 스킬 행 드래그 앤 드롭 재정렬 지원. `dragSrcRef`로 드래그 소스 추적, `handleSkillReorder`로 같은/다른 카테고리 간 이동 처리. `⠿` 드래그 핸들 표시. 알파벳순 모드에서는 드래그 비활성화.

### Fix: 스킬 어드민 행 레이아웃 세로 구조 재편 (v0.7.46)

- `src/components/admin/skills/SkillsAdminSection.tsx`: `renderSkillRow` 레이아웃을 수평 flat → 세로 속성 행 구조로 재편. 순서: 이름(아이콘 포함) → 숙련도 → 카테고리 → 연결 직장 → 연결 프로젝트. 직장/프로젝트 배지를 별도 행으로 분리 표시. `expBadges` 헬퍼 제거 후 `workRefs`/`projectRefs` 인라인 파생.

### Feat: 스킬 프로젝트별 정렬 및 다중 연결 지원 (v0.7.45)

- `src/types/resume.ts`: `ResumeSkillKeyword`에 `workRefs?: string[]`, `projectRefs?: string[]` 추가 — 기존 단일 `workRef`/`projectRef`는 하위 호환용으로 유지.
- `src/components/resume/SkillsSection.tsx`: `"by-project"` 뷰 추가 — 프로젝트 섹션 순서 미러링. `getWorkRefs`/`getProjectRefs` 헬퍼 추가 (단일/배열 하위 호환). `groupByExperience` 다중 ref 지원(스킬이 여러 그룹에 노출). `groupByProject` 함수 추가.
- `src/components/admin/skills/SkillEditorModal.tsx`: `expType/workRef/projectRef` 단일 선택 → `workRefs`/`projectRefs` 다중 체크박스 UI로 교체.
- `src/components/admin/skills/SkillsAdminSection.tsx`: `expBadge` → `expBadges` (다중 ref 배지 표시). `renderSkillRow` initialSkill에 `workRefs`/`projectRefs` 전달.

## 2026-03-24

### Fix: 프로젝트 섹션 마크다운 렌더링 및 줄바꿈 처리 (v0.7.44)

- `src/styles/global.css`: `.resume-markdown` CSS 규칙 추가 — `strong`, `em`, `ul`, `ol`, `li`, `a`, `code` 등 기본 마크다운 서식 정의. Tailwind preflight가 기본 HTML 스타일을 초기화하므로 명시적 규칙이 없어 체크박스를 켜도 렌더링이 plaintext와 동일하게 보이던 문제의 근본 원인.
- `src/components/resume/ResumeClassic.tsx`, `ResumeModern.tsx`, `ResumeMinimal.tsx`, `ResumePhases.tsx`: sections 및 description plaintext `<p>` 요소에 `whitespace-pre-wrap` 추가 — 줄바꿈(`\n`)이 무시되던 문제 수정.

## 2026-03-24

### Fix: desktop 브레이크포인트 1600px 정정 및 TOC laptop 전환 (v0.7.43)

- `src/styles/global.css`: `--breakpoint-desktop` 64rem(1024px) → 100rem(1600px) — laptop(1241px)보다 커야 하는 논리적 순서 수정. 참조 프로젝트 기준값 반영.
- `src/components/TableOfContents.tsx`: `desktop:block` → `laptop:block` — desktop이 1600px로 상향되면서 TOC가 지나치게 넓은 화면에서만 표시되는 문제 수정. 1241px 이상에서 표시 (이전 1024px 동작과 유사).

### Fix: laptop 브레이크포인트 추가 및 ResumePhases 반응형 수정 (v0.7.42)

- `src/styles/global.css`: `@theme`에 `--breakpoint-laptop: 77.5625rem` (1241px) 추가 — 참조 프로젝트(krrpinfo) 브레이크포인트 체계 반영.
- `src/components/resume/ResumePhases.tsx`: 경력·프로젝트 반응형 클래스의 `md:` → `tablet:` 교체 — `--breakpoint-*: initial`로 기본 브레이크포인트가 reset된 환경에서 `md:`가 무효였던 버그 수정.

### Fix: ResumePhases 경력·프로젝트 섹션 좁은 화면 반응형 레이아웃 (v0.7.41)

- `src/components/resume/ResumePhases.tsx`: `경력`·`프로젝트` 2컬럼 그리드를 `md` 미만에서 단일 컬럼 수직 스택으로 전환. `divide-x` → `md:divide-x` + `divide-y md:divide-y-0` 구분선 처리. 컬럼 패딩 `pr-8`/`pl-8` → `pb-8 md:pb-0 md:pr-8` / `pt-8 md:pt-0 md:pl-8` 조정. 커리어 로드맵 레이아웃은 변경 없음.

## 2026-03-24

### Perf: 홈·이력서 정적 생성 및 전 패널 On-Demand 재검증 확장 (v0.7.40)

- `src/app/(frontend)/page.tsx`, `resume/page.tsx`: `force-dynamic` → `revalidate = false`. 빌드 타임 정적 HTML 생성 — 첫 방문자도 CDN 즉시 서빙.
- `src/app/admin/actions/revalidate.ts`: `revalidateHome()`, `revalidateResume()` 추가. `revalidatePost`·`revalidatePortfolioItem`에 `revalidatePath("/")` 추가 — 포스트·포트폴리오 변경이 홈 피드에 즉시 반영.
- `src/components/admin/panels/AboutPanel.tsx`: `handleSave` 성공 시 `revalidateHome` + `revalidateResume` 호출 (프로필 이미지가 이력서에도 반영).
- `src/components/admin/panels/ResumePanel.tsx`: `autoSave`·`handleSave`·`saveLayout` 성공 시 `revalidateResume` + `revalidateHome` 호출.
- `src/components/admin/panels/SiteConfigPanel.tsx`: `handleSave`(site_name)·`handleSelectJobField`·`saveJobFields` 호출부에 `revalidateHome` + `revalidateResume` 추가.
- `src/lib/mcp-tools.ts`: `handleUpdateResume` 완료 후 `revalidatePath("/resume")` + `revalidatePath("/")` 추가 — AI 에이전트 경로 커버.

### Perf: 도서(Books) 정적 생성 및 On-Demand 재검증 적용 (v0.7.39)

- `src/app/(frontend)/books/[slug]/page.tsx`: `force-dynamic` 제거 → `revalidate = false`, `dynamicParams = true`, `generateStaticParams`. `getCachedMarkdown` 사용.
- `src/lib/queries.ts`: `getBookMeta`, `getBook`, `getAllBookSlugs` 추가 — blog/portfolio와 동일 패턴.
- `src/app/admin/actions/revalidate.ts`: `revalidateBook(slug)` 추가.
- `src/components/admin/panels/BooksSubPanel.tsx`: `autoSave`·`handleSave`·`togglePublish`·`handlePublishToggle` 모든 저장 지점에서 `revalidateBook` 호출. 미리보기 버튼 하단 및 저장 바 좌측에 캐시 갱신 안내 문구 추가.

### Feat: 관리자 패널 캐시 워밍 안내 문구 추가 (v0.7.38)

- `src/components/admin/panels/PostsPanel.tsx`, `PortfolioPanel.tsx`: 편집 화면 상단 버튼 행 하단에 `"저장 후 미리보기를 한 번 방문하면 캐시가 갱신되어 방문자에게 즉시 제공됩니다."` 안내 문구 추가.
- 하단 sticky 저장 바: `justify-end` → `justify-between`, 좌측에 `"저장 후 미리보기를 방문하면 캐시가 갱신됩니다."` 문구 추가.

### Perf: generateStaticParams + On-Demand revalidation — 첫 방문 속도 개선 (v0.7.34~v0.7.36)

- `src/lib/queries.ts`: `getPostMeta`, `getPortfolioItemMeta` 추가 (content 제외 경량 메타데이터 쿼리). `getAllPostSlugs`, `getAllPortfolioSlugs` 추가 (빌드 타임 전용).
- `src/app/admin/actions/revalidate.ts` (신규): `revalidatePost`, `revalidatePortfolioItem` Server Action. 저장 시 slug 페이지 + 목록 페이지 동시 `revalidatePath` 호출.
- `src/lib/markdown.tsx`: `unstable_cache` `revalidate: false` — 시간 기반 만료 제거, On-Demand revalidation 전용.
- `src/app/(frontend)/blog/[slug]/page.tsx`, `portfolio/[slug]/page.tsx`: `generateStaticParams` 추가, `revalidate = false`, `dynamicParams = true`. `generateMetadata`를 경량 쿼리로 교체. 배포 시 모든 published 페이지가 빌드 타임에 정적 HTML 생성 → CDN 즉시 서빙.
- `src/app/(frontend)/blog/page.tsx`, `portfolio/page.tsx`: `force-dynamic` 제거, `revalidate = false`.
- `src/components/admin/panels/PostsPanel.tsx`, `PortfolioPanel.tsx`: `autoSave`, `handleSave`, `togglePublish`, `handlePublishToggle` 모든 저장 지점에서 revalidation Server Action 호출.
- `src/lib/mcp-tools.ts`: `handleUpdatePost`, `handleUpdatePortfolioItem`에 `revalidatePath` 추가 — AI 에이전트 경로도 커버.

## 2026-03-23

### Fix: unstable_cache 모듈 레벨 이동 — content가 cache key에 포함되도록 수정 (v0.7.32)

- `src/lib/markdown.tsx`: `getCachedMarkdown`의 `unstable_cache`를 매 호출마다 클로저로 생성하던 방식에서 모듈 레벨 상수 `_renderCached`로 이동. 기존 방식은 `content`가 클로저로 캡처되어 cache key에 포함되지 않아 동일 slug라면 내용·코드 변경 후에도 stale(에러 포함) 결과를 3600초간 계속 서빙하는 문제가 있었음. 수정 후 `slug + content`가 실제 cache key의 일부로 포함되어 콘텐츠 변경 또는 배포 시 새 cache entry 생성.

### Fix: MDX 콘텐츠 내 next/image import 제거 및 Image 컴포넌트 override 추가 (v0.7.31)

- `src/lib/markdown.tsx`: `evaluate` 실행 전 `import ... from 'next/image'` 구문을 정규식으로 사전 제거. `console-engine-project-2-review` 포스트 MDX 콘텐츠에 `next/image` import가 직접 포함되어 있어 해당 포스트에서만 Image.prototype 서버 에러가 발생하던 문제 수정. `components`에 `Image: MarkdownImage` 추가 — 콘텐츠 내 `<Image>` JSX를 SSR 안전한 컴포넌트로 대체.

### Fix: MarkdownImage에서 next/image 제거 — renderToString 서버 호환 수정 (v0.7.30)

- `src/components/MarkdownImage.tsx`: `next/image` 제거, 순수 `<img loading="lazy" decoding="async">` 로 교체. `renderToString` 서버 컨텍스트에서 클라이언트 모듈(`next/image`)을 import하면 "Cannot access Image.prototype on the server" 오류 발생 — 이로 인해 `unstable_cache`가 결과를 캐싱하지 못해 매 요청마다 MDX 렌더링이 재실행되는 근본 원인이었음.

### Fix: next/image 도메인 설정 (v0.7.29)

- `next.config.ts`: `remotePatterns`에 `img.youtube.com`, `i.ytimg.com` 추가. YouTube 썸네일 도메인 미등록으로 발생하던 next/image 에러 수정.
- `src/app/(frontend)/blog/[slug]/page.tsx`, `src/app/(frontend)/portfolio/[slug]/page.tsx`: 썸네일에 `<Image priority>` 적용.

### Perf: ISR 캐싱 및 쿼리 중복 제거 (v0.7.26~v0.7.28)

- `src/lib/queries.ts` (신규): React `cache()`로 감싼 `getPost`, `getPortfolioItem`, `getTags`, `getSiteConfig` export. 동일 request 내 `generateMetadata`와 page component가 같은 쿼리를 두 번 실행하던 문제 제거.
- `src/lib/markdown.tsx`: `unstable_cache`를 사용하는 `getCachedMarkdown(slug, content)` 추가 (revalidate 3600, `post-{slug}` tag). MDX 렌더링 결과를 캐싱해 반복 방문 시 재렌더링 생략. `img` 컴포넌트 override로 `MarkdownImage` 등록.
- `src/components/MarkdownImage.tsx` (신규): MDX 본문 `img` 대체 컴포넌트. `renderToString` 호환 (plain `<img>`).
- `src/app/layout.tsx`: `force-dynamic` 제거, `revalidate = 3600` 추가. `getSiteConfig()` cached fetcher 사용.
- `src/app/(frontend)/layout.tsx`: 동일하게 `getSiteConfig()` 사용.
- `src/app/(frontend)/blog/[slug]/page.tsx`, `portfolio/[slug]/page.tsx`: `force-dynamic` 제거, `revalidate = 60`. `getCachedMarkdown` 사용.
- `next.config.ts`: `images.unoptimized: true` 제거, `remotePatterns` (supabase, youtube) 추가.

### Feat: 스킬 어드민 배치 액션 추가 (v0.7.25)

- `src/components/admin/skills/SkillsAdminSection.tsx`: 각 스킬 행에 체크박스 추가. 카테고리별 뷰에서 카테고리 헤더에 카테고리 전체 선택 체크박스 추가. 1개 이상 선택 시 배치 액션 바 노출 — 숙련도 일괄 변경 (datalist 자동완성), 직무 분야 일괄 변경 (select), 카테고리 일괄 변경 (datalist, 신규 생성 지원), 일괄 삭제. 액션 선택 시 인라인 폼 표시, filter/sort 변경 시 선택 자동 초기화.

### Feat: 스킬 어드민 섹션 전면 재설계 (v0.7.24)

- `src/components/admin/skills/SkillEditorModal.tsx` (신규): 스킬 편집 전용 모달. 이름·카테고리·숙련도·직무분야·연결 경험(직장/프로젝트 탭)·아이콘(slug+color+SkillBadge 미리보기) 필드. Exit safeguard(dirty 체크 → 확인 다이얼로그). localStorage `resume_skill_draft` 키로 500ms debounce 자동저장 및 모달 열기 시 draft 복원 배너. `workRef`는 `"Position @ Company"` composite key 형식 사용.
- `src/components/admin/skills/SkillsAdminSection.tsx` (신규): flat skill 리스트 (모든 카테고리 keywords 평탄화). 카테고리별/이름순 정렬, 카테고리 필터. 노란 draft 행 (클릭 시 모달 재개). 각 행: 아이콘·이름·숙련도 뱃지·카테고리 뱃지·경험 연결 뱃지·수정·삭제 버튼. 하단 카테고리 관리 패널 (접기/펼치기). SSR 가드 포함.
- `src/components/admin/panels/ResumePanel.tsx`: 기존 스킬 섹션(~430줄) 제거, `<SkillsAdminSection />` 교체. `normalizeSkills()` 함수에서 레거시 category-level `jobField`/`level`을 각 keyword로 마이그레이션.

### Feat: 스킬 타입 및 Phases 이력서 스킬 섹션 재설계 (v0.7.23)

- `src/types/resume.ts`: `ResumeSkillKeyword`에 `jobField`, `level`, `workRef`, `projectRef` 필드 추가. `ResumeSkill` 카테고리에서 `jobField`/`level` 제거 — 직무 분야·숙련도는 개별 스킬 단위로 관리.
- `src/components/resume/SkillsSection.tsx` (신규): Phases 이력서 전용 스킬 렌더러. "직무별"/"카테고리별" 뷰 토글 드롭다운. 직무별 뷰: `workRef`/`projectRef` 기준 그룹화, active jobField 그룹 우선 노출. `workRef` composite key `"Position @ Company"` 형식으로 다중 포지션 구분.
- `src/components/resume/ResumePhases.tsx`: `activeJobField` prop 추가, `<SkillsSection />` 컴포넌트 사용으로 교체.

### Feat: Phases 이력서 커리어 로드맵 섹션 추가 (v0.7.22)

- `src/types/resume.ts`: `ResumeCareerPhase` 인터페이스 추가. `Resume`에 `careerPhases` 필드 추가
- `src/components/resume/ResumePhases.tsx`: 커리어 로드맵 섹션 추가 (흰 배경 카드, Phase 컬럼 타임라인, phase 번호 내림차순 정렬)

### Feat: 프롬프트 라이브러리 포트폴리오 프롬프트 추가 (v0.7.21)

- `src/components/admin/panels/PromptLibraryPanel.tsx`: `GET_PORTFOLIO_PROMPT` 함수 추가. 포트폴리오 아이템 생성용 시스템 프롬프트 섹션(상태·핸들러·UI) 추가

### Feat: MCP 엔드포인트 개선 (v0.7.20)

- `src/lib/mcp-tools.ts`: `handleCreatePortfolioItem`, `handleUpdatePortfolioItem`에 `job_field` 배열 → 문자열 자동 정규화 추가
- `src/app/api/mcp/route.ts`: `-32001 Unauthorized` 에러 메시지에 Bearer 토큰 형식 힌트 추가
- `AGENTS.md`: MCP Agent Guide 섹션 추가 — 엔드포인트 URL, Bearer 인증 형식, JSON-RPC 호출 구조, 툴 요약, 주의사항

## 2026-03-22

### Feat: Phases 이력서 테마 추가 (v0.7.19)

- `src/components/resume/ResumePhases.tsx`: 신규 생성. 웹→게임 전환 내러티브 구조의 이력서 테마. Phase 1(웹 경력)을 간략히, Phase 2(게임 프로젝트)를 메인으로 배치. 스킬은 `level` 필드로 game/web 그룹 분리.
- `src/app/(frontend)/resume/page.tsx`: `resumeLayout` 타입에 `"phases"` 추가. phases 선택 시 jobField 필터 없이 raw 데이터 전달.
- `src/components/admin/panels/ResumePanel.tsx`: `ResumeLayout` 타입 및 레이아웃 선택 버튼에 `"phases"` 추가.

### Feat: Vercel Analytics 설정 (v0.7.18)

- `src/app/layout.tsx`: Vercel Analytics 연동을 위해 `@vercel/analytics/react`의 `<Analytics />` 컴포넌트 추가
- `package.json`: `@vercel/analytics` 의존성 추가 버전을 `0.7.18`로 업데이트

### Fix: Admin 포스트 발행일 KST 역변환 버그 수정 (v0.7.17)

- `src/components/admin/panels/PostsPanel.tsx`: Admin 편집기에서 `pub_date`를 로드하거나 저장할 때 발생하는 시간대(Timezone) 오차 문제를 해결. 데이터베이스의 UTC 시간을 로컬 입력폼(datetime-local)에 매핑하기 전 임의로 KST(+09:00) 오프셋을 더하고(`getTime() + 9*60*60*1000`), 저장 시에는 명시적으로 `+09:00`을 문자열에 붙여 `new Date()` 파싱이 클라이언트 브라우저의 시간대 설정과 무관하게 항상 한국 시간으로 처리되도록 수정.

### Fix: 블로그 포스트 KST 시간대 포맷팅 오류 수정 (v0.7.16)

- `src/lib/blog.ts`: KST 기준으로 저장된 UTC 시각(예: `+00`)을 프론트엔드에서 표시할 때 기존 방식(`timeZone: "UTC"`) 대신 `timeZone: "Asia/Seoul"`을 적용하여 한국(KST) 표준시로 올바르게 표시되도록 수정. March 포스트 시간이 잘못 표시되던 문제 해결.

### Fix: 에디터 내 Folium Table 삽입 시 프론트엔드 렌더링 누락 버그 수정 (v0.7.15)

- `src/lib/mdx-directive-converter.ts`: MDXEditor(remark-directive)가 JSON 데이터를 갖는 속성을 직렬화할 때 큰따옴표 대신 작은따옴표(`'`)를 사용할 경우 기존 정규식이 매칭하지 못하던 버그를 수정하여 `directiveToJsx` 변환 호환성 개선.

## 2026-03-22

### Feat: MCP 엔드포인트 도구 스키마 보강 및 프롬프트 라이브러리 신설 (v0.7.14)

- `src/lib/mcp-tools.ts`: `update_post` 및 `create_post` 스키마에 `pub_date`, `job_field` 등 기본 및 SEO 메타 필드 추가. `update_portfolio_item` 스키마에도 `job_field`, `thumbnail`, `order_idx` 추가하여 상세한 부분 업데이트 지원.
- `src/components/admin/panels/PromptLibraryPanel.tsx` (신규): AI 에이전트 연동 시 유용한 블로그 자동 작성용 프롬프트 기본 제공. 복사/초기화 기능 및 엔드포인트 컨텍스트, 이스케이프 관련 주의사항 포함.
- `AdminSidebar.tsx`, `AdminDashboard.tsx`, `CommandPalette.tsx`: System 메뉴 및 커맨드 팔레트(⌘K)에 '프롬프트 라이브러리' 탭 연동.

## 2026-03-21

### Fix: 마크다운 에디터 마지막 단락 텍스트 겹침 버그 수정 (v0.7.13)

- `src/styles/global.css`: Lexical 에디터가 자동 삽입하는 빈 커서 단락을 숨기는 CSS 선택자를 `[dir="auto"]`에서 `:empty` 및 `:has(br:only-child)`로 엄격하게 변경하여 텍스트가 채워진 단락이 뭉개지는 현상 해결.
- `package.json`: 버전을 `0.7.13`으로 업데이트

### Feat: Admin 에디터 미리보기 버튼 추가 (v0.7.12)

- `src/components/admin/panels/PostsPanel.tsx`, `PortfolioPanel.tsx`, `BooksSubPanel.tsx`: 에디터 상단에 '미리보기' 버튼 추가 (발행 시 활성화, 새 탭에서 프론트엔드 상세 페이지 열기)

### Feat: MCP Agent API 구현 (v0.7.11)

- `package.json`: `@modelcontextprotocol/sdk@1.27.1` 추가, version `0.7.11` bump
- `src/lib/migrations.ts`: v0.7.11 마이그레이션 추가 (`ai_agent_tokens`, `content_snapshots` 테이블 + prune 트리거)
- `src/lib/agent-token.ts`: 에이전트 토큰 유틸 신규 (`validateAgentToken`, `issueToken`, `revokeToken`, `listTokens`)
- `src/lib/mcp-tools.ts`: MCP 툴 11개 정의 + `snapshotBefore()` + `dispatchTool()` 디스패처
- `src/app/api/mcp/route.ts`: JSON-RPC 2.0 MCP HTTP 엔드포인트 (POST/GET)
- `src/app/admin/actions/agent-tokens.ts`: 토큰 발급/폐기/목록 서버 액션
- `src/app/admin/actions/snapshots.ts`: 스냅샷 목록/조회/복원 서버 액션
- `src/components/admin/panels/AgentTokensPanel.tsx`: 토큰 발급·폐기 어드민 UI
- `src/components/admin/panels/SnapshotsPanel.tsx`: 스냅샷 브라우저 + 복원 UI
- `src/components/admin/AdminSidebar.tsx`: "Agent 토큰", "스냅샷" 탭 추가
- `src/components/admin/AdminDashboard.tsx`: 2개 신규 패널 렌더링 연결
- `docs/ai-agent-schema.md`: AI 에이전트용 스키마 가이드 문서 신규

### Chore: AGENTS.md Project Structure 업데이트

- `AGENTS.md`: Astro 구버전 스택 설명을 Next.js 16 App Router 기준으로 전면 교체
    - Framework, Directory Layout, Key Conventions 모두 현행 코드와 일치하도록 수정
- `CLAUDE.md`: `AGENTS.md` 참조 지시문으로 교체

### Feat: CLAUDE.md 지침 로드 프롬프트 강화

- `CLAUDE.md`: Claude Code가 작업을 시작하기 전 `AGENTS.md` 파일을 반드시 스캔하도록 강제하는 지시문 추가

### Feat: 포트폴리오 페이지 하단 도서 섹션 추가 (v0.7.10)

- `src/app/(frontend)/portfolio/page.tsx`: 활성 직무 분야에 맞는 published 도서를 fetch하여 포트폴리오 항목 하단에 표시
- 포트폴리오 항목과 도서 섹션 사이에 수평 구분선 추가
- 도서 카드: 표지 이미지, 제목, 저자, 별점, 한줄 소개 표시 — `/books/{slug}` 링크 연결

### Fix: Switch 컴포넌트 시각적 토글 미작동 수정 (v0.7.9)

- `src/components/ui/switch.tsx`: `bg-primary`, `bg-input` 등 shadcn/ui 규칙 클래스를 Tailwind v4 CSS 변수 직접 참조 방식(`bg-(--color-accent)`, `bg-(--color-border)` 등)으로 교체
- 원인: Tailwind v4에서 `bg-primary`는 `@theme`에 `--color-primary`가 등록되어야 동작하나, 이 프로젝트는 `:root`에 `--primary` 별칭만 있어 클래스가 무효화됨

### Refactor: 이력서 섹션 구조 per-section 중첩 구조로 개편 (v0.7.8)

- `src/types/resume.ts`: `ResumeSection<T>` 제네릭 인터페이스 추가 (`emoji`, `showEmoji`, `entries` 포함), `Resume`의 모든 섹션 필드를 이 구조로 전환, `ResumeMeta` 및 `meta` 필드 제거
- `ResumePanel.tsx`: JSON Fallback 에디터 섹션 완전 제거 (reactivity 버그 원인), 모든 섹션의 스프레드/배열 패턴을 새 구조(`section.entries`)에 맞게 수정
- 템플릿 3종 (`ResumeModern`, `ResumeClassic`, `ResumeMinimal`): `sections` 추출 시 `.entries` 언래핑, `getLabel`이 `section.emoji`/`section.showEmoji`를 직접 읽도록 수정
- `src/lib/migrations.ts`: v0.6.18 마이그레이션 추가 — 기존 `meta.sectionLabels`/`meta.showEmojis` 데이터를 per-section 중첩 구조로 변환

## 2026-03-20

### Fix: 이력서 JSON 구조 개편 - meta 객체 도입 (v0.7.7)

- `src/types/resume.ts`: `sectionLabels`, `showEmojis`를 최상위에서 제거하고 `ResumeMeta` 인터페이스 및 `meta` 최상위 키로 통합
- 이전 구조: `{ sectionLabels: {...}, showEmojis: {...}, work: [...] }`
- 신규 구조: `{ meta: { sectionLabels: {...}, showEmojis: {...} }, work: [...] }`
- 템플릿 3종: `sections` 필터에서 `"$schema"` 대신 `"meta"` 제외, `getLabel`이 `resume.meta`에서 읽도록 수정
- `ResumePanel.tsx`: 모든 섹션 이모지 셀렉터 및 Switch 토글이 `resumeData.meta`를 참조하도록 수정
- **DB 데이터 마이그레이션 필요**: 기존 `sectionLabels`/`showEmojis` 데이터를 `meta` 하위로 이동

### Design: 이력서 타이포그래피 및 레이아웃 스케일링 (v0.7.6)

- `ResumeClassic.tsx`, `ResumeModern.tsx`: `ResumeMinimal.tsx`의 디자인 철학을 반영하여 전체적인 타이포그래피 크기 상향 조정
- 섹션 제목(`text-xl`), 항목 제목(`text-lg`), 본문(`text-base`), 날짜(`text-sm`)로 정보 계층 구조 개선
- 모든 이력서 템플릿의 리스트 항목에 표준 불릿 기호(`•`) 적용 및 레이아웃 조정
- 모든 링크에 `hover:underline` 스타일 추가하여 시각적 피드백 강화
- Tailwind v4 디자인 린트 경고 해결 (`leading-[1.5]` → `leading-normal`)

### Feat: 이력서 섹션별 이모지 커스텀 기능 추가 (v0.7.5)

- `ResumePanel.tsx`: `SectionEmojiSelector` 컴포넌트 추가하여 각 섹션(경력, 프로젝트, 학력 등) 제목 앞에 표시할 이모지 선택 기능 구현
- `ResumeModern.tsx`, `ResumeClassic.tsx`, `ResumeMinimal.tsx`: `getLabel` 함수를 통해 이모지 접두사(기본값: `➕`)가 포함된 섹션 제목 렌더링 지원
- 템플릿별 렌더링 일관성 확보 및 중복 코드 제거

- `CommandPalette.tsx` (신규): ⌘K 커맨드 팔레트 — 패널 탐색 및 액션
- AdminHeader: 검색 아이콘 버튼 추가 (⌘K 트리거)
- AdminDashboard: CommandPalette 연동
- global.css: 어드민 마이크로 애니메이션 추가 (sidebar item 전환, card hover lift)

### Feat: Admin 대시보드 리디자인 — Phase 3: Ghost Editorial Minimal 패널 적용 (v0.7.4)

- `TagsPanel.tsx`: 카드 기반 목록 → `divide-y` 리스트 행, 색상 도트, shadcn Badge/Button/Input/Collapsible 적용, hover-reveal 액션 버튼
- `AboutPanel.tsx`: 프로필 이미지 레이아웃 개선, shadcn Input/Button/Separator 적용, 섹션 간 Separator 구분
- `SiteConfigPanel.tsx`: 색상 스킴 그리드 3열, `divide-y` 직무 분야 목록, shadcn Input/Label/Button/Separator 적용
- `MigrationsPanel.tsx`: shadcn Button/Badge 적용, 마이그레이션 상태 Badge 시각 개선
- `PortfolioPanel.tsx`: Ghost 에디터 레이아웃 적용 — borderless 제목, 전폭 RichMarkdownEditor, Settings→MetadataSheet, SaveIndicator sticky 바, useKeyboardSave, 즉시 발행 토글
- `BooksSubPanel.tsx`: Ghost 에디터 레이아웃 적용 — borderless 제목, 전폭 RichMarkdownEditor, Settings→MetadataSheet(`type="book"`), SaveIndicator sticky 바, useKeyboardSave, 즉시 발행 토글

### Feat: 이력서 스킬 배지 동적 아이콘 생성 지원 (v0.7.3)

- `simple-icons` 연동하여 스킬 키워드(`skill.keywords`)를 Shields.io 스타일의 뱃지로 동적 렌더링
- `src/types/resume.ts`: `ResumeSkill`에 `iconSlug`, `iconColor` 오버라이드 속성 추가
- `ResumePanel.tsx`: 스킬 편집 폼에 아이콘 슬러그 및 색상 직접 설정 기능(오버라이드) 추가
- `ResumeModern.tsx`: `SkillBadge` 컴포넌트 추가하여 뱃지 배경색 대비(Luminance)에 따른 텍스트 색상 및 SVG 아이콘 자동 렌더링 적용

### Refactor: 프론트엔드/어드민 레이아웃 분리 및 라우트 그룹 적용 (v0.7.2)

- Next.js Route Groups 적용 (`src/app/(frontend)/` 및 `src/app/admin/`)으로 레이아웃 완벽 분리
- `src/app/(frontend)/layout.tsx`: 프론트엔드 고유 레이아웃 (Header 및 패딩 컨테이너) 적용
- 루트 `src/app/layout.tsx`: `<html>`, `<body>` 태그만 남기고, 조건부 렌더링 로직 제거
- `ConditionalHeader.tsx`, `ConditionalMain.tsx` 등 불필요한 레이아웃 판별 컴포넌트 제거
- 프론트엔드 전용 페이지들(`about`, `blog`, `portfolio`, `resume`, `page.tsx`)을 `(frontend)` 폴더로 이동
- 어드민 전용 레이아웃(`src/app/admin/layout.tsx`)에서 프론트엔드 패딩 제거 및 'Editorial Minimal/Ghost Admin' 기반 디자인 팁 적용 준비
- `ResumeModern.tsx` 새로 생성하여 모던 스타일 이력서 뷰 컴포넌트 추가

### Feat: Admin 대시보드 리디자인 — Phase 1: shadcn/ui 기반 설정 및 레이아웃 쉘 (v0.7.1)

- shadcn/ui (New York style) 설치 — Sheet, Dialog, Badge, Switch, DropdownMenu, Popover, Collapsible, Command, Button, Input, Label, Separator, Tooltip
- shadcn CSS 변수를 기존 `--color-*` 토큰에 매핑 (테마 자동 전환 유지)
- `AdminDashboard.tsx`: 사이드바·헤더 추출, 이모지 → lucide-react 아이콘 교체
- `AdminSidebar.tsx` (신규): Content / Profile / System 섹션 그룹핑, Ghost 스타일 active 탭 (left border accent)
- `AdminHeader.tsx` (신규): 비활동 타이머·테마 토글·로그아웃 추출

### Feat: Next.js 16 마이그레이션 (v0.7.0)

- Astro 5 (output: static) → Next.js 16 App Router 전환
- `astro`, `@astrojs/*`, `prettier-plugin-astro`, `@tailwindcss/vite` 제거
- `next@^16`, `@tailwindcss/postcss` 추가
- `next.config.ts`, `postcss.config.mjs` 신규 생성
- `tsconfig.json`: Next.js 호환 설정으로 전면 교체 (`jsx: preserve`, `incremental`, `plugins: next`)
- `vitest.config.ts`: `getViteConfig from astro` → `defineConfig from vitest/config`로 교체
- `src/lib/supabase.ts`: `import.meta.env.*` → `process.env.*` (`NEXT_PUBLIC_*` 네이밍)
- `.astro` 파일 전체 삭제 및 `astro.config.mjs` 삭제
- `src/app/` 디렉터리 신규 생성 (App Router):
    - `layout.tsx`: BaseLayout + Header 통합, 색상 스킴 서버 fetch, 다크모드 FOUC 방지 인라인 스크립트
    - `page.tsx`: 랜딩 페이지 (Hero / About 미리보기 / Work / Portfolio Featured / Blog 최신)
    - `about/page.tsx`, `blog/page.tsx`, `portfolio/page.tsx`, `resume/page.tsx`: 각 페이지 Server Component 변환
    - `blog/[slug]/page.tsx`, `portfolio/[slug]/page.tsx`, `books/[slug]/page.tsx`: 동적 라우트, SSR 렌더링
    - `admin/page.tsx`, `admin/login/page.tsx`: 어드민 진입점
    - `not-found.tsx`: 404 페이지 (5초 카운트다운 자동 홈 리다이렉트)
    - `api/run-migrations/route.ts`: 서버에서 `exec_sql`로 마이그레이션 자동 적용 API
- `src/components/Header.tsx` (신규): `Header.astro` → Client Component 변환, 모바일 메뉴 React state 처리
- `src/components/GithubToc.tsx`, `FoliumTable.tsx`, `YouTubeEmbed.tsx` (신규): `.astro` → `.tsx` 변환
- `src/components/FoliumTableColorSync.tsx` (신규): FoliumTable 다크모드 색상 동기화 Client Component
- `src/components/MermaidRenderer.tsx` (신규): Mermaid 렌더링 Client Component (SSR 제외)
- `src/components/resume/ResumeModern.tsx`, `ResumeClassic.tsx`, `ResumeMinimal.tsx` (신규): `.astro` → async Server Component 변환
- `src/components/admin/**/*.tsx` 전체에 `"use client"` 추가
- `src/lib/markdown.tsx`: `react-dom/server` import를 동적 import로 변경 (App Router 호환)
- `MigrationsPanel.tsx`: "자동 적용" 버튼 추가 — `/api/run-migrations` 호출 후 버전 새로고침
- `.gitignore`: `.astro/` → `.next/` 교체
- `.prettierrc`: `prettier-plugin-astro` 및 astro 오버라이드 제거

### Chore: CHANGES.md 버전 순서 정리 (v0.6.21)

- `src/lib/migrations.ts` 전면 재작성:
    - `APP_VERSION`: `package.json`에서 동적 import
    - `Migration` 인터페이스: `{ version, title, feature, sql }` (id/hash 제거)
    - `compareVersions(a, b)`: semver 비교 함수
    - `getPendingMigrations(dbVersion)`: DB 버전보다 높은 마이그레이션만 반환 (오름차순)
    - `MIGRATIONS` 배열: 6개 마이그레이션 (v0.5.2 ~ v0.6.2), SQL에 `db_schema_version` 업데이트 포함
- `MigrationsPanel.tsx` 전면 재작성:
    - `db_schema_version` (site_config) 기반 버전 비교 UI
    - null 상태: `setup.sql` / `migration-whole.sql` 실행 안내 패널
    - 미적용 마이그레이션: SQL 복사 버튼 + "자동 적용" 버튼
    - 적용 완료 마이그레이션: 접힌 형태로 표시 (버전 배지 포함)
    - 새로고침 버튼으로 DB 버전 재조회
- `tsconfig.json`: `"resolveJsonModule": true` 추가

### Feat: DB 스키마 마이그레이션 SQL 파일 (v0.6.8)

- `supabase/migration-whole.sql` (신규): feedback 브랜치 이전 DB를 현재 스키마(v0.6.4)로 일괄 업데이트하는 idempotent SQL
    - pgcrypto 확장, site_config / resume_data 테이블 생성, tags/posts/portfolio_items 컬럼 추가
    - books 테이블 + 인덱스 + 트리거 + RLS 정책, exec_sql 함수, db_schema_version 초기화
- `supabase/migrations/v0.6.4_exec_sql.sql` (신규): exec_sql 함수 단독 마이그레이션 (service_role 전용)
- `supabase/setup.sql` 업데이트: books 테이블 + 인덱스 + RLS + exec_sql 함수 + db_schema_version 초기값 추가

## 2026-03-18

### Feat: Admin - 포트폴리오 보기 방식 설정 (v0.6.7)

- `PortfolioView.tsx`: `forcedViewMode?: "list" | "block"` prop 추가 — 지정 시 토글 UI 숨김 및 해당 뷰 고정
- `portfolio/index.astro`: `site_config.portfolio_view_mode` 읽어 `forcedViewMode`로 전달
- `PortfolioPanel.tsx`: 헤더에 List/Block/User 3단계 보기 방식 설정 버튼 추가
    - List/Block: 모든 방문자에게 해당 뷰 고정, User: 방문자가 직접 선택 (기존 동작)
    - 선택값 `site_config.portfolio_view_mode`에 upsert/delete로 저장

### Feat: Admin - PortfolioPanel 도서 관리 탭 (v0.6.6)

- `BooksSubPanel.tsx` (신규): books 테이블 CRUD 관리 컴포넌트
    - 필드: 제목/slug/저자/표지(업로드)/한줄 소개/태그/직무 분야/별점(1–5)/리뷰 본문/발행 설정/SEO
    - 자동 저장 (useAutoSave), 미저장 경고 (useUnsavedWarning)
    - Featured 최대 5개 제한 + 토스트, Publish/Unfeature 목록 직접 토글
    - 정렬(순서/A→Z/Z→A/역순/Featured), 발행 상태 필터, 제목·저자 검색 — localStorage 유지
- `PortfolioPanel.tsx`: 상단에 "포트폴리오 / 도서" 탭 전환 UI 추가, BooksSubPanel 탭 렌더링
- `JobFieldItem.slug` → `JobFieldItem.id` 오타 수정 (PostsPanel, PortfolioPanel 필터 셀렉트)

### Feat: Frontend - 포트폴리오 관련 도서 섹션 + books 상세 페이지 (v0.6.5)

- `supabase/migrations/006_create_books.sql`: books 테이블 생성 (slug, title, author, cover_url, description, content, rating, tags[], job_field[], published, featured, order_idx, data jsonb, SEO 필드, RLS 포함)
- `portfolio/[slug].astro`: 하단에 관련 도서 섹션 추가 — 프로젝트의 job_field와 overlaps 쿼리로 매칭, 표지·저자·별점 카드 표시
- `src/pages/books/[slug].astro` (신규): 도서 리뷰 상세 페이지 — 표지 사이드바, 별점, 태그, Markdoc 본문 + TOC + Mermaid 지원

### Feat: Frontend - 404 페이지 / 블로그 URL 필터 / Medium 스타일 마크다운 (v0.6.4)

- `src/pages/404.astro` (신규): "페이지를 찾을 수 없음" 메시지 + 5초 카운트다운 자동 홈 리다이렉트
- `src/lib/blog.ts`: 블로그 포스트 요약 추출 시 Supabase 스토리지 URL 및 이미지 마크다운 제거 (정규식 필터)
- `src/styles/global.css`: `.post-content.prose` / `.portfolio-markdoc-body.prose` Medium/TailwindCSS 블로그 스타일로 개선
    - 본문 18px, 줄간격 1.85, 첫 단락 1.2rem/1.75 강조
    - 이미지 border-radius 0.75rem + 그림자
    - h2/h3 상하 여백 및 ul/ol 들여쓰기 개선
- `blog/[slug].astro`: 뒤로가기 SVG → lucide `ArrowLeft` 아이콘 교체

### Feat: Admin - PortfolioPanel 정렬/필터/배치 액션 + Featured 제한 (v0.6.3)

- `PortfolioPanel.tsx`: Featured(인디고·Star)/Unfeature(회색·StarOff) 버튼 아이콘 구분
- Publish/Unpublish 버튼 목록에서도 직접 토글 가능 (기존은 편집 폼 내부에서만 가능)
- Featured 최대 5개 제한 — 초과 시 browser alert 없이 하단 토스트 알림
- 정렬: 순서/제목/Published/Draft/Featured 먼저, localStorage 유지 (`portfolio_sort`)
- 필터: 발행 상태, 직무 분야, 제목·slug 검색
- 체크박스 + 배치 액션: 일괄 발행/미발행, 직무 분야 일괄 변경
- 직무 분야 미설정 항목 경고 배지, 태그 최대 4개 인라인 표시

### Feat: Admin - PostsPanel 정렬/필터/배치 액션 (v0.6.2)

- `PostsPanel.tsx`: Publish(초록·Eye)/Unpublish(주황·EyeOff) 버튼 아이콘 구분
- 정렬: 최신순/오래된순/제목 A→Z/제목 Z→A/Published/Draft, 선택값 localStorage 유지 (`post_sort`)
- 필터: 발행 상태, 직무 분야, 제목 검색
- 체크박스 전체/개별 선택 + 배치 액션: 일괄 발행/미발행, 직무 분야 일괄 변경
- 직무 분야 미설정 포스트 AlertTriangle 경고 배지 표시
- 태그 최대 4개 인라인 표시 (+N 오버플로 카운트)

### Feat: Admin - TagPanel 카테고리 관리 및 태그 정렬 (v0.6.1)

- `TagsPanel.tsx`: 카테고리 탭 추가 — `posts` 테이블에서 distinct 카테고리 목록 로드 (게시글 수 포함)
- 카테고리 이름 변경 (전체 포스트에 일괄 반영) 및 삭제 기능 (삭제 시 포스트 category null 처리)
- 태그 및 카테고리 각각 A→Z / Z→A 정렬 지원, 선택값 localStorage 유지 (`admin_tag_sort`, `admin_cat_sort`)
- lucide-react 아이콘 전면 적용 (Tag, FolderOpen, ArrowUpAZ, ArrowDownAZ, Pencil, Trash2, Plus)

### Feat: Admin - DB 마이그레이션 추적 패널 (v0.5.17–v0.5.20)

- `supabase/migrations/` + `src/lib/migrations.ts`: 마이그레이션 메타데이터(id, 설명, SQL) 관리
- `MigrationsPanel.tsx` (신규): 미적용/완료 마이그레이션 표시, SQL 복사, 완료 체크 — 적용 상태 `site_config.applied_migrations` 저장
- SQL djb2 해시로 변경 감지 — 적용 후 SQL 수정 시 ⚠ 경고 배지 표시
- 마이그레이션 목록 정렬 드롭다운 (최신순/오래된순), `setup.sql`에 baseline 삽입으로 신규 설치 시 재실행 방지
- `004_resume_data.sql` 테이블명 오타 수정

### Feat: Admin - ResumePanel 기능 확장

- `ResumePanel.tsx`: 자동 저장(Auto-save) 추가 — DB 직접 저장, 5초 interval
- 수상(Awards) 섹션 신규 추가 (마크다운 렌더링 토글 지원)
- 프로젝트 라이브 URL 및 URL 표시 텍스트 편집 기능
- 경력/프로젝트 날짜에서 일(Day) 숨기기 토글 (연-월만 표시)
- 이력서 섹션 제목 커스텀 (이모지 포함 자유 입력)
- 경력/프로젝트 드래그 앤 드롭 순서 변경
- 프로젝트 자유 양식 섹션 에디터 (기본 필드 설명/성과 + 커스텀 섹션)
- 경력/프로젝트 섹션 마크다운 렌더링 토글
- 직무 분야 필터링 + 경험/프로젝트 항목 복사 기능
- 날짜 입력 → 표준 `<input type="date">` 교체 (v0.5.21)

### Feat: Frontend - 블로그 포스트 GitHub 형식 목차 및 TOC 스타일 토글

- `GithubToc.astro` (신규): GitHub README 스타일 인라인 목차 블록 렌더링
- `blog/[slug].astro`: 포스트별 `toc_style` 설정 (`hover` | `github` | `both`) 지원 — 사이드 TOC, 본문 상단 GitHub TOC, 또는 둘 다 표시

### Fix: 스킬 키워드 직접 타이핑 시 쉼표 입력 버그 수정

- `ResumePanel.tsx`: 스킬 키워드 input에서 쉼표 입력 시 이벤트 중복 발생 버그 수정

## 2026-03-16

### Refactor: LaTeX 편집기 — MathLive 제거, KaTeX 기반 재구현

- `LatexEditorModal.tsx`: MathLive web component + 가상 키보드 제거 → `<textarea>` 직접 입력 + KaTeX 실시간 미리보기로 교체. `\beta`, `\theta` 등 임의 기호 입력 가능
- `RichMarkdownEditor.tsx`: `LatexDirectiveDescriptor` + `LatexDirectiveEditor` + `KatexBlock` 추가 — 에디터 내에서 `::latex{src="..."}` directive를 KaTeX로 렌더링. `LatexDirectiveDescriptor`를 `directivesPlugin`에 등록
- `mdx-directive-converter.ts`: `$$...$$` ↔ `::latex{src="..."}` 양방향 변환 추가 — 에디터 로드 시 `jsxToDirective`에서 `$$` 블록을 directive로 변환, 저장 시 `directiveToJsx`에서 역변환. DB 저장 포맷(`$$...$$`)은 유지
- `package.json`: `mathlive` 의존성 제거, v0.5.4

## 2026-03-15

### 태그 편집기 OKLCH 색상 피커 추가 (TagsPanel)

- 색상 필드 우측에 "OKLCH 피커" 토글 버튼 추가
- 피커 열면 Lightness / Chroma / Hue 3개 슬라이더 표시
    - 각 슬라이더 배경이 현재 값에 맞게 실시간 그라디언트로 렌더링
    - 슬라이더 조작 시 `oklch(L C H)` 형식으로 텍스트 입력 필드 자동 업데이트
- 텍스트 필드에 oklch 문자열 직접 입력 시 슬라이더도 동기화
- 태그 수정 시 기존 oklch 색상 값이면 슬라이더 자동 복원

### 태그 편집기 색상 preview 추가 (TagsPanel)

- 색상 input 옆에 실시간 color swatch 추가
    - `form.color`가 있을 때만 `h-9 w-9` 정사각형 스와치 표시
    - `style={{ backgroundColor: form.color }}`로 입력값 실시간 반영

### 에디터 섹션 카드 배경색 구분 (PostsPanel, PortfolioPanel)

- 섹션 카드 bg `bg-(--color-surface)` → `bg-(--color-surface-subtle)` 교체 (TagsPanel 기준 일치)
    - 라이트 모드: 카드가 페이지 배경보다 살짝 어두워져 섹션 구분 명확
    - 다크 모드: 카드가 페이지 배경보다 살짝 밝아져 섹션 구분 명확
    - 인풋/textarea는 `bg-(--color-surface)` 유지 (카드보다 밝아 입력 필드 식별 가능)

### JobFieldBadges 배경색 수정 (JobFieldSelector)

- 배지 bg `bg-(--color-border)` → `bg-(--color-tag-bg)` 교체
    - border 색상 조정으로 배지가 너무 어둡게/밝게 보이는 문제 해결
    - `--color-tag-bg`는 모든 테마에서 태그/배지 배경용으로 설계된 변수

### 에디터 인풋 배경색 구분 (PostsPanel, PortfolioPanel)

- 인풋/textarea `bg-(--color-surface)` → `bg-(--color-surface-subtle)` 교체
    - 라이트 모드: 페이지 배경보다 약간 더 어두운 배경으로 입력 필드 식별성 향상
    - 다크 모드: 페이지 배경보다 약간 더 밝은 배경으로 입력 필드 식별성 향상
    - 섹션 카드(`bg-(--color-surface)`)와 명확히 구분됨

### 전역 border 색상 개선 + 에디터 border 두께 복원

- `global.css` 전 테마의 `--color-border` 조정
    - 라이트 plain(`#e5e5e5`) → `#c4c4c4`, 다크 plain(`#404040`) → `#666666`
    - forest 라이트 `#a7f3d0` → `#6ee7b7`, 다크 `#1a362b` → `#2d6651`
    - sunset 라이트 `#fed7aa` → `#fdba74`, 다크 `#3d241d` → `#6e3e30`
    - lavender 라이트 `#ddd6fe` → `#c4b5fd`, 다크 `#2e2445` → `#523e7a`
    - blue 라이트 `#cbd5e1` → `#94a3b8`, 다크 `#273040` → `#3d5070`
    - beige 라이트 `#e7e5e4` → `#d6d3d1`, 다크 `#36322e` → `#665c52`
    - blackwhite 다크 `#262626` → `#525252`
- PostsPanel, PortfolioPanel: 인풋/섹션 border `border-2` → `border` 복원, `border-gray-400` → `border-(--color-border)` 복원

### 포트폴리오 에디터 UI 개선 (PortfolioPanel)

- 편집 폼을 4개 섹션 카드로 그룹핑 — "기본 정보 / 프로젝트 상세 / 본문 / 발행 설정"
- 섹션별 번호 배지로 작성 순서 안내
- Published/Featured 체크박스 → 토글 스위치 + 상태 설명 텍스트
- 저장/취소 버튼을 sticky 하단 바로 이동
- 인풋/textarea border `border-2` 적용, 섹션 카드 액센트 컬러 border
- `toggle()` 헬퍼 함수로 중복 제거

### 포스트 에디터 border 가시성 개선 (PostsPanel)

- 섹션 카드 border: `border` → `border-2 border-(--color-accent)/30` — 컬러 틴트로 섹션 구분 명확화
- 인풋/textarea border: `border` → `border-2` — 두께 증가로 입력 박스 식별 향상
- 토글 행, SEO 패널 border: `border` → `border-2`

### 포스트 에디터 UI 개선 (PostsPanel)

- 편집 폼을 3개 섹션 카드로 그룹핑 — "기본 정보 / 본문 / 발행 설정"
- 섹션별 번호 배지로 작성 순서 안내
- 발행 여부 체크박스 → 토글 스위치 + 상태 설명 텍스트로 교체
- 저장/취소 버튼을 sticky 하단 바로 이동 — 스크롤 위치 무관하게 항상 접근 가능
- 자동저장 상태를 헤더 우측 및 sticky 바에 표시
- 필드에 placeholder 및 보조 설명 텍스트 추가

### 발행일 기본값 KST 적용 (PostsPanel)

- **원인:** `EMPTY_FORM`의 `pub_date` 초기값이 `new Date().toISOString()`을 사용해 UTC 기준 시각을 반환했음. `datetime-local` input은 표시만 로컬 시간대로 보이지만, 초기값 문자열 자체가 UTC로 계산되어 KST(UTC+9)와 최대 9시간 차이 발생
- **수정:** `Date.now() + 9 * 60 * 60 * 1000`으로 KST offset을 직접 더해 ISO 문자열 생성 → `pub_date` 기본값이 항상 KST 기준으로 초기화됨

### Vercel Template Support

- `vercel.json` 추가 — Astro framework preset, pnpm build/install 명령 설정
- `GUIDE.md` 삭제
- `README.md` 전면 재작성 — 간단한 프로젝트 소개 + 한국어 5단계 배포 가이드만 남김
    - Supabase 프로젝트 생성 → SQL 실행 → Vercel 배포 → Admin 계정 생성 → Deploy Hook 설정 순서로 안내
    - `PUBLIC_VERCEL_DEPLOY_HOOK_URL`은 초기 배포 버튼에서 제외하고 사후 설정으로 안내

## 2026-03-13

### Feat: RichMarkdownEditor - LaTeX, 풀스크린, Sticky 툴바

- `LatexEditorModal.tsx` (신규): MathLive 기반 시각적 수식 편집 모달 (가상 키보드 포함)
- `RichMarkdownEditor.tsx`: `∑ LaTeX` 툴바 버튼 추가 → `LatexEditorModal` 열기 → `$$...$$` 삽입; 풀스크린 토글 버튼 추가; toolbar sticky 적용
- `markdown.tsx`: `remark-math` + `rehype-katex` 플러그인 추가 (프론트엔드 LaTeX 렌더링)
- `BaseLayout.astro`: KaTeX CSS 추가

## 2026-03-12

### Feat: PostsPanel / PortfolioPanel - Job Field 표시 및 선택 추가

- `JobFieldSelector.tsx` (신규): `JobFieldSelector` + `JobFieldBadges` 공유 컴포넌트 추출
- `ResumePanel.tsx`: 로컬 정의 제거, 공유 컴포넌트 import로 교체
- `PostsPanel.tsx`: `job_field` 컬럼 추가 (`Post` 타입, select, payload), `JobFieldSelector` (편집), `JobFieldBadges` (목록)
- `PortfolioPanel.tsx`: `jobField` 타입 `string → string[]`, `itemToForm` 정규화 업데이트, `JobFieldSelector` (편집), `JobFieldBadges` (목록)

### Fix: SiteConfigPanel - Job Field 삭제 cascade 누락 수정

- `SiteConfigPanel.tsx`: `handleDeleteJobField`에 `portfolio_items.data.jobField` (JSONB) 및 `resume_data` work/projects.jobField cascade 추가. 기존에는 `portfolio_items.job_field` 컬럼만 정리해 badge에 raw id가 남는 문제 발생

### Feat: SiteConfigPanel - Job Field 상속 기능 추가

- `SiteConfigPanel.tsx`: 새 job field 추가 폼에 "상속" 드롭다운 추가. 선택 시 부모 field를 가진 posts(job_field TEXT[]), portfolio_items(data.jobField), resume_data(work/projects.jobField)에 새 id 자동 추가
- `SiteConfigPanel.tsx`: `handleDeleteJobField` cascade를 TEXT[] 기준으로 변경 (`.cs()` + fetch/filter/update)
- `USER_TASKS.md`: `posts.job_field`, `portfolio_items.job_field` TEXT → TEXT[] 마이그레이션 SQL 기록

### Fix: AboutPanel - 프로필 이미지 출처를 resume_data.basics.image로 통일

- `AboutPanel.tsx`: `about_data.profileImage` 대신 `resume_data.basics.image`를 로드/저장 (AboutView와 동일 출처)
- 저장 시 `resume_data.data` 전체 병합 후 `basics.image`만 교체

### Feat: AboutPanel - 프로필 이미지 업로드 + Job Field별 소개

- `src/types/about.ts`: `FieldIntroduction` 타입 추가, `AboutData`에 `introductions` 필드 추가
- `AboutPanel.tsx`: URL input → 파일 업로드 UI (미리보기, 삭제 버튼, `uploadImageToSupabase` 연동)
- `AboutPanel.tsx`: Job Field별 소개 오버라이드 섹션 추가 (소개 추가/삭제, default 값 inherit, `site_config.job_fields` 연동)

### Refactor: Auto-save - 비활성 감지 기반 저장 방식으로 변경

- `useAutoSave.ts`: localStorage 완전 제거. 자동 저장 = DB 직접 저장. `(isDirty, enabled, saveFn)` 시그니처로 변경. 5s interval에서 isDirty이면 saveFn() 호출.
- `PostsPanel.tsx`, `PortfolioPanel.tsx`: `buildPayload()` 헬퍼 추출, `autoSave()` 함수 추가 (DB에 직접 insert/update). 신규 항목 자동 저장 시 insert 후 editTarget을 실제 항목으로 전환. `savedAt` 패널 state로 이관. localStorage/getAutoSaveDraft 관련 코드 전부 제거.

### Feat: 랜딩 페이지 - Work Experience 섹션 추가

- `index.astro`: `job_field` fetch 추가, resume work 항목 필터링(job_field 기준) 후 최대 4개 표시
- About ~ Portfolio 사이에 Modern 타임라인 스타일의 compact Work 섹션 삽입

### Feat: ResumePanel - Skills/Languages 편집 UI 추가

- `ResumePanel.tsx`: 스킬(카테고리명·숙련도·키워드) 및 언어(언어명·능숙도) 섹션 추가, 추가/수정/삭제/취소 지원

### Feat: ResumePanel - Education GPA 입력

- `resume.ts`: `ResumeEducation`에 `gpa?: number`, `gpaMax?: 4 | 4.5` 추가
- `ResumePanel.tsx`: Education 편집 폼에 Max GPA 셀렉터 + GPA 숫자 입력 추가, Max GPA 변경 시 기존 값 비례 환산
- `ResumeClassic/Modern/Minimal.astro`: `gpa` + `gpaMax` 우선 표시, 없으면 기존 `score` fallback

### Feat: ResumePanel - Work/Project/Education 편집 UX 개선

- `ResumePanel.tsx`: Work/Project collapsed 뷰에 선택된 직무 분야 배지 표시
- `ResumePanel.tsx`: Project, Education 편집 폼에 취소 버튼 추가 (backupData 복원)

### Feat: ResumePanel - Work/Project 직무 분야 선택

- `resume.ts`: `ResumeWork`, `ResumeProject`의 `jobField` 타입을 `string | string[]`으로 동적화
- `ResumePanel.tsx`: `job_fields` fetch 추가, Work/Project 편집 폼에 `JobFieldSelector` 컴포넌트 추가
- `resume/index.astro`: `jobField` 미설정 항목 미노출 (`null → return false`, 빈 배열 포함)

### Feat: ResumePanel - 레이아웃 선택 기능

- `ResumePanel.tsx`: 레이아웃 선택 UI 추가 (Classic/Modern/Minimal), 저장 시 `site_config.resume_layout` upsert
- `resume/index.astro`: `resume_layout` fetch 후 선택된 Astro 컴포넌트만 렌더링, `ResumeView` React island 제거
- `ResumeView.tsx`: 삭제 (탭 전환 역할 불필요)

### Chore: supabase/setup.sql 통합 파일 추가 + 구 마이그레이션 파일 삭제

- 001~005 마이그레이션을 단일 `supabase/setup.sql`로 통합, `migrations/` 폴더 삭제
- 신규 사용자가 이 파일 하나만 실행하면 전체 스키마 초기화 가능
- `CREATE TABLE`에 모든 컬럼 포함 (ALTER TABLE 불필요)
- Storage `images` 버킷 + RLS 정책 포함 (경로는 `image-upload.ts`가 런타임 생성)

### Feat: SiteConfigPanel - 직무 분야 동적 관리

- `supabase/migrations/005_job_fields.sql`: `posts`, `portfolio_items`에 `job_field TEXT` 컬럼 추가, `site_config`에 `job_fields` 배열 초기값 삽입
- `SiteConfigPanel.tsx`: 하드코딩된 web/game 토글 → 동적 job fields 리스트 관리로 교체
    - emoji picker (`@emoji-mart/react`) + 이름 입력으로 새 직무 분야 추가
    - 삭제 시 `posts.job_field`, `portfolio_items.job_field` cascade 초기화
    - 활성 직무 분야 클릭 선택 → 즉시 `site_config.job_field` 저장
- `src/env.d.ts`: `@emoji-mart/react`, `@emoji-mart/data` 타입 선언 추가

### Feat: 어드민 발행 상태 표기 영문화

- `PostsPanel`: 상태 badge "발행"→"Published", "초안"→"Draft" / 토글 버튼 "초안으로"→"Unpublish", "발행"→"Publish" / 체크박스 레이블 영문화
- `PortfolioPanel`: 상태 badge "발행"→"Published", "초안"→"Draft" / 폼 체크박스 "발행"→"Publish"

### Feat: 어드민 액션 버튼 스타일 통일

- 모든 패널의 편집 버튼 → `bg-blue-600 text-white whitespace-nowrap`
- 모든 패널의 삭제 버튼 → `bg-red-600 text-white whitespace-nowrap`
- 모든 패널의 토글(발행/featured) 버튼 → `bg-slate-500 text-white whitespace-nowrap`
- ResumePanel의 링크형 추가/수정/삭제 버튼 → 모두 solid 버튼으로 교체
- 기존 accent 색상 primary 버튼에 `whitespace-nowrap` 추가

### Feat: 어드민 비활동 자동 로그아웃 + 남은 시간 표시

- `AdminDashboard.tsx`: 비활동 1시간 경과 시 자동 로그아웃 (`mousemove`, `keydown`, `click`, `scroll` 기반 타이머)
- `AdminDashboard.tsx`: 헤더에 남은 시간 표시 (MM:SS), 5분 이하 시 빨간색으로 변경
- `AdminDashboard.tsx`: 로그아웃 버튼 및 자동 로그아웃 모두 `scope: "global"` — 모든 기기에서 세션 만료

### Refactor: 프로필 이미지 단일 출처 통일 (`resume_data.basics.image`)

- `AboutView.tsx`: `about_data`와 `resume_data` 병렬 fetch로 변경 — `basics.image`를 프로필 이미지 단일 출처로 사용. `AboutData.profileImage` 필드 제거
- `index.astro`: Promise.all에 `resume_data` fetch 추가 — `basics.image`를 About 프리뷰 이미지 소스로 사용. `AboutData.profileImage` 필드 제거

### Refactor: About 페이지 + 랜딩 About 프리뷰 UI 개선

- `AboutView.tsx`: 연락처 pill 버튼 → 2-column bordered grid (label + value)
- `AboutView.tsx`: 섹션 불릿 dot → ✓ 체크마크
- `index.astro`: About 프리뷰에 `profileImage` 추가 fetch
- `index.astro`: About 프리뷰 레이아웃 — 프로필 이미지 + 이름 + 설명 compact 카드 형태로 변경, "소개 전체 보기" 버튼을 텍스트 블록 하단으로 이동

### Fix: SiteConfigPanel 사이트명 저장/로드 연동

- `SiteConfigPanel`: 로드 시 `site_name` key 추가 fetch, `seoConfig.defaultTitle` 에 반영
- 저장 시 `site_name` key upsert 추가 — SEO.astro/Header가 읽는 단일 출처와 연결
- `seo_config`에서 `default_title` 필드 제거 (site_name이 단일 출처)

### Feat: 사이트명을 Supabase `site_name`에서 동적으로 수신

- `SEO.astro`: `seo_config` 단독 fetch → `site_name` + `seo_config` 통합 fetch로 변경. `site_name` 값을 `defaultTitle`로 사용
- `Header.astro`: `site_name` DB fetch 추가, 로고 텍스트를 DB 값으로 렌더링
- `index.astro`: `about_data` + `site_name` 병렬 fetch 추가. `heroName` fallback을 `siteName`으로 변경, 홈 title에서 하드코딩 제거
- `about/index.astro`, `blog/index.astro`, `portfolio/index.astro`: title prop에서 `- FoliumOnline` 제거 (SEO가 자동 suffix 처리)
- `blog/[slug].astro`, `portfolio/[slug].astro`, `resume/index.astro`: 동적 title 구성에서 `FoliumOnline` 하드코딩 제거
- `admin/index.astro`: `color_scheme` + `site_name` 통합 fetch, `<title>` 태그를 DB 값으로 변경
- `admin/login.astro`: `site_name` fetch 추가, `<title>` 태그 및 `LoginForm`에 prop 전달
- `LoginForm.tsx`: `siteName` prop 추가, 워드마크를 prop 값으로 렌더링
- `SiteConfigPanel.tsx`: `seoConfig.defaultTitle` 초기값 하드코딩 제거

## 2026-02-27

### Fix: React Invalid Hook Call 에러 수정

- `@vitejs/plugin-react` (v5.1.4)를 devDependencies에서 제거 — `@astrojs/react`가 내부적으로 v4.7.0을 이미 사용하므로 두 버전이 충돌
- `@mdx-js/react`를 dependencies에서 제거 — 소스 코드에서 사용하지 않는 불필요한 의존성
- `vitest.config.ts`를 Astro의 `getViteConfig`로 전환하여 별도 `@vitejs/plugin-react` 의존성 불필요
- `astro.config.mjs`의 `integrations` 순서를 `[mdx(), react()]`로 변경
- `astro.config.mjs`에 `suppressReactHookWarning` Vite 플러그인 추가 — Astro 5의 MDX+React SSR 렌더러 충돌로 인한 콘솔 경고 억제
- 관련 이슈: [withastro/astro#12802](https://github.com/withastro/astro/issues/12802)
