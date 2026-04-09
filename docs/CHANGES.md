# CHANGES

## v0.10.19 (2026-04-09)

### Fix: 에셋 이전 handleSave 누락 + Storage RLS 정책 마이그레이션

- `src/components/admin/panels/PostsPanel.tsx`: `handleSave`에 `migrateAssetsIfNeeded()` 호출 추가 (수동 저장 시에도 에셋 이전 실행)
- `src/components/admin/panels/PortfolioPanel.tsx`: 동일 수정
- `src/lib/image-upload.ts`: `listStorageFiles`, `moveStorageFolder`, `deleteStorageFolder` 에러 로깅 추가
- `src/lib/migrations.ts`: Storage RLS 정책 마이그레이션 2건 추가 (SELECT authenticated, UPDATE/DELETE authenticated) — 수동 실행 필요

## v0.10.18 (2026-04-09)

### Feat: Slug 자동 생성 (한글 romanization) + 에셋 이전 + 삭제 cleanup

- `src/lib/slug.ts`: `toSlug` (transliteration 기반 한글→romanized slug), `uniqueSlug` (DB 중복 검사 + suffix)
- `src/lib/image-upload.ts`: `listStorageFiles`, `moveStorageFolder`, `deleteStorageFolder`, `replaceImageUrls` 유틸 추가 + 이미지 중복 처리 TODO
- `src/components/admin/RichMarkdownEditor.tsx`: `transferring` prop + "에셋 이전 중..." overlay
- `src/components/admin/panels/PostsPanel.tsx`: slug 변경 감지 → 에셋 자동 이전, 삭제 시 스토리지 cleanup, slug UI (수동 편집 + 자동 생성 토글)
- `src/components/admin/panels/PortfolioPanel.tsx`: 동일 패턴 적용
- `src/components/admin/panels/BooksSubPanel.tsx`: inline toSlug 제거, slug.ts import
- `src/__tests__/slug.test.ts`: toSlug + uniqueSlug 테스트 (9개)

## v0.10.17 (2026-04-09)

### Feat: 스크롤 reveal 애니메이션 + active nav 표시

- `src/components/ScrollRevealInit.tsx`: IntersectionObserver + MutationObserver 기반 scroll reveal (viewport 내 요소 즉시 reveal, 동적 렌더링 요소 자동 감지)
- `src/styles/global.css`: `.scroll-reveal`, `.stagger-child`, `.img-hover-zoom`, `:focus-visible`, active nav 스타일 추가
- `src/components/Header.tsx`: `usePathname` 기반 `aria-current="page"` active nav 표시
- `src/app/(frontend)/page.tsx`, `portfolio/page.tsx`, `blog/page.tsx`, `AboutView.tsx`: 주요 섹션에 `scroll-reveal` 적용

## v0.10.16 (2026-04-09)

### Refactor: 프론트엔드 max-width 축소

- `src/app/(frontend)/layout.tsx`: main 래퍼 `max-w-[1350px]` → `max-w-6xl` (1152px)
- `src/components/Header.tsx`: nav `container` → `max-w-6xl` (콘텐츠 영역과 정렬)
- `src/components/AboutView.tsx`: loading/error 상태 `max-w-7xl` → `max-w-5xl`

## v0.10.15 (2026-04-09)

### Feat: Tailwind named color 스킴 확장 + PDF 내보내기 + 인증 UX 개선

- `src/lib/color-schemes.ts`: 17개 Tailwind named color (red~rose) 스킴 정의, 기존 커스텀 스킴 (slate/ember/circuit/phantom) 제거
- `src/styles/tailwind-color-schemes.css`: 전체 스킴 CSS 변수 (light/dark) + plain 모드 + PDF 중립 흑백 스킴
- `src/styles/global.css`: 커스텀 스킴 CSS 제거, Tailwind 스킴 CSS import
- `src/components/admin/panels/SiteConfigPanel.tsx`: 그리드 버튼 → 드롭다운 (색상 스와치) + plain 모드 토글
- `src/lib/mermaid-themes.ts`: 전체 스킴 mermaid 테마 동기화
- `src/app/layout.tsx`: VALID_SCHEMES 동적화, plain_mode SSR/localStorage 지원, 기본 스킴 blue
- `src/components/PdfPreviewModal.tsx`: PDF 프리뷰 모달 (사이드바 컨트롤, 컬러 스킴 선택, 로딩 애니메이션, 다중 페이지 PDF)
- `src/components/PdfExportButton.tsx`: 인증된 사용자만 PDF 내보내기 버튼 표시
- `src/app/(frontend)/resume/page.tsx`, `portfolio/page.tsx`: PdfExportButton 래핑
- `src/components/ThemeToggle.tsx`: 컬러 스킴 선택 제거, dark/light/system만 표시
- `src/components/UserMenu.tsx`: 헤더 로그인/프로필 드롭다운 (Admin + 로그아웃)
- `src/components/Header.tsx`: UserMenu 추가, isDev Admin 링크 제거
- `src/components/admin/LoginForm.tsx`: returnUrl 지원 (로그인 후 이전 페이지로 복귀)
- `src/app/admin/login/page.tsx`: searchParams에서 returnUrl 전달

## v0.10.12 (2026-04-04)

### Fix: 에디터 fullscreen 모드에서 이미지 업로드 모달이 가려지는 버그 수정

- `src/components/admin/TiptapImageUpload.tsx`: 모달 backdrop `z-50` → `z-[110]` 변경 — fullscreen 에디터 컨테이너(`z-[100]`)보다 높은 z-index로 모달이 항상 최상단에 표시되도록 수정

## v0.10.11 (2026-04-01)

### Feat: Admin 레이아웃 재구성 — 전체 너비 헤더 + 사이드바 토글 (v0.10.11)

- `src/components/admin/AdminSidebar.tsx`: 사이드바 토글 버튼 추가
- `src/components/admin/AdminHeader.tsx`: 전체 너비 헤더로 변경 & 사이드바 토글 버튼 추가
- `src/components/admin/AdminDashboard.tsx`: 메인 영역 너비 조정

### Fix: AboutPanel 히어로 섹션 개선 (v0.10.8~v0.10.10)

- Pillar/Value 개별 카드 디자인 + 입력 필드 라벨 (Keyword/Sub/Description, Title/Description)
- Max 제한: Pillars 3개, Values 4개
- 삭제 시 confirm 팝업 + cursor-pointer
- 연락처 Input 테마 적응 (inputCls + shadow-none)
- 히어로 CTA 버튼 패딩 축소

### Refactor: AboutPanel 카드 기반 UI 리디자인 (v0.10.7)

- Separator 제거, 카드 기반 섹션 레이아웃 (ResumePanel 디자인 언어 통일)
- 저장 버튼 green으로 변경

### Feat: 랜딩 히어로 데이터 DB 이관 (v0.10.6)

- `valuePillars`/`coreValues` hardcoded → `about_data` JSONB 동적 관리
- AboutPanel에 "Landing Page Hero Section" 편집 UI 추가
- DB 마이그레이션 v0.10.6: generic placeholder 데이터 시딩

### Feat: Admin 저장 버튼 하단 고정 footer (v0.10.5)

- SiteConfigPanel, AboutPanel: 저장 버튼을 sticky bottom footer bar로 이동

### Feat: Squircle (G2 Continuity) 디자인 (v0.10.4)

- 사이트 전체 `rounded-full` → squircle 스타일 통일: 버튼 `rounded-2xl`, 태그/배지 `rounded-lg`, 필터 `rounded-xl`
- shadcn Badge 컴포넌트 `rounded-full` → `rounded-lg`

### Fix: Admin 버튼 컬러 테마 적응 (v0.10.3)

- `bg-blue-600 text-white` → `bg-(--color-accent) text-(--color-on-accent)` 전환 (7개 패널, 12건)
- `bg-indigo-600` → `bg-(--color-accent)` 전환 (2건)
- SiteConfigPanel: 저장 버튼 + 직군 선택 버튼 테마 적응형으로 수정

## v0.10.0 (2026-04-01)

### Feat: 프론트엔드 디자인 오버홀 — UE5 게임 개발자 미학 (v0.10.0)

**Design System**

- `src/styles/global.css`: 12개 기존 컬러 스킴 → 4개 UE5 inspired 스킴 (slate/ember/circuit/phantom)으로 교체. Space Grotesk 디스플레이 폰트 추가 (`--font-display`). 다크모드 prose에서 `folium-primary`/`folium-hue` → 스킴 토큰 `--color-accent` 참조로 전환
- `src/app/layout.tsx`: `VALID_SCHEMES` 4개로 축소, 기본값 `gray` → `slate`
- `src/lib/mermaid-themes.ts`: 4개 신규 스킴에 맞춰 전면 재작성

**Landing Page**

- `src/components/LandingHeroSwitcher.tsx`: 터미널/코드 에디터 미학 완전 제거 (TerminalBadge, StatsCard, 트래픽라이트 윈도우). Space Grotesk 대형 타이포, accent 하이라이트 히어로 이름, 클린 패널 스타일 value pillars로 교체
- `src/app/(frontend)/page.tsx`: 섹션 순서 변경 (Portfolio Featured → 핵심 역량 → Work → Blog). 섹션 제목에 `font-(--font-display)` 적용. 카드 모서리 `rounded-2xl` → `rounded-xl`

**Header & Theme**

- `src/components/Header.tsx`: Space Grotesk 폰트 + 각괄호 accent 로고. 헤더 패딩/보더 강화
- `src/components/ThemeToggle.tsx`: 드롭다운에 "Color" 섹션 추가 — slate/ember/circuit/phantom 4개 컬러 스킴 프론트엔드 선택 UI

**Admin Polish**

- `src/components/admin/AdminSidebar.tsx`: 간격 축소, active 상태 accent 배경 tint 추가
- `src/components/admin/AdminHeader.tsx`: 타이틀에 `font-(--font-display)`, 타이머 pill 스타일
- `src/components/admin/AdminDashboard.tsx`: main 영역 미세 조정
- `src/components/admin/LoginForm.tsx`: 헤딩 디스플레이 폰트, 카드 보더/그림자 개선
- `src/components/admin/panels/SiteConfigPanel.tsx`: 12개 → 4개 신규 컬러 스킴 옵션 반영

## v0.9.14 (2026-03-31)

### Feat: MCP 스키마 가이드에 MDX 컴포넌트 문서 추가 (v0.9.14)

- `src/lib/mcp-tools.ts`: `handleGetSchema()`에 `content_components` 섹션 추가 — YouTube, ColoredTable, LaTeX, Mermaid 사용법 안내. content 필드 설명 `"Markdown string"` → `"MDX string (Markdown + JSX components)"` 변경

## v0.9.13 (2026-03-31)

### Feat: GitHub URL 통합 관리 — About/SiteConfig 패널 양방향 동기화 + Header 동적 링크 (v0.9.13)

- `site_config.github_url`을 단일 출처로 사용하여 About 패널과 SiteConfig 패널에서 양방향 편집 가능
- `src/components/admin/panels/SiteConfigPanel.tsx`: 글로벌 SEO 섹션에 GitHub URL 입력 필드 추가, 저장 시 `site_config` upsert
- `src/components/admin/panels/AboutPanel.tsx`: `site_config.github_url`에서 로드 (기존 `about_data.contacts.github` fallback 유지), 저장 시 `site_config`에도 동기화
- `src/components/Header.tsx`: `githubUrl` prop 추가, DB에서 읽은 URL로 GitHub 버튼 동적 연결
- `src/app/(frontend)/layout.tsx`: `site_config`에서 `github_url` 읽어 Header에 전달

## v0.9.12 (2026-03-31)

### Feat: 포트폴리오 Featured 순서 드래그 앤 드롭 관리 (v0.9.12)

- `src/components/admin/panels/PortfolioPanel.tsx`: Admin 포트폴리오 패널에 Featured 순서 조정 UI 추가. HTML5 드래그 앤 드롭으로 featured 항목 순서 변경 → DB `order_idx` 일괄 업데이트.

## v0.9.11 (2026-03-31)

### Feat: 랜딩 페이지 & 이력서 리디자인 — 페르소나 선언형 Hero + 핵심역량 (v0.9.11)

- `src/app/(frontend)/page.tsx`: Hero 섹션을 페르소나 선언형으로 리디자인 (프로필 이미지 + 한 줄 카피 + 3대 핵심 가치 pillars). About 미리보기 제거, 핵심역량 섹션 추가 (4개 역량 카드). 섹션 순서 변경: Hero → 핵심역량 → Portfolio → Work → Blog.
- `src/components/resume/ResumePhases.tsx`: 핵심역량 섹션 추가 (경험→액션→결과 포맷, summary 아래 배치).
- DB (MCP): `basics.label` 게임 개발자 전환 반영, `basics.summary` 스토리텔링 기반 문구 교체, Global Bridge work highlights "일 5억 건" → "시간당 500만 건(일 약 1.2억 건)" 정정.

## Feat: /ship 커스텀 커맨드 스킬 추가

- `.claude/commands/ship.md`: `/ship` 슬래시 커맨드 추가. 커밋 메시지 한국어 포맷, 버전 범프, PR.md/CHANGES.md 업데이트, 테스트 실행 등 커밋 워크플로우 자동화 규칙 정의.

## v0.9.10 (2026-03-29)

### Fix: ThemeToggle 모바일 클릭 토글 + 드롭다운 좌측 정렬 (v0.9.10)

- `src/components/ThemeToggle.tsx`: 버튼에 `onClick` 토글 추가 (모바일 터치 지원). 드롭다운 위치 `right-0` → `left-0` 좌측 정렬.

## v0.9.9 (2026-03-29)

### Fix: z-index 계층 정리 — 사이드바 우선 + ThemeToggle 드롭다운 (v0.9.9)

- `src/components/ThemeToggle.tsx`: 드롭다운 메뉴에 `z-35` 추가
- `src/components/admin/RichMarkdownEditor.tsx`: 전체화면 툴바 `z-50` → `z-30` 하향
- `src/components/tiptap-ui-primitive/toolbar/toolbar.scss`: fixed 툴바 `z-index: 50` → `30` 하향 (사이드바 z-40 우선)

## v0.9.8 (2026-03-28)

### Feat: Admin 패널 모바일 레이아웃 + 사이트 링크 사이드바 이동 (v0.9.8)

- `src/components/admin/AdminHeader.tsx`: "사이트" 링크 + divider 제거 (사이드바로 이동). 타이틀 "Admin" → "Admin 대시보드" + `text-base`로 폰트 확대. `px-3 tablet:px-6` 반응형 padding. gap 축소 (`gap-2 tablet:gap-4`, `gap-2 tablet:gap-3`)
- `src/components/admin/AdminSidebar.tsx`: 하단에 `ExternalLink` 아이콘 + "사이트로 이동" 링크 추가 (`mt-auto`로 하단 고정)
- `src/components/admin/panels/AboutPanel.tsx`: 프로필 섹션 `flex-col tablet:flex-row` 모바일 세로 배치
- `src/components/admin/panels/MigrationsPanel.tsx`: 헤더에 `flex-wrap` 추가
- `src/components/admin/panels/PromptLibraryPanel.tsx`: System Prompt 헤더에 `flex-wrap` + 반응형 padding (2곳)
- `src/components/admin/panels/ResumePanel.tsx`: 기본 정보 프로필 사진 섹션 `flex-col tablet:flex-row` + 파일 input `max-w-full` overflow 방지

## v0.9.7 (2026-03-28)

### Feat: 에디터 반응형 — 툴바 모바일 수정 + 페이퍼 패딩 (v0.9.7)

- `src/components/tiptap-ui-primitive/toolbar/toolbar.scss`: 모바일 `position: absolute` → `position: sticky`로 변경하여 플로우 유지. 미디어 쿼리 480px → 768px 확장. 불필요한 height/border 오버라이드 제거. 가로 스크롤 유지
- `src/components/admin/EditorToolbar.tsx`: Find/Replace 팝업 `w-[480px]` → `w-[calc(100vw-2rem)] tablet:w-[480px]` 반응형
- `src/components/admin/RichMarkdownEditor.tsx`: 전체화면 모드 Source/WYSIWYG 페이퍼 패딩 `p-16` → `p-4 tablet:p-8 laptop:p-16` (2곳)

## v0.9.6 (2026-03-28)

### Feat: Hover-revealed 버튼 모바일 가시성 + icon-only labels (v0.9.6)

- `src/components/admin/panels/PostsPanel.tsx`: 포스트 목록 액션 버튼 `opacity-0 group-hover:opacity-100` → `tablet:opacity-0 tablet:group-hover:opacity-100` (모바일 항상 표시). 버튼 텍스트 `hidden tablet:inline` (모바일 icon-only)
- `src/components/admin/panels/PortfolioPanel.tsx`: 포트폴리오 목록 동일 패턴 적용 (Featured/Publish/편집/삭제 4버튼)
- `src/components/admin/panels/BooksSubPanel.tsx`: 도서 목록 동일 패턴 적용 (Featured/Publish/편집/삭제 4버튼)
- `src/components/admin/panels/TagsPanel.tsx`: 태그/카테고리 수정/삭제 버튼 (2곳)
- `src/components/admin/panels/SiteConfigPanel.tsx`: Job field 삭제 버튼

## v0.9.0–v0.9.5 (2026-03-28)

### Feat: Admin 반응형 디자인 대규모 적용 (v0.9.0–v0.9.5)

- v0.9.0: `sm:` → `tablet:` 무효 브레이크포인트 일괄 교체 (ResumePanel 6곳, ThumbnailUploadField 1곳)
- v0.9.1: 사이드바 모바일 햄버거 토글 (AdminSidebar 오버레이/슬라이드인, AdminHeader 햄버거 버튼, AdminDashboard sidebarOpen state, main padding 반응형)
- v0.9.2: MetadataSheet 다이얼로그 너비 `laptop:max-w-4xl desktop:max-w-7xl` + 포트폴리오 그리드 반응형
- v0.9.3: SiteConfigPanel 색상 테마 `grid-cols-2 tablet:grid-cols-3`
- v0.9.4: 4개 모달 여백/너비 반응형 (TiptapImageUpload, EditorStatePreservation, StatePreviewModal, SkillEditorModal)
- v0.9.5: AgentTokensPanel `min-w-0`, CategorySelect `w-full`, LoginForm glow 크기, ResumePanel 프로필 사진 크기

## v0.8.17 (2026-03-27)

### Feat: 편집 상태 새로고침 영속화 + LaTeX 에디터 기능 (v0.8.17)

- `src/components/admin/AdminDashboard.tsx`: URL hash 확장 — `#posts/edit/{slug}`, `#posts/new` 형식으로 편집 상태 영속화. `parseHash` 함수 추가. `editPath` state + `handleEditPathChange` 콜백을 PostsPanel/PortfolioPanel에 전달. 탭 전환 시 editPath 초기화.
- `src/components/admin/panels/PostsPanel.tsx`: `editPath`/`onEditPathChange` props 추가. `openEdit`/`openNew`/`handleBack`/`handleDelete`에서 hash 동기화. 데이터 로드 완료 후 `editPath`에서 편집 상태 자동 복원 (1회).
- `src/components/admin/panels/PortfolioPanel.tsx`: PostsPanel과 동일한 hash 영속화 적용.
- `src/extensions/LatexNode.tsx`: 신규 Tiptap Node extension. KaTeX 기반 에디터 내 LaTeX 프리뷰 렌더링. `::latex{src="..."}` directive serialize/parse. `latexDirectiveToHtml` 전처리 함수.
- `src/components/admin/RichMarkdownEditor.tsx`: `LatexNode` extension 등록. `latexDirectiveToHtml` 전처리 체인 추가 (initialContent + exitSourceMode).
- `src/components/admin/EditorToolbar.tsx`: `LatexInput` 서브 컴포넌트 추가 — textarea 입력 + 실시간 KaTeX 프리뷰 + Ctrl+Enter 삽입. Media ToolbarGroup에 배치.

## v0.8.16 (2026-03-27)

### Fix: Source 모드 textarea 스크롤 리셋 + 모드 전환 시 스크롤 위치 보존 (v0.8.16)

- `src/components/admin/RichMarkdownEditor.tsx`:
    - **Source 모드 타이핑 시 스크롤 리셋 수정**: 인라인 `ref` 콜백이 매 렌더마다 재호출되어 `height = "auto"`로 textarea를 일시적으로 축소, 부모 스크롤 컨테이너의 스크롤 위치가 리셋되던 버그 수정. `useCallback`으로 ref 콜백 안정화하여 mount 시 1회만 실행. `onChange` 핸들러에서 auto-resize 전후로 스크롤 위치 저장/복원 로직 추가.
    - **Source ↔ WYSIWYG 모드 전환 시 스크롤 비율 보존**: `scrollAreaRef`로 스크롤 컨테이너 참조. `enterSourceMode`/`exitSourceMode`에서 전환 전 스크롤 비율(`scrollTop / (scrollHeight - clientHeight)`) 저장. 전환 후 `useEffect` + double `requestAnimationFrame`으로 비율 기반 스크롤 위치 복원. fullscreen(`overflow-y-auto`)과 일반 모드(`document.scrollingElement`) 모두 지원.

## v0.8.15 (2026-03-27)

### Fix: Source → WYSIWYG 전환 시 flushSync 에러 해결 (v0.8.15)

- `src/components/admin/RichMarkdownEditor.tsx`: `EditorContent`를 조건부 mount/unmount에서 항상 mount + CSS `hidden` 토글로 변경. source 모드 전환 시 `ReactNodeViewRenderer`가 `flushSync`를 React 렌더 중 호출하던 근본 원인 해결. `exitSourceMode`에서 `queueMicrotask` 제거, `pendingContent` ref + `useEffect`로 `setContent` defer. inline/fullscreen 모드 모두 적용.

## v0.8.14 (2026-03-27)

### Feat: EditorStatePreservation Auto/Manual 섹션 모두 삭제 버튼 추가 (v0.8.14)

- `src/components/admin/EditorStatePreservation.tsx`: Auto 섹션과 Manual 섹션 하단에 "모두 삭제" 버튼 추가. 클릭 시 인라인 확인 UI 표시 (2-click 확인). `handleDeleteAll` 콜백 추가 (`Auto-save` | `Bookmark` label 일괄 삭제). Initial 스냅샷은 대상 외.

## v0.8.13 (2026-03-26)

### Fix+Feat: Source 모드 ColoredTable paste 수정 + Code 탭 추가 (v0.8.13)

- `src/extensions/ColoredTableNode.tsx`: `extractAttr` 함수가 홑따옴표(`'`)와 쌍따옴표(`"`) 모두 매칭하도록 수정. `jsxToDirective`가 쌍따옴표로 출력하는 directive를 `coloredTableDirectiveToHtml`이 파싱 실패하던 버그 해결. Source 모드에서 `<ColoredTable ... />` 붙여넣기 후 Markdown 뷰 전환 시 정상 렌더링.
- `src/components/admin/EditorToolbar.tsx`: `ColoredTableInsert` 모달에 Classic/Code 탭 추가. Code 탭에서 `<ColoredTable ... />` JSX를 붙여넣으면 자동 파싱 → 삽입 가능. `parseColoredTableJsx` 함수 추가 (3가지 attribute 형식 지원).

## v0.8.12 (2026-03-26)

### Feat: YouTube/ColoredTable WYSIWYG 프리뷰 + YouTube extension 교체 (v0.8.12)

- `src/extensions/YoutubeEmbed.tsx`: 커스텀 Tiptap Node extension. `@tiptap/extension-youtube` 대체. 에디터에서 16:9 iframe 프리뷰 렌더링. `::youtube[]{id="..."}` directive serialize/parse.
- `src/extensions/ColoredTableNode.tsx`: ColoredTable 프리뷰 Node extension. 에디터에서 헤더 색상 포함 읽기 전용 테이블 렌더링. `::colored-table[]{...}` directive serialize/parse.
- `src/components/admin/RichMarkdownEditor.tsx`: `YoutubeEmbed` + `ColoredTableNode` extension 등록. 로드 시 directive → HTML 전처리 (`youtubeDirectiveToHtml`, `coloredTableDirectiveToHtml`).
- `src/components/admin/EditorToolbar.tsx`: `YoutubeInput`/`ColoredTableInsert`가 커스텀 노드 삽입으로 변경 (텍스트 → 노드).
- `@tiptap/extension-youtube` 패키지 제거. React DOM 경고 해소.

## v0.8.11 (2026-03-26)

### Feat: Tiptap 테이블 개선 + ColoredTable 모달 재구현 + YouTube directive 전환 (v0.8.11)

- `src/components/admin/RichMarkdownEditor.tsx`: `ColoredTableExtension.configure({ resizable: true })` 변경. 컬럼 리사이즈 핸들 활성화. `@tiptap/extension-youtube` 제거, directive 방식으로 전환.
- `src/components/admin/EditorToolbar.tsx`:
    - 셀 병합/분할 (`mergeOrSplit`) 버튼 추가.
    - 헤더 행 토글 (`toggleHeaderRow`) 버튼 추가.
    - `ColoredTableInsert` 모달 재구현: 동적 컬럼/행 추가/삭제, 각 셀별 입력 박스 그리드, 컬럼 헤더 색상 picker (`MiniColorPicker`), `columnHeadColors` 속성 directive 생성.
    - `YoutubeInput`: `setYoutubeVideo` → `::youtube[]{id="..."}` directive 텍스트 삽입으로 변경. URL/ID 자동 파싱.
- `src/styles/global.css`: ProseMirror 에디터 내 테이블 CSS 추가 — `.tableWrapper`, 셀 border/padding, `.selectedCell` 하이라이트, `.column-resize-handle` 시각화, `.resize-cursor`.
- `@tiptap/extension-youtube` 패키지 제거. React DOM 경고(`allowfullscreen`, `autoplay`, `loop`) 해소.

## v0.8.10 (2026-03-26)

### Fix: tiptap-markdown 이스케이프된 directive 렌더링 실패 (v0.8.10)

- `src/lib/mdx-directive-converter.ts`: `stripDirectiveEscapes` regex 수정.
    - `\\::` → `\\?::`: `\::` 없이 `::` 로 시작하는 directive 라인도 처리.
    - 이스케이프 대상에 `~` 추가: `\~` → `~` 변환.
    - 원인: tiptap-markdown이 WYSIWYG 에디터에서 `::colored-table\[\]{...}` 형태로 serialize할 때 `::` 앞에 백슬래시가 없지만 `[`, `]`, `"`, `~`는 이스케이프함. 기존 regex가 `\::` 있는 줄만 처리해 이스케이프 제거가 스킵되고 directive regex 매칭 실패 → 프론트엔드 렌더링 불가.

## v0.8.9 (2026-03-26)

### Fix: Source 모드 auto-save directive 변환 누락 (v0.8.9)

- `src/components/admin/RichMarkdownEditor.tsx`: `handleSourceChange`에서 `onChange(val)` → `onChange(directiveToJsx(val))` 변경. Source 모드에서 `::colored-table[]{...}` 등 directive 문법으로 입력 시 auto-save가 JSX 변환 없이 DB에 저장되던 버그 수정. `exitSourceMode`에는 변환이 있었지만 keystroke마다 호출되는 auto-save 경로에는 없었음.

## v0.8.8 (2026-03-26)

### Feat: ColoredTable 삽입 버튼 + 셀 배경색 버그 수정 (v0.8.8)

- `src/components/admin/EditorToolbar.tsx`:
    - `ColoredTableInsert` 서브 컴포넌트 추가: 컬럼명(쉼표 구분) + 행 수 입력 후 `::colored-table[]{...}` directive를 에디터에 삽입. Media ToolbarGroup에 배치. 저장 시 자동으로 JSX 변환됨.
    - `CellColorPicker` 버그 수정: `updateAttributes("tableCell", {...})` → `setCellAttribute("tailwindColor", c.name)` 변경. Tiptap Table extension 전용 명령어로 셀 배경색이 실제 적용됨.
- `src/lib/mdx-directive-converter.ts`:
    - `jsxToDirective` 어트리뷰트 파싱 regex 확장: `key={'value'}` 형식 외 `key='value'`, `key="value"` 형식도 지원. 사용자가 직접 타이핑한 JSX도 올바르게 directive로 변환됨.

## v0.8.7 (2026-03-26)

### Fix: 마크다운 테이블 + ColoredTable 렌더링 버그 (v0.8.7)

- `remark-gfm` 패키지 추가: `src/lib/markdown.tsx`의 `evaluate` remarkPlugins에 `remarkGfm` 추가 → 프론트엔드에서 GFM 파이프 테이블(`| col |`) 정상 렌더링.
- `src/components/admin/RichMarkdownEditor.tsx`:
    - `initialContent` — `jsxToDirective(value)` 적용: JSX로 저장된 `<ColoredTable>`/`<FoliumTable>`을 Tiptap에 로드 전 directive 형식(`::colored-table{...}`)으로 변환. 미적용 시 Tiptap이 JSX를 소실시키고 auto-save가 빈 내용을 DB에 덮어씀.
    - `onUpdate` — `directiveToJsx(md)` 적용 후 `onChange`: WYSIWYG 수정 시 directive → JSX 변환 후 저장 (DB는 항상 JSX 형식 유지).
    - `enterSourceMode` — `directiveToJsx(md)` 적용: source textarea에 JSX 형식 표시.
    - `exitSourceMode` — `jsxToDirective(jsxContent)`로 Tiptap 로드, `directiveToJsx(sourceText)`로 DB 저장.

## v0.8.6 (2026-03-26)

### Fix: EditorToolbar 버튼 overflow + 셀 배경색 팝업 클리핑 (v0.8.6)

- `src/components/tiptap-ui-primitive/toolbar/toolbar.scss`: `[data-variant="fixed"]`에 `flex-wrap: wrap` 추가, `overflow-x: auto` → `overflow: visible` 변경. 테이블 편집 시 버튼이 잘리지 않고 다음 줄로 wrap됨. `overflow: auto` 계산으로 인한 `CellColorPicker` 팝업 클리핑도 함께 해결. 모바일 breakpoint로 스크롤 관련 CSS 이동.

## v0.8.5 (2026-03-26)

### Feat: FoliumTable → ColoredTable 전면 리네이밍 (v0.8.5)

- `src/components/FoliumTable.tsx` → `ColoredTable.tsx`, `FoliumTableColorSync.tsx` → `ColoredTableColorSync.tsx`, `src/extensions/FoliumTableExtension.ts` → `ColoredTableExtension.ts`: 파일명 + export명 변경.
- `src/lib/markdown.tsx`, `mdx-directive-converter.ts`: 기존 `<FoliumTable>` 역호환 alias 유지.
- `src/styles/global.css`: `.folium-table` → `.colored-table` CSS 셀렉터 변경.

### Feat: YouTube 풀 플레이어 + 이미지 자연 크기 (v0.8.5)

- `RichMarkdownEditor.tsx`: `Youtube.configure({ controls: true })` — 에디터 내 YouTube controls 활성화.
- `MarkdownImage.tsx`: `aspectRatio: "16/9"` 제거 → `h-auto max-w-full` 자연 크기 렌더링.

### Feat: Source 편집 모드 + 통합 toolbar (v0.8.5)

- `RichMarkdownEditor.tsx`: Source ↔ Markdown 뷰 토글 추가. Source textarea 자동 높이 확장 (이중 스크롤바 제거).
- `EditorToolbar.tsx`: Image/Source/Fullscreen 버튼을 toolbar 우측 ToolbarGroup으로 통합. 별도 버튼 바 제거. `onImageUpload`, `sourceMode`, `onSourceToggle` props 추가.

## v0.8.0 ~ v0.8.4 (2026-03-26)

### Fix: 목록 상태 새로고침 + `버전 업데이트 (v0.8.4)

- `PostsPanel.tsx`, `PortfolioPanel.tsx`, `BooksSubPanel.tsx`: `handleBack()`에 `loadStateCounts()` 추가 — "목록" 버튼 클릭 시 상태 count 즉시 반영.
- `package.json`: v0.8.4. `AGENTS.md`: Editor 설명 MDX → Tiptap 변경.

### Feat: Supabase `editor_states` 테이블 + 세션 만료 (v0.8.3)

- `src/lib/migrations.ts`: migration 0.8.3 — `editor_states` 테이블 생성 (RLS + index). `entity_type`, `entity_slug`, `label`, `content`, `created_at` 컬럼.
- `EditorStatePreservation.tsx`: localStorage → Supabase 전환. Initial 매 세션 갱신 (Option A). 24시간 미활동 시 Initial/Auto 만료 삭제 (Manual 보존).
- 3개 Panel: `entityType`/`entitySlug` prop 변경. 목록에서 Non-Initial state > 0 항목 노란 배경 + "상태: N" badge.

### Feat: 상태 보존 3섹션 분리 + 한국어 badge (v0.8.3)

- `EditorStatePreservation.tsx`: Initial(1개 고정)/Auto-save(max 5 FIFO)/Bookmark(무제한) 3계층 저장 모델. 모달 본문 초기(Initial)/자동(Auto)/수동(Manual) 3섹션 구분선 분리. Badge 한영 병기.
- 3개 Panel: "상태 기록: X/6" 노란 버튼 + `onSnapshotCountChange` 연결.

### Feat: 상태 보존 Footer 이동 + 모달 리팩토링 (v0.8.2)

- `EditorStatePreservation.tsx`: 모달 기반 리팩토링 — `isOpen`/`onClose` prop. 삭제 확인 dialog 추가.
- `RichMarkdownEditor.tsx`: `onEditorReady` callback prop 추가. EditorStatePreservation JSX 제거. Draft 배너 (노란 "Unsaved draft") 제거 (5초 autosave는 유지).
- `PostsPanel.tsx`, `PortfolioPanel.tsx`, `BooksSubPanel.tsx`: Footer에 노란 "상태 기록: X/6" 버튼 추가.

### Feat: Prose accent color + YouTube 빨간 아이콘 (v0.8.2)

- `src/styles/global.css`: `--color-prose-heading`, `--color-prose-link`, `--color-prose-blockquote-border`를 `--color-folium-primary` (고정)에서 `--color-accent` (테마별 가변)로 변경.
- `src/components/admin/EditorToolbar.tsx`: YouTube 버튼 `▶` → 빨간 YouTube SVG (`#FF0000` 고정).

### Feat: Tiptap 이미지 업로드 + 에디터 상태 보존 (v0.8.1)

- `src/components/admin/TiptapImageUpload.tsx`: 신규 — Tiptap 전용 이미지 업로드 모달. 파일 업로드 (drag & drop) + URL 입력. WebP 변환 + Supabase Storage 업로드. `editor.setImage()` 직접 삽입.
- `src/components/admin/EditorStatePreservation.tsx`: 신규 — 에디터 상태 보존 모달. Initial/Auto-save/Bookmark 3단계 스냅샷. Preview/Revert/Delete.
- `src/components/admin/StatePreviewModal.tsx`: 신규 — 스냅샷 미리보기 모달. 렌더링(Render)/소스(Source) 토글.

### Feat: 기존 이미지/YouTube 호환 + Image extension (v0.8.1)

- `RichMarkdownEditor.tsx`: `Markdown.configure({ html: true })` 설정 — 기존 `<img>` HTML 태그 보존. `@tiptap/extension-image` 추가.
- `src/styles/global.css`: `div[data-youtube-video]` 16:9 CSS + 기존 iframe 기반 YouTube 호환 CSS 추가.

### Major: MDXEditor → Tiptap 에디터 전환 (v0.8.0)

- `src/components/admin/RichMarkdownEditor.tsx`: MDXEditor 기반에서 Tiptap 기반으로 전면 재작성. `@tiptap/react`, `@tiptap/starter-kit`, `tiptap-markdown` 등 12+ 패키지 도입. Markdown I/O 보존 (기존 Supabase 파이프라인 유지). SSR 안전 (`immediatelyRender: false`).
- `src/components/admin/EditorToolbar.tsx`: 신규 — Tiptap 공식 UI 컴포넌트 기반 toolbar. `Toolbar`/`ToolbarGroup`/`ToolbarSeparator`/`Spacer` + `MarkButton`, `HeadingDropdownMenu`, `ListDropdownMenu`, `BlockquoteButton`, `CodeBlockButton`, `ColorHighlightPopover`, `LinkPopover`, `TextAlignButton`, `UndoRedoButton`.
- `src/components/admin/EditorFullscreenModal.tsx`: 신규 — `createPortal` 기반 전체화면 모달. Glassmorphism toolbar, Paper canvas 레이아웃.
- `src/extensions/FoliumTableExtension.ts`: 신규 — Tiptap table extension. `tailwindColor` attribute → `tailwindToHex()` → inline hex style.
- `src/components/FoliumTable.tsx`: 최소 legacy adapter로 재작성.
- `src/components/tiptap-ui/`, `tiptap-ui-primitive/`, `tiptap-icons/`, `tiptap-node/`, `tiptap-extension/`: Tiptap CLI로 설치된 UI 컴포넌트 (20+ 컴포넌트).
- `src/hooks/use-tiptap-editor.ts`, `use-composed-ref.ts`, `use-is-breakpoint.ts`, `use-menu-navigation.ts`: Tiptap UI 컴포넌트 의존 hook.
- `src/lib/tiptap-utils.ts`, `src/scss.d.ts`, `src/styles/_variables.scss`, `src/styles/_keyframe-animations.scss`: Tiptap 유틸 및 SCSS 지원.
- `@mdxeditor/editor` 패키지 제거. MDXEditor CSS 블록 삭제.

## 2026-03-25

### Design: 포트폴리오 및 이력서 내 GitHub 링크를 솔리드 버튼으로 변경 (v0.7.58)

- `src/components/resume/ProjectsSection.tsx`, `src/components/PortfolioView.tsx`: 기존의 테두리만 있는 외부 링크 스타일의 GitHub 버튼을 `bg-[#24292e] text-white` 기반의 솔리드 버튼 디자인으로 교체.
- 내부에 텍스트 우측에 있던 화살표 아이콘 대신 텍스트 좌측에 GitHub 브랜드 로고 SVG 배치.
- 줄바꿈 방지(`whitespace-nowrap`) 특성에 맞추어 버튼 내 텍스트 줄바꿈 방지, 호버 시 투명도 조절(`hover:opacity-80`) 적용.

### Feat: ProjectsSection 컴포넌트 추출 및 전 이력서 테마 적용 (v0.7.57)

- `src/components/resume/ProjectsSection.tsx` 신규 생성: 이력서 프로젝트 카드 그리드를 독립 async Server Component로 추출. markdown 렌더링·portfolio fetch 자체 처리. `label`, `badge` props 지원.
- `ResumeModern.tsx`, `ResumeClassic.tsx`, `ResumeMinimal.tsx`: 인라인 projects 섹션 제거 → `<ProjectsSection>` 사용. `projectsMarkdown`, `portfolioItemMap` 관련 코드 정리.
- `ResumePhases.tsx`: 인라인 게임 프로젝트 섹션 제거 → `<ProjectsSection badge="게임 개발 전환">` 사용. `projectSectionsMarkdown`, `portfolioItemMap` 관련 코드 정리.

### Feat: CareerPhasesSection 컴포넌트 추출 및 전 이력서 테마 적용 (v0.7.56)

- `src/components/resume/CareerPhasesSection.tsx` 신규 생성: `ResumePhases`의 커리어 타임라인 인라인 JSX를 독립 컴포넌트로 추출. `ResumeCareerPhase[]` props 수신, 내부에서 phase 번호 정렬 처리.
- `ResumePhases.tsx`: 인라인 커리어 타임라인 섹션 제거 → `<CareerPhasesSection>` 컴포넌트 사용으로 교체.
- `ResumeModern.tsx`, `ResumeMinimal.tsx`, `ResumeClassic.tsx`: `CareerPhasesSection` import 추가 및 sections 루프 이전에 렌더링 삽입 (기존에 careerPhases 필터 아웃으로 미표시되던 문제 해소).

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

- `src/components/resume/ResumePhases.tsx`: `경력`·`프로젝트` 2컬럼 그리드를 `md` 미만에서 단일 컬럼 수직 스택으로 전환. `divide-x` → `md:divide-x` + `divide-y md:divide-y-0` 구분선 처리. 컬럼 패딩 `pr-8`/`pl-8` → `pb-8 md:pb-0 md:pr-8` / `pt-8 md:pt-0 md:pl-8` 조정. 커리어 타임라인 레이아웃은 변경 없음.

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

### Feat: Phases 이력서 커리어 타임라인 섹션 추가 (v0.7.22)

- `src/types/resume.ts`: `ResumeCareerPhase` 인터페이스 추가. `Resume`에 `careerPhases` 필드 추가
- `src/components/resume/ResumePhases.tsx`: 커리어 타임라인 섹션 추가 (흰 배경 카드, Phase 컬럼 타임라인, phase 번호 내림차순 정렬)

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
