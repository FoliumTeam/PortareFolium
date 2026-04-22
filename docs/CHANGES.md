# CHANGES

## v0.12.64 (2026-04-22)

### feat: bootstrap read server화와 auth E2E 경로 정리

- `src/app/admin/actions/public-data.ts`: 공개 태그, 공개 검색, 관리자 프로필 이미지, db_schema_version 조회를 server action으로 추가
- `src/app/admin/actions/about.ts`, `src/app/admin/actions/resume.ts`, `src/app/admin/actions/site-config.ts`: About/Resume/SiteConfig bootstrap read helper 추가
- `src/components/admin/panels/AboutPanel.tsx`, `src/components/admin/panels/ResumePanel.tsx`, `src/components/admin/panels/SiteConfigPanel.tsx`, `src/components/admin/panels/MigrationsPanel.tsx`: browserClient 기반 초기 로드를 server action 호출로 전환
- `src/components/GlobalSearch.tsx`, `src/components/UserMenu.tsx`, `src/components/admin/TagSelector.tsx`: browserClient read 제거, public-data server action 기반으로 전환
- `src/auth.ts`, `src/components/admin/LoginForm.tsx`, `src/app/admin/login/page.tsx`, `.env.example`: E2E용 Credentials provider와 테스트 로그인 폼 추가
- `src/components/PdfExportButton.tsx`, `src/app/(frontend)/resume/page.tsx`, `src/app/(frontend)/portfolio/page.tsx`: server-side `auth()` 기반 `initialAuthed` 전달로 authenticated PDF export 버튼 표시 보강
- `e2e/auth.setup.ts`, `e2e/admin-auth-migration.spec.ts`, `e2e/authenticated/*.spec.ts`, `e2e/navigation.spec.ts`, `e2e/responsive.spec.ts`, `e2e/content-rendering.spec.ts`, `e2e/seo.spec.ts`: auth migration / credentials / timeout 안정화에 맞춰 갱신
- `package.json`: patch version `0.12.64`로 증가

## v0.12.63 (2026-04-22)

### fix: snapshot slug rewrite를 server action 경계로 이동

- `src/app/admin/actions/editor-states.ts`: slug rename 시 `editor_states.content` folder prefix 치환 action 추가
- `src/components/admin/panels/PostsPanel.tsx`, `src/components/admin/panels/PortfolioPanel.tsx`: browser-side `rewriteSnapshotUrls()` 대신 server action 호출로 변경
- `package.json`: patch version `0.12.63`로 증가

## v0.12.62 (2026-04-22)

### refactor: TagsPanel write 경계를 server action으로 이동

- `src/app/admin/actions/tags.ts` 신규: tags 목록/카테고리 목록 조회, 태그 저장/삭제, 카테고리 rename/delete를 관리자 server action으로 이동
- `src/components/admin/panels/TagsPanel.tsx`: browserClient 직접 write 제거, TagsPanel read/write를 server action 호출 기반으로 전환
- `package.json`: patch version `0.12.62`로 증가

## v0.12.61 (2026-04-22)

### refactor: SiteConfigPanel write 경계를 server action으로 이동

- `src/app/admin/actions/site-config.ts` 신규: `site_config` 저장, 활성 직무 분야 변경, 직무 분야 추가/삭제와 posts·portfolio_items·resume_data cascade를 관리자 server action으로 이동
- `src/components/admin/panels/SiteConfigPanel.tsx`: browserClient 직접 write 제거, SiteConfigPanel read는 유지하면서 저장/직무 분야 변경을 server action 호출 기반으로 전환
- `package.json`: patch version `0.12.61`로 증가

## v0.12.60 (2026-04-22)

### refactor: Gantt Chart admin archive CRUD를 server action 경계로 이동

- `src/app/admin/actions/gantt-chart.ts` 신규: `gantt_chart_archives` 목록 조회, 생성, 편집, 설정 저장, category color 저장, 삭제를 관리자 server action으로 통합
- `src/components/admin/panels/GanttChartPanel.tsx`: browserClient 기반 archive 로드/설정 저장/삭제 제거, server action 호출 기반으로 전환
- `src/components/admin/panels/GanttChartCreateModal.tsx`: create/edit 저장을 server action 호출 기반으로 전환
- `src/components/admin/panels/GanttChartCategoryColorModal.tsx`: category color 저장을 server action 호출 기반으로 전환
- `package.json`: patch version `0.12.60`로 증가

## v0.12.59 (2026-04-22)

### refactor: editor_states / BooksSubPanel 경계 이관과 revalidate 보강

- `src/app/admin/actions/editor-states.ts` 신규: `editor_states` 초기화, 저장, 삭제, bulk delete를 server action으로 이동
- `src/components/admin/EditorStatePreservation.tsx`: browserClient 직접 CRUD 제거, server action 호출 기반으로 전환
- `src/app/admin/actions/books.ts` 신규: BooksSubPanel bootstrap, 저장, 삭제, publish/featured 토글을 server action으로 이동
- `src/components/admin/panels/BooksSubPanel.tsx`: browserClient 기반 `books` CRUD 제거, server action 호출 기반으로 전환
- `src/app/admin/actions/posts.ts`, `src/app/admin/actions/portfolio.ts`: delete/batch/featured/reorder 이후 대상 route revalidate 보강
- `src/components/admin/panels/PortfolioPanel.tsx`: featured 토글 호출 시 slug 전달로 revalidate 연계
- `package.json`: patch version `0.12.59`로 증가

## v0.12.58 (2026-04-22)

### fix: /api/run-migrations를 관리자 세션으로 보호

- `src/app/api/run-migrations/route.ts`: service-role 기반 마이그레이션 실행 전에 NextAuth 관리자 세션을 검증하도록 변경
- `package.json`: patch version `0.12.58`로 증가

## v0.12.57 (2026-04-22)

### refactor: PortfolioPanel data plane을 server action 경계로 이동

- `src/app/admin/actions/portfolio.ts` 신규: PortfolioPanel bootstrap 조회, 저장, 삭제, publish/featured 토글, featured reorder, batch publish/jobField 변경을 server action으로 통합
- `src/components/admin/panels/PortfolioPanel.tsx`: browserClient 기반 `portfolio_items` / `editor_states` / `site_config` 직접 CRUD 제거, server action 호출 기반으로 전환
- `package.json`: patch version `0.12.57`로 증가

## v0.12.56 (2026-04-22)

### fix: 공개 로그인 버튼 제거 후 /admin/login 수동 진입만 허용

- `src/components/UserMenu.tsx`: 미인증 상태에서 공개 로그인 버튼을 render하지 않도록 변경
- `AGENTS.md`: `PLAN_*.md`, `PR_*.md`는 기본적으로 commit 대상에서 제외하는 지침 추가
- planning markdown: git 추적 대상에서 제거
- `package.json`: patch version `0.12.56`로 증가

## v0.12.55 (2026-04-22)

### refactor: PostsPanel data plane을 server action 경계로 이동

- `src/app/admin/actions/posts.ts` 신규: PostsPanel bootstrap 조회, 저장, 삭제, publish 토글, batch publish/job_field 변경, TOC style 저장을 server action으로 통합
- `src/components/admin/panels/PostsPanel.tsx`: browserClient 기반 posts/site_config/editor_states 직접 CRUD 제거, server action 호출 기반으로 전환
- `package.json`: patch version `0.12.55`로 증가

## v0.12.54 (2026-04-22)

### refactor: About/Resume 저장 경계를 NextAuth server action으로 이동

- `src/app/admin/actions/about.ts` 신규: About 저장을 server action 경계로 이동. `about_data`, `resume_data.basics.image`, `site_config.github_url` 저장을 관리자 세션으로 보호
- `src/app/admin/actions/resume.ts` 신규: Resume 저장과 `resume_layout`, `resume_section_layout` 저장을 server action 경계로 이동
- `src/components/admin/panels/AboutPanel.tsx`: browserClient 직접 write 제거, `saveAboutPanel()` 사용으로 전환
- `src/components/admin/panels/ResumePanel.tsx`: 수동 저장, auto-save, layout 저장을 `saveResumePanel()` / `saveResumeTheme()` 호출로 전환
- `package.json`: patch version `0.12.54`로 증가

## v0.12.53 (2026-04-21)

### feat: Supabase Auth 제거용 NextAuth Google OAuth 기반 1차 전환

- `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/types/next-auth.d.ts`: NextAuth v5 Google OAuth + JWT session 기반 auth 골격 추가. `AUTH_ADMIN_EMAILS` allowlist로 관리자 로그인 제한
- `src/components/AuthSessionProvider.tsx`, `src/app/layout.tsx`: 전역 `SessionProvider` 추가
- `src/app/admin/page.tsx`, `src/components/admin/AdminAccessGate.tsx`, `src/app/admin/migrate/page.tsx`, `src/components/admin/MigrationGuide.tsx`: NextAuth admin session 우선, legacy Supabase 로그인은 `/admin/migrate`로만 보내는 1회 migration bridge 추가
- `src/app/admin/login/page.tsx`, `src/components/admin/LoginForm.tsx`: Google OAuth 기본 로그인 추가. bridge 기간 동안만 legacy Supabase 이메일/패스워드 로그인 1회 허용
- `src/components/admin/AdminDashboard.tsx`, `src/components/UserMenu.tsx`, `src/components/PdfExportButton.tsx`, `src/components/BlogPage.tsx`: Supabase Auth 의존 제거, NextAuth session/signOut 기반 affordance로 교체
- `src/app/api/upload-image/route.ts`, `src/app/api/storage-ops/route.ts`, `src/lib/image-upload.ts`: Supabase bearer token 검증 제거, NextAuth cookie session 기반 admin 인증으로 변경
- `src/__tests__/admin-auth.test.ts` 신규: 관리자 allowlist / session helper 검증 추가
- `src/__tests__/image-upload.test.ts`: bearer header 제거에 맞춰 테스트 갱신
- `src/lib/server-admin.ts`, `src/app/admin/actions/revalidate.ts`, `src/app/admin/actions/agent-tokens.ts`, `src/app/admin/actions/snapshots.ts`, `src/app/admin/actions/lightbox-sidecars.ts`: 민감 server action에 관리자 세션 가드 추가
- `.env.example`: `NEXTAUTH_SECRET`, `GOOGLE_ID`, `GOOGLE_SECRET`, `AUTH_ADMIN_EMAILS`, `SUPABASE_LEGACY_LOGIN_ENABLED` 예시 추가
- `package.json`: `next-auth@5.0.0-beta.31` 추가, patch version `0.12.53`로 증가

## v0.12.52 (2026-04-21)

### perf: R2 image upload immutable cache header + robots aggressive bot 차단

- `src/app/api/upload-image/route.ts`: R2 `PutObjectCommand`에 `CacheControl: "public, max-age=31536000, immutable"` 추가. UUID 기반 파일명은 재업로드되지 않는 immutable asset이므로 1년 edge cache + immutable directive로 안전. Cloudflare edge cache hit ratio 최상향 → R2 Class B op (GET/HEAD) 호출 회수 최소화 → `.r2.dev` 환경에서 abuse bombardment cost 감소
- `src/app/robots.ts`: SEO 비공헌 + R2 op 소모 위험 있는 aggressive crawler 13종(`SemrushBot`, `AhrefsBot`, `DotBot`, `MJ12bot`, `PetalBot`, `DataForSeoBot`, `Bytespider`, `GPTBot`, `ClaudeBot`, `anthropic-ai`, `CCBot`, `Amazonbot`, `meta-externalagent`) disallow rule 추가. Google/NAVER 등 정상 crawler는 영향 없음
- `package.json`: patch version `0.12.52`로 증가

## v0.12.51 (2026-04-21)

### chore: GitHub Actions E2E workflow 제거 + local pre-push gate 전환

- Root cause: Cloudflare R2 `pub-*.r2.dev` public URL이 GitHub Actions runner IP range를 abuse filter로 차단. Next.js `/_next/image` optimization이 R2 upstream fetch 실패 (ECONNRESET) → 400 반환 → CI E2E strict assertion 매번 fail. `R2_PUBLIC_URL` secret 주입 + `remotePatterns` 조정으로는 network-level 차단 해결 불가
- 결정: 개인 portfolio 규모에서 R2 custom domain 도입 비용 대비 이득 낮음. CI E2E 포기, 로컬 Husky pre-push hook으로 strict gate 대체
- `.github/workflows/e2e.yml` 제거
- `.husky/pre-push` 신규 — `pnpm exec playwright test --project=chromium --project=authenticated-chromium` 자동 실행. E2E 실패 시 push 차단
- `AGENTS.md`, `.claude/commands/ship.md`, `docs/TEST.md`, `README.md`: Testing Gate / Push gate 섹션을 CI-driven에서 로컬 strict로 재작성. `R2_PUBLIC_URL` 을 필수 `.env.local` 항목에 추가
- `package.json`: patch version `0.12.51`로 증가

## v0.12.50 (2026-04-21)

### docs: SQLite refuge 계획에 local server boundary 설명 추가

- `PLAN_SQLITE_REFUGE.md`: "server 경유"가 Supabase가 아니라 Next.js local server runtime 경유임을 명시
- `PLAN_SQLITE_REFUGE.md`: refuge mode write flow를 브라우저 → Route Handler / Server Action → local SQLite 구조로 문서화
- `package.json`: patch version `0.12.50`로 증가

## v0.12.49 (2026-04-21)

### fix: CI E2E에서 R2 pub URL 400을 env-driven으로 허용

- Root cause: Cloudflare R2 `pub-*.r2.dev` public URL이 GitHub Actions runner IP range를 abuse filter로 차단. Next.js `/_next/image` optimization이 R2 upstream fetch 실패 (ECONNRESET) → browser 400 반환 → E2E strict console-error assertion fail. Local / Vercel prod는 영향 없음 (origin IP abuse filter 비해당)
- `e2e/content-rendering.spec.ts`: `getR2ImageAllowPattern()` helper 추가. `process.env.R2_PUBLIC_URL` 에서 hostname 추출 → `/_next/image?url=https%3A%2F%2F<encoded-host>` pattern을 `ALLOWED_4XX_PATTERNS`로 생성. CI secret / local `.env.local` 동일 env 활용. env 미주입 시 strict 유지
- `e2e/content-rendering.spec.ts`: `trackRuntimeErrors`에 `page.on("response")` hook 재도입해 4xx URL을 ALLOWED pattern 기준으로 필터. Chromium generic "Failed to load resource" console error는 URL 미포함이므로 중복 제거
- 장기 계획: R2 custom domain 전환 시 abuse filter 우회되므로 이 ALLOWED entry 삭제 예정. 개인 portfolio 규모에선 `.r2.dev` 유지로 충분
- `package.json`: patch version `0.12.49`로 증가

## v0.12.48 (2026-04-21)

### docs: SQLite refuge 계획에 editor_states / gantt_chart_archives 포함

- `PLAN_SQLITE_REFUGE.md`: `editor_states`, `gantt_chart_archives`를 Release 1 SQLite refuge 대상 테이블로 승격
- `PLAN_SQLITE_REFUGE.md`: `EditorStatePreservation`, `GanttChartPanel` 관련 지원 write scope, journal identity key, conflict baseline, replay policy, 테스트 계획, acceptance criteria 반영
- `package.json`: patch version `0.12.48`로 증가

## v0.12.47 (2026-04-20)

### docs: SQLite refuge 구현 계획 문서 추가

- `PLAN_SQLITE_REFUGE.md`: local SQLite refuge mode의 release 1 계획 추가. supported surface, degraded surface, activation contract, guarded push-back, expanded test plan, acceptance criteria를 문서화
- `package.json`: patch version `0.12.47`로 증가

## v0.12.46 (2026-04-20)

### fix: Vercel Analytics / SpeedInsights를 Vercel env에서만 render

- Root cause: `src/app/layout.tsx`의 `<Analytics />` + `<SpeedInsights />`가 모든 환경에서 `<script src="/_vercel/insights/script.js">` + `/_vercel/speed-insights/script.js`를 inject. 해당 path는 Vercel production runtime에서만 serve됨. Vercel 외 환경 (local `pnpm start`, GitHub Actions CI runner) 에서 404 발생. 이 404는 v0.7.18부터 상시 발생했으나 v0.12.28에서 E2E `trackRuntimeErrors` + `expect(runtimeErrors).toEqual([])` strict assertion을 도입하면서 처음으로 test fail로 가시화됨
- `src/app/layout.tsx`: `<SpeedInsights />` + `<Analytics />`를 `{process.env.VERCEL && (...)}`로 감싸 Vercel build에서만 render. 외부 환경에서는 script inject 자체가 발생 안 함 → 404 원천 제거
- `package.json`: patch version `0.12.46`로 증가

## v0.12.45 (2026-04-20)

### revert: v0.12.43~44 E2E debugging 제거 (CI R2 secret 주입으로 불필요)

- Root cause 재확인: CI E2E에서 `/_next/image?url=<R2 pub URL>` 400 실패의 실제 원인은 GitHub Actions workflow에 `R2_PUBLIC_URL` secret이 주입되지 않아서 `next.config.ts`의 `r2Hostname`이 null이 되어 image optimization이 reject한 것. CI workflow env에 secret을 추가하는 것으로 해결됨
- `e2e/content-rendering.spec.ts`: v0.12.43에 추가한 `page.on("response")` hook, `ALLOWED_4XX_PATTERNS`, `BROWSER_LEVEL_CONSOLE_NOISE`를 모두 제거하고 `trackRuntimeErrors`를 pageerror + console.error만 수집하는 원래 형태로 복원
- `next.config.ts`: v0.12.44에 추가한 `{ hostname: "**.r2.dev" }` fallback pattern 제거. CI env에 `R2_PUBLIC_URL`이 주입되므로 기존 env-driven 로직만으로 충분
- `package.json`: patch version `0.12.45`로 증가

## v0.12.42 (2026-04-20)

### refactor: shadcn/ui token registration via @theme inline + AGENTS.md directive

- `src/styles/global.css`: `@theme inline` block 추가. shadcn token (`--color-background`, `--color-foreground`, `--color-card`, `--color-popover`, `--color-primary`, `--color-secondary`, `--color-muted`, `--color-accent`, `--color-destructive`, `--color-border`, `--color-input`, `--color-ring`, `--radius-*` 등)을 Tailwind v4 utility layer에 노출 → `bg-foreground`, `text-background`, `fill-foreground` 등 shadcn canonical className이 CSS로 정상 생성됨
- `src/components/ui/tooltip.tsx`: v0.12.41에서 도입한 arbitrary CSS var syntax (`bg-(--color-foreground)` 등)를 shadcn canonical className으로 복원 (`bg-foreground text-background fill-foreground`). `@theme inline` 도입으로 동일하게 동작하면서 shadcn CLI generated 코드와 diff가 없어져 향후 shadcn component 추가 시 수동 교체 불필요. `arrowClassName` prop은 lightbox override 용도로 유지
- `AGENTS.md`: "Known Pitfalls"에 shadcn/ui + Tailwind v4 token registration directive 추가. 새 shadcn primitive 추가 시 (1) `@theme inline` token 등록 여부, (2) `tw-animate-css` 존재 여부, (3) `TooltipTrigger asChild`에 span wrap 금지 원칙을 check list로 명시해 동일 regression 재발 방지
- `package.json`: patch version `0.12.42`로 증가

## v0.12.41 (2026-04-20)

### fix: lightbox tooltip invisible body + theme-independent color

- Root cause: shadcn tooltip default className `bg-foreground text-background fill-foreground`는 Tailwind v3 shadcn pattern. Tailwind v4는 `@theme`에 등록된 `--color-*` 변수만 utility를 생성하는데, 이 프로젝트의 `--foreground` / `--background`는 `:root`에만 정의되어 있어 해당 utility들이 아예 CSS로 생성되지 않음. 결과적으로 tooltip body는 transparent bg + 상속된 text color로 lightbox overlay 위에서 invisible, SVG `<polygon>` 기본 fill만 작은 검정 diamond arrow로 노출됨
- Secondary cause: `LightboxTooltipButton`이 `<span className="inline-flex">`로 button을 wrap한 뒤 `TooltipTrigger asChild`로 전달 → Radix hover detection이 span level에서 간헐적으로 fail. Span wrapper 제거 후 button을 asChild에 직접 전달하니 `data-state="delayed-open"`과 `aria-describedby` 정상 주입 확인
- `src/components/ui/tooltip.tsx`: tooltip default className을 Tailwind v4 arbitrary CSS var syntax `bg-(--color-foreground) text-(--color-surface)` / `fill-(--color-foreground)`로 교체해 프로젝트 컬러 스킴 변수와 호환. Arrow 색상을 외부에서 override할 수 있도록 `arrowClassName` prop 추가
- `src/components/ImageLightbox.tsx`: `LightboxTooltipButton` span wrapper 제거. 모든 tooltip (`LightboxTooltipButton`, prev, next)에 `className="z-[130] bg-white text-black"` + `arrowClassName="bg-white fill-white"` 지정해 dark/light mode 무관하게 흰 배경 + 검정 글자로 고정
- `src/styles/global.css`: `@import "tw-animate-css"` 추가. shadcn이 의존하는 `animate-in` / `fade-in-0` / `zoom-in-95` / `slide-in-from-*` utility를 활성화해 tooltip opening animation이 실제로 동작하도록 함
- `package.json`: `tw-animate-css` 의존성 추가, patch version `0.12.41`로 증가

## v0.12.40 (2026-04-20)

### fix: lightbox tooltip stacking 복구

- `src/components/ImageLightbox.tsx`: lightbox 전용 tooltip content z-index class를 `z-[130]`으로 올려 overlay `z-[120]` 위에서 실제로 보이도록 수정
- `e2e/content-rendering.spec.ts`: tooltip hover 시 visible 상태와 `z-[130]` class 적용을 함께 검증해 overlay 뒤에 가려지는 회귀를 방지
- `package.json`: patch version `0.12.40`로 증가

## v0.12.39 (2026-04-20)

### feat: lightbox action button tooltip 추가

- `src/components/ImageLightbox.tsx`: shadcn `Tooltip`을 적용해 zoom, close, prev/next, YouTube play button에 hover tooltip 추가
- `src/components/ImageLightbox.tsx`: loop button과 filmstrip button은 요구사항대로 tooltip 대상에서 제외
- `e2e/content-rendering.spec.ts`: image lightbox와 YouTube lightbox에서 tooltip 노출 regression 검증 추가
- `package.json`: patch version `0.12.39`로 증가

## v0.12.38 (2026-04-20)

### fix: lightbox 빈 영역 click 닫기 복구

- `src/components/ImageLightbox.tsx`: viewport 전체 frame의 click 전파 차단을 제거해 filmstrip, image, control 바깥 빈 영역 click이 overlay close로 전달되도록 복구
- `src/components/ImageLightbox.tsx`: bottom panel 전체 click 전파 차단을 추가해 caption 영역 click도 lightbox close 예외로 처리
- `src/components/ImageLightbox.tsx`: filmstrip strip wrapper와 top control row는 click 전파 차단을 유지해 thumbnail 사이 gap이나 control 사이 빈 공간 click으로 lightbox가 닫히지 않도록 보정
- `e2e/content-rendering.spec.ts`: bottom panel click, filmstrip wrapper click, control row click이 lightbox를 닫지 않고, 빈 overlay click만 닫히는지 regression 검증 추가
- `package.json`: patch version `0.12.38`로 증가

## v0.12.37 (2026-04-20)

### fix: lightbox 빈 영역 click 닫기 복구

- `src/components/ImageLightbox.tsx`: viewport 전체 frame의 click 전파 차단을 제거해 filmstrip, image, control 바깥 빈 영역 click이 overlay close로 전달되도록 복구
- `src/components/ImageLightbox.tsx`: filmstrip strip wrapper와 top control row는 click 전파 차단을 유지해 thumbnail 사이 gap이나 control 사이 빈 공간 click으로 lightbox가 닫히지 않도록 보정
- `e2e/content-rendering.spec.ts`: filmstrip wrapper click과 control row click이 lightbox를 닫지 않고, 빈 overlay click만 닫히는지 regression 검증 추가
- `package.json`: patch version `0.12.37`로 증가

## v0.12.36 (2026-04-20)

### chore: branch별 PR 파일 규칙 강제 + legacy PR.md 제거

- `PR_feature-content-image-lightbox.md`: 검증 결과 현재 branch PR 문서가 최신 변경 범위를 이미 반영하고 있음을 확인
- `AGENTS.md`, `.claude/commands/ship.md`, `.claude/commands/docs.md`: plain `PR.md` 생성 금지, `PR_<branch-name>.md`만 허용, legacy `PR.md` 발견 시 삭제하도록 규칙 강화
- `PR.md`: branch별 PR 파일 체계로 이관 후 삭제
- `package.json`: patch version `0.12.36`으로 증가

## v0.12.35 (2026-04-20)

### fix: lightbox filmstrip padding 확장 + scrollbar 숨김

- `src/components/ImageLightbox.tsx`: filmstrip scroll viewport에 추가 padding을 넣어 active thumbnail border와 scale outline이 잘리지 않도록 조정
- `src/components/ImageLightbox.tsx`: filmstrip horizontal scroll은 유지하면서 WebKit Firefox 기준 scrollbar가 보이지 않도록 숨김 규칙 추가
- `package.json`: patch version `0.12.35`로 증가

## v0.12.34 (2026-04-20)

### fix: lightbox fullscreen 확장

- `src/components/ImageLightbox.tsx`: outer inset padding과 frame width height 제한을 제거하고 lightbox media frame이 viewport 전체를 쓰도록 조정
- `src/components/ImageLightbox.tsx`: image preview와 YouTube player가 fullscreen frame 기준으로 렌더되도록 max size 규칙 정리
- `package.json`: patch version `0.12.34`로 증가

## v0.12.33 (2026-04-20)

### fix: lightbox 내부 click 전파 과민 닫기 보정

- `src/components/ImageLightbox.tsx`: media frame 전체에 click 전파 차단 추가 — filmstrip 선택, caption 영역 click, image drag 이후 click이 overlay close로 이어지지 않도록 수정
- `package.json`: patch version `0.12.33`로 증가

## v0.12.32 (2026-04-20)

### feat: lightbox overlay control 재배치 + drag 닫기 영역 보정

- `src/components/ImageLightbox.tsx`: 상단 control bar와 하단 caption filmstrip을 media 위 overlay로 재배치하고 prev/next button z-index를 낮춰 control 위로 올라오지 않도록 조정
- `src/components/ImageLightbox.tsx`: 이미지 실제 렌더 크기가 viewport frame을 넘길 때만 pan drag가 활성화되도록 overflow 기준 판정 로직 추가
- `src/components/ImageLightbox.tsx`: 이미지와 control 바깥의 빈 overlay 영역 클릭 시 lightbox가 닫히도록 pointer event 구조 정리
- `package.json`: patch version `0.12.32`로 증가

## v0.12.31 (2026-04-20)

### feat: lightbox thumb-only 정리 + debug backfill UX 보강

- `src/components/ImageLightbox.tsx`: filmstrip이 `thumb.webp` 하나만 사용하도록 정리하고 `poster.webp` 참조 제거
- `src/lib/image-upload.ts`, `src/__tests__/image-upload.test.ts`: 업로드 시 `thumb.webp`만 생성하도록 정리
- `src/lib/lightbox-sidecars.ts`, `scripts/backfill-lightbox-sidecars.ts`: 기존 `poster.webp`를 정리하고 GIF도 첫 프레임 기반 정적 `thumb.webp`만 유지하도록 backfill 로직 변경
- `src/components/admin/panels/DebugPanel.tsx`: progress bar modal 추가, 성공 summary 설명 보강, free-tier billing 안내 개선
- `AGENTS.md`: `image-upload.ts` 설명을 thumb-only 구조에 맞게 갱신

## v0.12.30 (2026-04-19)

### feat: admin Debug panel에 lightbox sidecar backfill 실행 추가

- `src/lib/lightbox-sidecars.ts` 신규: `thumb.webp` / `poster.webp` sidecar backfill 공용 로직 추가
- `src/app/admin/actions/lightbox-sidecars.ts` 신규: admin panel에서 backfill 실행용 server action 추가
- `src/components/admin/panels/DebugPanel.tsx` 신규: lightbox sidecar backfill 실행 버튼과 실행 결과 요약/실패 목록 표시 패널 추가
- `src/components/admin/AdminSidebar.tsx`, `src/components/admin/AdminDashboard.tsx`: `Prompt Library`와 `Site Config` 사이에 `Debug` 탭 추가
- `scripts/backfill-lightbox-sidecars.ts`: 공용 lib 호출 구조로 정리

## v0.12.29 (2026-04-19)

### feat: lightbox control row + loop toggle + wide prev next hit-area

- `src/components/ImageLightbox.tsx`: zoom control 버튼을 filmstrip 바로 위 control row로 이동
- `src/components/ImageLightbox.tsx`: `Loop On/Off` toggle 추가 — prev/next, keyboard, swipe가 loop 모드에서 순환 이동
- `src/components/ImageLightbox.tsx`: 좌우 prev/next를 lightbox 전체 높이를 덮는 넓은 rectangle hit-area로 변경

## v0.12.28 (2026-04-19)

### fix: ImageLightbox Hook 순서 오류와 runtime 검증 누락 보정

- `src/components/ImageLightbox.tsx`: `openIndex` 조건부 return 아래에 있던 `useEffect`를 상단으로 이동 — blog slug 페이지 방문 시 발생하던 Hook order 오류 수정
- `e2e/content-rendering.spec.ts`: browser `console` error와 `pageerror`를 수집해 assertion 추가 — page load visibility만 보고 통과하던 runtime 오류 누락 방지
- `AGENTS.md`: frontend route / client component 수정 시 `pnpm dev` 기준 route smoke와 browser console/pageerror 0 확인을 필수 gate로 명시

## v0.12.27 (2026-04-19)

### feat: lightbox sidecar backfill + YouTube E2E 추가

- `src/components/ImageLightbox.tsx`: filmstrip runtime 원본 fallback 제거 — `thumb.webp` / `poster.webp` sidecar만 사용하도록 정리
- `scripts/backfill-lightbox-sidecars.ts` 신규: 기존 `blog/` / `portfolio/` R2 자산에 `thumb.webp` / `poster.webp` sidecar를 영구 생성하는 backfill script 추가
- `package.json`: `pnpm backfill:lightbox-sidecars` script 추가
- `USER_TASKS.md` 신규: 운영 자산 backfill 실행 작업 기록
- `e2e/content-rendering.spec.ts`: `/blog/console-engine-project-2-review` 기준 YouTube lightbox + play button 시나리오 추가

## v0.12.26 (2026-04-19)

### feat: lightbox 이미지 zoom + mobile pinch/drag 추가

- `src/components/ImageLightbox.tsx`: 이미지 전용 `+` / `-` / `Reset` zoom 버튼 추가
- `src/components/ImageLightbox.tsx`: PC wheel zoom 추가
- `src/components/ImageLightbox.tsx`: mobile pinch zoom + drag pan 추가
- `src/components/ImageLightbox.tsx`: image 전환/닫기 시 transform state를 초기화하고, YouTube media에는 zoom/pan UI를 비활성화

## v0.12.25 (2026-04-19)

### feat: lightbox mixed media + blur 제거

- `src/components/ImageLightbox.tsx`: lightbox media 모델을 `image`/`youtube` 공용 구조로 확장하고, YouTube는 정적 thumbnail + play button 방식으로 렌더되도록 변경
- `src/components/ImageLightbox.tsx`: 기존 blur-up 배경 레이어 제거 — 이미지 edge blur flashing 문제 해소
- `src/lib/markdown.tsx`: 본문 YouTube embed wrapper에 `data-youtube-id`와 lightbox 진입 버튼 추가

## v0.12.24 (2026-04-19)

### fix: Firefox WebKit lightbox E2E 클릭 타이밍 회귀 보정

- `e2e/content-rendering.spec.ts`: `content-rendering` suite를 serial로 고정해 `beforeAll`의 `/blog` 접근 타이밍 충돌을 방지
- `e2e/content-rendering.spec.ts`: lightbox 대상 이미지를 `.post-content img[data-lightbox-idx]` 기준으로 기다린 뒤 `scrollIntoViewIfNeeded()`와 `complete/naturalWidth` poll을 거쳐 선택하도록 helper 보강
- `e2e/content-rendering.spec.ts`: Firefox/WebKit의 visibility 판정 차이를 피하기 위해 lightbox 이미지 클릭을 `force: true`로 변경

## v0.12.23 (2026-04-19)

### feat: lightbox v2 Sub-A~D 추가

- `src/components/ImageLightbox.tsx`: 모바일 swipe navigation 추가, filmstrip thumbnail이 `{base}.thumb.webp`를 우선 사용하고 gif는 `{base}.poster.webp`와 runtime static preview로 fallback 하도록 확장
- `src/lib/image-upload.ts`: 업로드 시 `thumb.webp` sidecar를 병행 생성하고 gif는 `poster.webp` sidecar도 추가 생성
- `src/__tests__/image-upload.test.ts`, `src/__tests__/orphan-cleanup.test.ts`: sidecar 업로드 및 `ImageGroup`/sidecar cleanup 회귀 테스트 추가
- `e2e/content-rendering.spec.ts`: lightbox open/close, next navigation, filmstrip 이동 시나리오 추가

## v0.12.22 (2026-04-19)

### feat: image orphan cleanup 문서화 + 이미지 삭제 confirm dialog 추가

- `docs/IMAGE_ORPHAN_CLEANUP.md` 신규: true-orphan 판정 규칙, Trigger 1/2/3, source mode에서 `ImageGroup` 삭제 시 child 이미지 반영, sidecar/baseKey 규칙, safety guard를 상세 문서화
- `src/components/admin/ImageDeleteConfirmDialog.tsx` 신규: 삭제 직전 대상 이미지를 미리 보여주는 custom confirm dialog 추가
- `src/components/admin/RichMarkdownEditor.tsx`: standalone 이미지 delete 버튼을 confirm dialog 뒤에만 실행되도록 변경
- `src/extensions/ImageGroupNode.tsx`: group 전체 삭제, group 내부 이미지 삭제 모두 confirm dialog 뒤에 실행되도록 변경, slider NodeView의 `img`를 `block`으로 고정하고 하단 padding 제거로 hover 버튼 위치 보정

## v0.12.21 (2026-04-19)

### feat: multi-image layout modal + ImageGroup block 추가

- `src/components/admin/RichMarkdownEditor.tsx`: multi-image drop/paste 시 layout modal을 먼저 열도록 변경, `개별사진`은 기존처럼 일반 image node 연속 삽입, `슬라이드`만 `imageGroup` block으로 삽입
- `src/components/admin/ImageLayoutModal.tsx` 신규: `개별사진`, `슬라이드` 2개 레이아웃 선택 modal 추가
- `src/extensions/ImageDropPaste.ts`, `src/extensions/ImageGroupNode.tsx` 신규: multi-image 전용 modal 트리거와 `::image-group[]{...}` 직렬화/파싱 node 추가, group 내부 각 이미지 hover 액션과 group 전체 삭제 버튼 추가
- `src/components/ImageGroup.tsx`, `src/lib/markdown.tsx`, `src/lib/mdx-directive-converter.ts`: source/WYSIWYG/frontend가 같은 `ImageGroup` 구조를 공유하도록 통일, slider 이미지 wrapper 카드 스타일 제거
- `src/__tests__/mdx-directive-converter.test.ts`: `ImageGroup` directive ↔ JSX 변환 및 roundtrip 회귀 테스트 추가

## v0.12.20 (2026-04-18)

### fix: multi-image dnd source markdown를 multiline으로 정규화

- `src/components/admin/RichMarkdownEditor.tsx`: image extension이 `inline: true`라서 dnd/paste로 연속 삽입된 image node가 같은 inline 흐름으로 직렬화되고 source mode에서 `![](...)![](...)` 한 줄로 붙는 원인 확인
- `src/lib/tiptap-markdown.ts`: `normalizeAdjacentImageMarkdown()` 추가 — tiptap serializer 결과의 연속 image markdown만 `\n\n`으로 분리해서 source mode, autosave, DB 저장 문자열이 모두 multiline 유지
- `src/__tests__/tiptap-markdown.test.ts`: 연속 image 분리, 기존 줄바꿈 유지, link 뒤 image 비변경 회귀 테스트 추가

## v0.12.19 (2026-04-18)

### chore: gh PR body 전달 시 cat/HEREDOC 금지 + body-file 강제

- `AGENTS.md` PR Conventions: `--body "$(cat ...)"` 및 HEREDOC 패턴 금지 HARD 규칙 추가, `--body-file <path>` 사용 강제 — Bash 도구가 파일 내용을 conversation context로 다시 읽어 토큰 낭비하는 문제 차단
- `.claude/commands/custom-release.md` Step 4b: HEREDOC 예시 제거, 본문을 임시 파일 저장 후 `--body-file` 사용하도록 변경

## v0.12.18 (2026-04-18)

### test: WYSIWYG ↔ source mode roundtrip 회귀 테스트 추가 (SVG fixture)

- `src/__tests__/image-url-conversion.test.ts`: dummy SVG URL 기반 roundtrip 6개 케이스 추가 — single roundtrip, 10회 연속 변환 멱등성, 다중 SVG 보존, query/fragment 유지, legacy double-wrap repair 후 안정성, bare URL → wrapped 변환 후 멱등

## v0.12.17 (2026-04-18)

### fix: source → WYSIWYG 전환 시 이미지 double-wrap 방지

- `src/extensions/ImageDropPaste.ts` `bareImageUrlsToMarkdown`: lead 정규식에서 `(` 제거 — 이전엔 기존 `![](url)`의 URL이 한 번 더 wrap돼 `![](![](url))` 손상 발생. 이제 `^` / `\s` 만 lead로 인식
- `repairDoubleWrappedImages` 신규: 과거 버그로 손상된 `![](![](url))` / `![](![]\(url\))` 형태를 `![](url)`로 복원. exitSourceMode에서 자동 적용
- `src/__tests__/image-url-conversion.test.ts`: 11개 회귀 케이스 (기존 markdown image 보존, 다중 이미지, 확장자 종류, escape 처리)

## v0.12.16 (2026-04-18)

### feat: 본문 이미지 hover 시 trash 삭제 버튼 추가

- `src/components/admin/RichMarkdownEditor.tsx`: image NodeView에 trash 아이콘 삭제 버튼 추가 — 기존 "썸네일로 설정" 버튼 옆 (`flex gap-2`) 우상단에 배치, group-hover 시 동시 표시. 클릭 시 NodeView `deleteNode()` 호출 → 정밀 backspace 없이 노드 단위 삭제, T1 cleanup 자연 트리거

## v0.12.15 (2026-04-18)

### feat: editor open T3 안전망 + slug rename snapshot URL rewrite

- `src/lib/snapshot-cleanup.ts`:
    - `maybeCleanupOnOpen(entityType, entitySlug, args)` — `editor_states.count = 0`인 경우만 full true-orphan cleanup 실행 (count > 0이면 R2 호출 0). 외부에서 snapshot이 clear된 엣지 케이스 복구
    - `rewriteSnapshotUrls(entityType, entitySlug, oldFolder, newFolder)` — slug rename 시 Initial/Auto-save/Bookmark 모든 snapshot.content의 folder prefix를 새 slug로 일괄 치환
- `src/components/admin/panels/PostsPanel.tsx`, `PortfolioPanel.tsx`:
    - `openEdit`에서 `maybeCleanupOnOpen` 호출 (T3 안전망)
    - `migrateAssetsIfNeeded`에서 `moveStorageFolder` 뒤에 `rewriteSnapshotUrls` 호출 — slug rename 후 snapshot이 옛 prefix를 참조해 false-orphan 판정되는 문제 제거
- `src/components/admin/EditorStatePreservation.tsx`: backdrop `z-[100]` → `z-100` Tailwind 네이티브 syntax로 정리

## v0.12.14 (2026-04-18)

### feat: snapshot-delete + 본문 image-remove 시 true-orphan cleanup 연동

- `src/lib/snapshot-cleanup.ts`: `triggerSnapshotCleanup(args)` helper — fire-and-forget cleanup 호출
- `src/components/admin/EditorStatePreservation.tsx`:
    - `folderPath` / `thumbnail` props 추가 (post/portfolio 한정 cleanup 활성화)
    - `fireCleanup` callback 통합 — init 종료, autosave eviction, `handleDelete`, `handleDeleteAll` 4개 지점에서 호출
    - `currentContent` / `thumbnail` ref로 stale 회피
- `src/components/admin/panels/PostsPanel.tsx`, `PortfolioPanel.tsx`:
    - `EditorStatePreservation`에 `folderPath` + `thumbnail` 전달
    - `RichMarkdownEditor`에 `onImagesRemoved` 핸들러 — 1초 debounce 후 받은 URL 배열을 `extractKeysFromText` + `baseKey`로 변환해 `cleanupTrueOrphans({ candidates })` 호출 (Trigger 1 parent-side wiring)

## v0.12.13 (2026-04-18)

### feat: RichMarkdownEditor drag-drop + paste 이미지 업로드 + URL handling

- `src/extensions/ImageDropPaste.ts` 신규: Tiptap ProseMirror extension — drop / paste-with-files 이미지를 R2에 업로드 후 drop 위치에 image node 삽입. 다중 drop = `Promise.all` 병렬 업로드 + 원래 순서 sequential insert (pos는 매 insert마다 `node.nodeSize` 증가). text-only image URL paste는 R2 업로드 없이 image node로 삽입. `getFolderPath` getter로 slug rename 후에도 최신 folder 사용
- `src/extensions/ImageDropPaste.ts` `bareImageUrlsToMarkdown(text)` helper: source mode → WYSIWYG 전환 시 bare image URL을 `![](url)` markdown으로 변환
- `src/components/admin/RichMarkdownEditor.tsx`:
    - `ImageDropPaste.configure({ getFolderPath })` extension 등록
    - `onUpdate`에서 image 노드 src diff → 1000ms global debounce 후 `onImagesRemoved(urls)` 콜백 (Trigger 1)
    - `exitSourceMode`에서 `bareImageUrlsToMarkdown` preprocess
    - `onImagesRemoved` prop 추가
- `src/components/admin/TiptapImageUpload.tsx`: URL 탭 단순화 — "R2에 저장" 경로 (`handleUrlUpload`) 제거, "URL 그대로" → "URL 삽입" 단일 버튼으로 통합. 외부 URL은 R2 업로드 없이 그대로 본문 삽입

## v0.12.12 (2026-04-18)

### feat: true-orphan cleanup + snapshot-aware lib

- `src/lib/orphan-cleanup.ts` 신규: `cleanupTrueOrphans` / `cleanupSingleKey` 단일 알고리즘 — content + thumbnail + 모든 snapshot 합집합으로 referenced base set 구성, sidecar (`baseKey` regex로 `.thumb.webp` / `.poster.webp` strip + 확장자 strip)는 base가 살아있으면 보존
- `src/lib/snapshot-cleanup.ts` 신규: `loadSnapshotsContent`로 entity의 모든 snapshot.content 조회, `deleteSnapshotsAndCleanup` 으로 snapshot 삭제 + 후속 cleanup wrapper 통합
- 안전 가드: list 빈/throw 시 skip, referenced 빈 + content 비-empty 시 skip (parser 오류 wipe 방지)
- dev mode 한정 `console.log` 진단 출력 (`process.env.NODE_ENV === "development"`)
- `src/__tests__/orphan-cleanup.test.ts` 신규: baseKey/extractKeysFromText/cleanupTrueOrphans 21개 회귀 케이스

## v0.12.11 (2026-04-18)

### feat: storage-ops delete-keys action + deleteStorageKeys helper

- `src/app/api/storage-ops/route.ts`: `action === "delete-keys"` 분기 추가 — 명시 key 배열만 R2에서 삭제. S3 DeleteObjects 한도 1000 chunk 처리. 빈 배열 안전 처리
- `src/lib/image-upload.ts`: `deleteStorageKeys(keys)` helper 추가 — orphan-cleanup이 base + sidecar key 정밀 삭제할 수 있는 client API

## v0.12.10 (2026-04-18)

### chore: ship command의 분리 commit 규칙 명시

- `.claude/commands/ship.md`: 여러 독립 변경이 동시에 있을 때 각 변경별로 별도 commit, 별도 version/CHANGES/PR 반영을 하도록 규칙 추가

## v0.12.9 (2026-04-18)

### test: active job field 정규화 회귀 테스트 추가

- `src/lib/job-field.ts`: 신규 생성 기본값 helper `getInitialJobFieldSelection()` 추가
- `src/__tests__/job-field.test.ts`: `"game"` 형태의 잘못 저장된 값이 정규화되고 신규 생성 기본값으로 `["game"]`이 되는지 검증하는 테스트 추가
- `src/components/admin/panels/PostsPanel.tsx`, `PortfolioPanel.tsx`, `BooksSubPanel.tsx`: 신규 생성 기본 job field를 helper로 통일

## v0.12.8 (2026-04-18)

### fix: active job field 저장값의 이중 문자열화 제거

- `src/components/admin/panels/SiteConfigPanel.tsx`: `site_config.job_field` 저장 시 `JSON.stringify()` 제거 — active job field가 `"game"` 형태로 저장되던 문제 수정
- `src/lib/job-field.ts`: 저장된 `job_field` 문자열과 배열을 정규화하는 helper 추가
- `src/components/admin/panels/PostsPanel.tsx`, `PortfolioPanel.tsx`, `BooksSubPanel.tsx`, `ResumePanel.tsx`: active job field 및 기존 `job_field` 값을 로드/저장할 때 정규화 적용 — 이미 잘못 저장된 `"game"` 값도 신규 생성 기본값과 재저장 경로에서 `game`으로 보정

## v0.12.7 (2026-04-18)

### feat: settings modal thumbnail clear 버튼 추가

- `src/components/admin/ThumbnailUploadField.tsx`: 썸네일 값이 있을 때 `삭제` 버튼 표시, 클릭 시 `onChange("")`로 thumbnail field 즉시 비움

## v0.12.6 (2026-04-18)

### fix: metadata settings modal 본문 clipping 보정

- `src/components/admin/MetadataSheet.tsx`: `DialogHeader`와 본문 wrapper에 `min-w-0` 추가 — `DialogContent`의 grid 직계 자식이 긴 field의 min-content width 때문에 오른쪽으로 잘리던 문제 보정

## v0.12.5 (2026-04-18)

### fix: admin metadata settings modal 가로 overflow 보정

- `src/components/admin/ThumbnailUploadField.tsx`: tablet 이상 가로 row에 `min-w-0` 추가, URL input에도 `min-w-0` 추가 — 긴 썸네일 URL이 modal 본문을 오른쪽으로 밀어내던 문제 완화
- `src/components/admin/MetadataSheet.tsx`: settings modal `DialogContent`에 `overflow-x-hidden` 추가 — 내부 필드 overflow가 가로 스크롤로 드러나지 않도록 보정
- `src/components/ui/dialog.tsx`: 존재하지 않는 `sm:max-w-lg`를 `tablet:max-w-lg`로 교체 — 프로젝트 breakpoint 규칙과 공용 Dialog 기본 폭 일치

## v0.12.4 (2026-04-18)

### feat: 본문 이미지 lightbox

- `src/components/ImageLightbox.tsx` 신규: blog/portfolio 상세 페이지 본문 이미지 클릭 시 lightbox 모달로 full-resolution 표시. backdrop `z-[120] bg-black/80`, 이미지 `max-w-[80vw] max-h-[80vh] object-contain`
- 네비게이션: 좌/우 arrow 버튼 + ArrowLeft/ArrowRight 키, 첫/마지막에서 disabled (wrap 없음), Escape / backdrop click 으로 닫기
- Filmstrip: 현재 index 기준 ±5 고정 11개 window, 현재 항목 accent border + scale 강조
- Blur-up loading: 동일 src를 `blur-xl` 배경으로 먼저 표시 후 full-res fade-in
- Caption: 이미지 `alt` 텍스트 lightbox 하단에 표시
- DOM scan + click delegation + `MutationObserver` 로 Mermaid/lazy-load late render 대응
- `src/app/(frontend)/blog/[slug]/page.tsx`, `src/app/(frontend)/portfolio/[slug]/page.tsx` 에 mount — 상단 thumbnail은 content wrapper 외부라 자동 제외

## v0.12.3 (2026-04-17)

### fix: stale refresh token 에러 처리

- `src/components/UserMenu.tsx`: `browserClient.auth.getSession()` 반환의 `error` 및 promise rejection을 처리. `AuthApiError: Invalid Refresh Token: Refresh Token Not Found`가 발생하면 `signOut({ scope: "local" })`로 localStorage의 stale 토큰만 정리 — 원격 세션은 건드리지 않음

## v0.12.2 (2026-04-17)

### fix: NotFound 페이지 setState-in-render 경고 제거 + Discord ack 지시 추가

- `src/app/not-found.tsx`: `setInterval` 업데이터 내부에서 `router.push` 호출하던 구조를 제거. `setTimeout` + `countdown` 의존성 effect로 변경, redirect는 effect 본문에서 실행 — React의 "Cannot update a component while rendering" 경고 해소
- `AGENTS.md`: Discord 채널을 통해 수신한 메시지에 대해 작업 시작 전 짧은 ack reply를 보내도록 지시 추가

## v0.12.1 (2026-04-17)

### fix: Tiptap 이미지 업로드 모달을 R2로 마이그레이션

- `src/components/admin/TiptapImageUpload.tsx`: Supabase Storage `images` bucket 직접 호출 제거, `lib/image-upload.ts`의 `uploadImage()`를 통해 `/api/upload-image` R2 route 경유하도록 통일 — R2 전환 이후 발생하던 "no bucket" 에러 해소

## v0.12.0 (2026-04-17)

### release: minor 버전 release

- Gantt Chart 전면 개편 — 모달 기반 생성/편집, 카테고리 색상/태그, compact 수평 레이아웃, comments 토글, zoom-invariant JPG export
- Editor/Thumbnail 개선 — RichMarkdownEditor thumbnail 버튼 위치/스타일 보정, Sonner toast 도입 (top-center, 커스텀 폰트/아이콘)
- Infra — `R2_PUBLIC_URL` 기반 동적 `remotePatterns`, Supabase storage 제거

## v0.11.93 (2026-04-17)

### revert: editor title focus ring 보정 되돌리기

- `src/components/admin/panels/PostsPanel.tsx`, `src/components/admin/panels/PortfolioPanel.tsx`: v0.11.88의 title+slug `focus-within` inset ring wrapper 변경 제거

## v0.11.92 (2026-04-17)

### feat: Gantt Chart comment 표시 토글 추가

- `src/components/admin/panels/GanttChartPanel.tsx`: 툴바에 "Comments ON/OFF" 토글 버튼 추가 (기본 OFF) — ON 시 각 task 아래에 full comment 노출, bar track 높이 44→60px 확장

## v0.11.91 (2026-04-17)

### fix: Gantt Chart task row를 compact 수평 레이아웃으로 변경

- `src/components/admin/panels/GanttChartPanel.tsx`: task name + category tag를 한 줄에, 날짜+comment를 한 줄로 통합 / bar track 높이 64→44px, bar pill 높이 40→32px로 축소해 행 높이 최소화

## v0.11.90 (2026-04-17)

### feat: Gantt Chart 각 task에 category tag 표시

- `src/components/admin/panels/GanttChartPanel.tsx`: `GanttChartPreview` task 좌측 정보 영역에 category를 solid 배경 pill tag로 표시, 색상은 `categoryColors` 매핑 적용

## v0.11.89 (2026-04-17)

### fix: GanttChartCategoryColorModal 색상 picker가 color square 옆에 열리도록 수정

- `src/components/admin/panels/GanttChartCategoryColorModal.tsx`: hidden input + ref trigger 패턴 제거 → color input을 color square 버튼 내부에 `absolute inset-0 opacity-0` overlay로 삽입, picker가 버튼 위치 기준으로 열리도록 수정

## v0.11.88 (2026-04-17)

### fix: editor title 영역 focus ring 좌우 clipping 보정

- `src/components/admin/panels/PostsPanel.tsx`, `src/components/admin/panels/PortfolioPanel.tsx`: title + slug 영역을 `focus-within` inset ring wrapper로 감싸고 좌우 padding을 추가해 focus ring이 상위 `overflow-hidden` 구조에서 잘리지 않도록 수정

## v0.11.87 (2026-04-17)

### fix: Sonner toast font와 success icon 시각 피드백 보정

- `src/components/ui/sonner.tsx`: toast에 프로젝트 기본 `--font-sans` 적용
- `src/components/ui/sonner.tsx`: success icon을 green `CheckCircle2`로 교체해 성공 상태를 시각적으로 구분

## v0.11.86 (2026-04-17)

### fix: Sonner toast 위치를 top-center로 변경

- `src/components/ui/sonner.tsx`: 전역 `Toaster` 기본 위치를 `bottom-right`에서 `top-center`로 변경

## v0.11.85 (2026-04-17)

### fix: thumbnail 설정 성공 시 Sonner toast 추가

- `sonner` 의존성 추가, `src/components/ui/sonner.tsx` 신규, `src/app/layout.tsx`에 전역 `Toaster` 연결
- `src/components/admin/RichMarkdownEditor.tsx`: `썸네일로 설정` 클릭 후 `toast.success("썸네일로 설정됨")` 호출로 성공 피드백 추가

## v0.11.84 (2026-04-17)

### fix: Gantt Chart JPG export 줌 무관하게 항상 100% 크기로 캡처

- `src/components/admin/panels/GanttChartPanel.tsx`: 캡처 전 `transform`을 `scale(1)`로 임시 교체, `finally`에서 복원 — 줌 상태와 무관하게 여백 없는 전체 차트 export

## v0.11.83 (2026-04-17)

### fix: RichMarkdownEditor thumbnail 버튼 위치를 이미지 표시 영역 기준으로 보정

- `src/components/admin/RichMarkdownEditor.tsx`: image NodeView에 실제 이미지 크기를 따라가는 내부 wrapper를 추가하고 `썸네일로 설정` 버튼을 그 wrapper 기준 absolute overlay로 재배치
- `src/styles/global.css`: editor 내부 image node 전용 `max-width`, `margin: 0`, `height: auto` 스타일 추가로 `prose` 기본 이미지 스타일이 overlay 기준을 흔들지 않도록 수정

## v0.11.82 (2026-04-17)

### feat: GanttChartPanel 전면 개편 — 모달 기반 생성/편집 + 카테고리 색상

- `src/lib/gantt-chart.ts`: `GanttChartArchive`, `GanttChartBarStyle` 타입 export 추가
- `src/components/admin/panels/GanttChartCreateModal.tsx`: 차트 생성/편집 겸용 모달 신규 (80vw×80vh, Excel 스타일 테이블, CSV import, 미저장 경고)
- `src/components/admin/panels/GanttChartCategoryColorModal.tsx`: 카테고리별 이름/색상 편집 모달 신규 (50vw×80vh, native color picker)
- `src/components/admin/panels/GanttChartPanel.tsx`: CSV 업로드 제거, 생성/편집/Category Colors 버튼 추가, Color Scheme 드롭다운 제거, 카테고리별 bar 색상 렌더링

## v0.11.81 (2026-04-17)

### feat: GanttChartTask category 필드 추가 및 5컬럼 CSV 파서

- `src/lib/gantt-chart.ts`: `GanttChartTask`에 `category` 필드 추가, CSV 헤더 5컬럼(`task name,category,start date,end date,comment`)으로 확장, `parseGanttCsv`/`normalizeStoredGanttTasks` 업데이트
- `src/lib/migrations.ts`: `gantt_chart_archives.category_colors JSONB` 컬럼 마이그레이션 추가 (v0.11.81)
- `src/__tests__/gantt-chart.test.ts`: 5컬럼 포맷으로 테스트 케이스 업데이트

## v0.11.80 (2026-04-17)

### fix: thumbnail 버튼 이미지 내부 렌더링 위치 및 accent 색상 수정

- `src/components/admin/RichMarkdownEditor.tsx`: NodeViewWrapper에 `align-top leading-none` 추가, `<img>`에 `block` 추가로 버튼이 이미지 내부에 정확히 위치하도록 수정
- 버튼 배경색을 `--color-accent` / `--color-on-accent` CSS 변수로 교체 (다크/라이트 테마 대응)

## v0.11.79 (2026-04-17)

### chore: next.config R2_PUBLIC_URL remotePattern 추가 및 Supabase storage 항목 제거

- `next.config.ts`: `R2_PUBLIC_URL` 환경 변수에서 호스트네임을 파싱해 `images.remotePatterns`에 동적 추가, 더 이상 사용하지 않는 `*.supabase.co` 항목 제거

## v0.11.78 (2026-04-17)

### fix: avatar placeholder 로컬화 및 UserMenu 이미지 로드 실패 폴백 추가

- `public/avatar-placeholder.svg`: Supabase Storage URL 의존 제거, 로컬 SVG 신규 추가
- `src/components/UserMenu.tsx`: placeholder를 로컬 경로로 교체, `onError` 핸들러 추가 (실패 시 sessionStorage 캐시 삭제 + placeholder 폴백)
- `src/components/AboutView.tsx`: placeholder를 로컬 경로로 교체

## v0.11.77 (2026-04-17)

### feat: RichMarkdownEditor 이미지 thumbnail 선택 기능 추가

- `src/components/admin/RichMarkdownEditor.tsx`: `onSetThumbnail` prop 추가, Tiptap Image 확장을 ReactNodeViewRenderer 기반으로 교체하여 WYSIWYG hover 시 "Set as thumbnail" 버튼 표시
- `src/components/admin/panels/PostsPanel.tsx`: `onSetThumbnail` prop 연결
- `src/components/admin/panels/PortfolioPanel.tsx`: `onSetThumbnail` prop 연결

## v0.11.76 (2026-04-17)

### fix: MigrationsPanel 미적용 안내 영역 우측 padding 보정

- `src/components/admin/panels/MigrationsPanel.tsx`: 안내 문구와 자동 적용 버튼이 우측 가장자리에 붙는 현상을 막기 위해 상단 안내 row에 `pr-4` 추가

## v0.11.75 (2026-04-17)

### fix: Gantt Chart panel refresh 시 archive별 draft 설정 유지

- `src/components/admin/panels/GanttChartPanel.tsx`: title, color scheme, bar shape draft를 archive id 기준으로 분리 저장하도록 수정
- `src/components/admin/panels/GanttChartPanel.tsx`: refresh와 archive 전환 이후에도 각 entry의 draft 설정이 서로 덮어쓰지 않도록 동작 보정

## v0.11.74 (2026-04-16)

### feat: Gantt Chart panel에 bar shape 설정과 최종 chart 정리 반영

- `src/components/admin/panels/GanttChartPanel.tsx`: 최종 chart 우측 상단의 color scheme label 제거
- `src/components/admin/panels/GanttChartPanel.tsx`: `Bar Shape` selector 추가, `rounded`/`square` 전환과 저장 지원
- `src/lib/migrations.ts`, `supabase/setup.sql`, `supabase/migration-whole.sql`: `gantt_chart_archives.bar_style` 컬럼과 최신 schema version 반영

## v0.11.71 (2026-04-16)

### test: resume-layout test의 coreCompetencies 타입 케이스 정리

- `src/__tests__/resume-layout.test.ts`: 현재 `Resume` 타입에 맞는 `coreCompetencies` wrapper 형식으로 기본 fixture 수정
- `src/__tests__/resume-layout.test.ts`: legacy 배열 형식을 검증하는 empty case는 명시적 캐스팅으로 유지해 `resolveSectionOrder()` 하위 호환 경로 검증 복구

## v0.11.70 (2026-04-16)

### feat: admin content 카테고리에 Gantt Chart 패널 추가

- `src/components/admin/panels/GanttChartPanel.tsx`: `PostsPanel` 상단 구조를 참고한 sticky title 기반의 빈 패널 추가
- `src/components/admin/AdminSidebar.tsx`: Content 섹션에 `Gantt Chart` 탭 추가, 최종 순서를 `포스트 → 포트폴리오 → 태그 → Gantt Chart`로 정렬
- `src/components/admin/AdminDashboard.tsx`, `src/components/admin/CommandPalette.tsx`: 새 탭 라우팅과 커맨드 팔레트 탐색 항목 연결

## v0.11.69 (2026-04-16)

### feat: image storage Supabase → Cloudflare R2 마이그레이션 (Wrangler 기반)

- `wrangler.jsonc`: R2 bucket binding 설정 (`gvm1229-portfolio-images`)
- `src/lib/r2.ts`: Cloudflare R2 S3 호환 client (Vercel 서버 런타임용)
- `src/app/api/upload-image/route.ts`: admin 인증 + R2 upload API route
- `src/app/api/storage-ops/route.ts`: R2 파일 list/move/delete API route
- `src/lib/image-upload.ts`: Supabase Storage → R2 API route 호출로 전환, `uploadImageToSupabase()` → `uploadImage()` rename
- `ThumbnailUploadField`, `AboutPanel`, `ResumePanel`: upload 함수명 갱신
- `scripts/migrate-supabase-to-r2.ts`: Supabase Storage → R2 파일 복사 스크립트
- `scripts/rewrite-image-urls.ts`: DB 내 이미지 URL 일괄 치환 스크립트 (dry-run 지원)
- `.env.example`: R2 환경변수 5개 추가
- `.gitignore`: `.wrangler/` 추가

## v0.11.68 (2026-04-16)

### feat: DB Snapshot을 전체 public schema 백업 방식으로 전환

- `src/app/admin/actions/snapshots.ts`: `database_snapshots` 기준의 생성·목록·다운로드·삭제 서버 액션으로 전면 교체
- `src/components/admin/panels/SnapshotsPanel.tsx`: 기존 MCP record snapshot 브라우저를 제거하고 `Take snapshot`, 생성 시각 표시, JSON 다운로드, 삭제 중심 UI로 재구성
- `src/lib/mcp-tools.ts`: MCP write path의 `content_snapshots` 자동 백업 로직과 관련 안내 문구 제거
- `src/lib/migrations.ts`, `supabase/setup.sql`, `supabase/migration-whole.sql`: `database_snapshots` 테이블과 `create_database_snapshot()` 함수 추가, 기존 `content_snapshots` 구조 제거, DB schema version `0.11.68` 반영

## v0.11.67 (2026-04-16)

### fix: SiteConfigPanel 제목 고정 + 내부 scroll 패턴 적용

- `src/components/admin/AdminDashboard.tsx`: "config" 탭을 `panelOwnsHeight` + `overflow-hidden` 목록에 추가하여 패널이 자체 높이 관리
- `src/components/admin/panels/SiteConfigPanel.tsx`: PostsPanel과 동일한 flex scroll 패턴 적용 — 제목은 `shrink-0`로 상단 고정, 나머지 콘텐츠는 `flex-1 overflow-y-auto`로 내부 scroll

## v0.11.66 (2026-04-16)

### fix: SnapshotsPanel batch action bar에서 카드형 box 제거

- `src/components/admin/panels/SnapshotsPanel.tsx`: `전체 선택` checkbox와 `선택 삭제` 버튼 영역이 스냅샷 카드처럼 보이지 않도록 border/background box 제거

## v0.11.65 (2026-04-16)

### docs: SnapshotsPanel 설명 문구를 실제 동작 기준으로 구체화

- `src/components/admin/panels/SnapshotsPanel.tsx`: 스냅샷 생성 시점, 대상 테이블, 레코드당 20개 유지, 복원이 같은 `id` 레코드를 snapshot JSON으로 덮어쓰는 동작, admin 일반 저장과 별개라는 점을 설명에 명시

## v0.11.64 (2026-04-16)

### fix: SnapshotsPanel 복원 confirm 문구 강화

- `src/components/admin/panels/SnapshotsPanel.tsx`: `복원` confirm에 overwrite와 되돌리기 어려움을 명시하고, confirm button label을 `덮어쓰기 복원`으로 변경

## v0.11.63 (2026-04-16)

### feat: SnapshotsPanel 선택 checkbox와 일괄 삭제 추가

- `src/app/admin/actions/snapshots.ts`: 여러 snapshot id를 한 번에 삭제하는 `deleteSnapshots()` 서버 액션 추가
- `src/components/admin/panels/SnapshotsPanel.tsx`: 각 카드 좌측 checkbox, 상단 `전체 선택`, 선택 개수 표시, red solid `선택 삭제` batch action 추가

## v0.11.62 (2026-04-16)

### feat: SnapshotsPanel 개별 삭제 버튼 추가

- `src/app/admin/actions/snapshots.ts`: `content_snapshots` 행을 직접 지우는 `deleteSnapshot()` 서버 액션 추가
- `src/components/admin/panels/SnapshotsPanel.tsx`: 각 스냅샷 카드에 red solid `삭제` 버튼 추가, confirm dialog 이후 삭제 실행

## v0.11.61 (2026-04-16)

### fix: SnapshotsPanel 데이터 보기 빈 영역 수정

- `src/app/admin/actions/snapshots.ts`: `listSnapshots()`가 `content_snapshots.data` 컬럼을 함께 조회하도록 수정
- `src/components/admin/panels/SnapshotsPanel.tsx`: `데이터 보기`에서 실제 snapshot payload가 표시되도록 서버 응답 shape 복구

## v0.11.60 (2026-04-16)

### feat: admin confirm을 custom alert dialog로 통일

- `src/components/ui/alert-dialog.tsx`, `src/components/ui/confirm-dialog.tsx`: shadcn/Radix 기반 공용 `AlertDialog` wrapper와 Promise 기반 `confirm()` provider 추가
- `src/app/admin/layout.tsx`: admin 전체를 `ConfirmDialogProvider`로 감싸 destructive action과 인앱 이탈 확인을 custom dialog로 통일
- `PostsPanel`, `PortfolioPanel`, `BooksSubPanel`, `TagsPanel`, `SnapshotsPanel`, `AboutPanel`, `SiteConfigPanel`, `SkillsAdminSection`, `ResumePanel`, `useUnsavedWarning`: native `confirm()`을 custom dialog 호출로 교체
- `beforeunload` 기반 브라우저 이탈 경고는 기존 native prompt 유지

## v0.11.59 (2026-04-16)

### fix: SiteConfigPanel 직무 분야 삭제에 confirm 추가

- `src/components/admin/panels/SiteConfigPanel.tsx`: 직무 분야 `삭제` 버튼 클릭 시 field 이름을 포함한 confirm을 먼저 띄우고, 확인한 경우에만 삭제 실행

## v0.11.58 (2026-04-16)

### feat: SiteConfigPanel 직무 분야 selector를 선택 중심 레이아웃으로 재구성

- `src/components/admin/panels/SiteConfigPanel.tsx`: `현재 활성 직무 분야` 요약 block 추가
- 직무 분야 목록을 card grid로 재구성하고, 각 card에서 `기본으로 선택` / `삭제` 액션을 명시적으로 분리
- `새 직무 분야 추가`를 별도 composer panel로 분리하고 emoji, 이름, 상속 시작점을 한 영역에 정리
- 상속 시작점 `select`와 `option`에 surface/text 색을 명시해 dark mode에서 dropdown menu가 흰 배경으로 열리던 문제 수정

## v0.11.57 (2026-04-16)

### fix: AgentTokensPanel 만료·폐기 상태 badge를 solid로 변경

- `src/components/admin/panels/AgentTokensPanel.tsx`: `Expired` badge를 amber solid, `Revoked` badge를 red solid로 변경

## v0.11.56 (2026-04-16)

### fix: AgentTokensPanel 폐기 버튼을 red solid로 변경

- `src/components/admin/panels/AgentTokensPanel.tsx`: active 토큰의 `폐기` 버튼을 outline에서 red solid 버튼으로 변경

## v0.11.55 (2026-04-16)

### fix: admin refresh 버튼을 solid 스타일 + 회전 아이콘으로 정리

- `src/components/admin/panels/MigrationsPanel.tsx`: 새로고침 버튼 2곳을 outline에서 solid neutral 버튼으로 변경하고, refresh 중 `RefreshCw` icon 회전 추가
- `src/components/admin/panels/AgentTokensPanel.tsx`: 토큰 목록 새로고침 버튼을 동일한 solid neutral 버튼으로 변경하고, loading 중 `RefreshCw` icon 회전 추가

## v0.11.54 (2026-04-16)

### fix: admin 저장 버튼의 light/dark green 강도 조정

- 저장 계열 버튼의 green tone을 `light = bg-green-500 / hover:bg-green-400`, `dark = dark:bg-green-600 / dark:hover:bg-green-500`로 재조정
- `PostsPanel`, `PortfolioPanel`, `BooksSubPanel`, `ResumePanel`, `TagsPanel`, `SiteConfigPanel`, `AboutPanel`, `SkillEditorModal`, `SkillsAdminSection`, `EditorStatePreservation`, `TiptapImageUpload`, `MigrationsPanel` 반영

## v0.11.53 (2026-04-16)

### fix: admin 저장 버튼을 개별 Tailwind class로 재정의

- `src/styles/global.css`: `admin-save-button` utility 제거
- `PostsPanel`, `PortfolioPanel`, `BooksSubPanel`, `ResumePanel`, `TagsPanel`, `SiteConfigPanel`, `AboutPanel`: 저장/완료/적용 버튼에 green Tailwind class를 직접 적용하고 `dark:bg-green-*`, `dark:hover:bg-green-*`까지 명시
- `SkillEditorModal`, `SkillsAdminSection`, `EditorStatePreservation`, `TiptapImageUpload`, `MigrationsPanel`: modal과 보조 admin 컴포넌트의 저장 계열 버튼도 전역 utility 없이 동일 기준으로 치환

## v0.11.52 (2026-04-16)

### fix: admin 저장 버튼 색상을 green으로 통일

- `src/styles/global.css`: color scheme과 무관하게 admin 저장 계열 버튼이 green을 유지하도록 `admin-save-button` utility 추가
- `PostsPanel`, `PortfolioPanel`, `BooksSubPanel`, `ResumePanel`, `TagsPanel`, `SiteConfigPanel`, `AboutPanel`: 저장 bar와 inline 저장 버튼을 `admin-save-button`으로 통일
- `SkillEditorModal`, `SkillsAdminSection`, `EditorStatePreservation`, `TiptapImageUpload`, `MigrationsPanel`: modal과 보조 admin 컴포넌트의 저장/적용 버튼도 green으로 통일

## v0.11.51 (2026-04-16)

### fix: Resume layout mode 종료 버튼 label 명확화

- `src/components/admin/panels/ResumePanel.tsx`: layout mode 활성 상태의 상단 버튼 label을 `편집 종료`에서 `레이아웃 편집 종료`로 변경

## v0.11.50 (2026-04-16)

### fix: Resume layout editor에서 page scroll 제거

- `src/components/admin/panels/ResumePanel.tsx`: `layoutEditMode` 활성화 시 바깥 본문 컨테이너를 `overflow-hidden`으로 전환하고, `ResumeLayoutEditor` wrapper를 `flex-1 min-h-0`로 변경해 page 자체 scroll 제거
- `src/components/admin/panels/ResumeLayoutEditor.tsx`: root에 `overflow-hidden` 추가, preview pane과 section list pane에 `min-h-0` 적용으로 내부 두 pane만 독립 scroll 유지

## v0.11.49 (2026-04-16)

### chore: PR.md git tracking 제거

- `PR.md`를 git 추적 대상에서 제거하고 `.gitignore` 루트 markdown 규칙으로 로컬 전용 파일로 유지

### test: Resume layout E2E 제거

- `e2e/authenticated/resume-layout-editor.spec.ts` 삭제
- Resume layout test가 `resume_section_layout`를 직접 저장하면서 실제 이력서 편집 상태를 reset하던 흐름 제거

### feat: Core Competencies 섹션에 emoji 지원 추가

- `src/types/resume.ts`: `coreCompetencies` 타입을 배열에서 `{ emoji?, showEmoji?, entries }` 객체 wrapper로 변경. `defaultSectionLabels`에 `coreCompetencies: "핵심역량"` 추가
- `src/components/admin/panels/ResumePanel.tsx`: `SectionEmojiSelector` + `Switch` 추가. 기존 배열 데이터 하위 호환 정규화
- `src/lib/resume-layout.ts`: `resolveSectionOrder`에서 배열/객체 양쪽 형식 지원
- `src/app/(frontend)/resume/page.tsx`: 하위 호환 정규화 (배열 → entries 추출)
- `ResumeClassic.tsx`, `ResumeModern.tsx`, `ResumeClassicPreview.tsx`, `ResumeModernPreview.tsx`: 하드코딩 "핵심역량" → `getLabel("coreCompetencies")` 변경 (emoji 반영)
- `ResumeLayoutEditor.tsx`: `EXTRA_LABELS`에서 중복 제거, preview에 `.entries` 전달

## v0.11.48 (2026-04-16)

### refactor: layout edit mode에서 레이아웃 선택 + 기본 정보 섹션 숨김

- `src/components/admin/panels/ResumePanel.tsx`: `layoutEditMode` 활성화 시 레이아웃 selector (classic/modern)와 기본 정보 editor를 `{!layoutEditMode && ...}`로 조건부 렌더링. layout edit mode 진입 시 `ResumeLayoutEditor`만 표시

## v0.11.47 (2026-04-16)

### fix: Firefox E2E 실패 — "편집 종료" handler의 stale state revert 수정

- `src/components/admin/panels/ResumePanel.tsx`: `initialSectionLayoutRef` (ref) 추가. `handleSave`에서 `setInitialSectionLayout`과 동시에 ref를 즉시 갱신. "편집 종료" button handler가 render closure의 stale `initialSectionLayout` 대신 ref를 참조하여 dirty 판정 + revert 수행
- 원인: Firefox(SpiderMonkey)에서 React batched state update flush 타이밍이 Chromium/WebKit과 달라, save 후 "편집 종료" 클릭 시 `isLayoutDirty`가 stale true → `window.confirm` 발생 → Playwright auto-accept → 저장 전 상태로 revert → disabled section이 `display: block`으로 렌더링
- `AGENTS.md`, `.claude/commands/ship.md`: push gate E2E 요구를 Chromium-only에서 **Chromium + Firefox + WebKit 3개 엔진 필수**로 강화

## v0.11.46 (2026-04-16)

### fix: admin-editor-viewport E2E 셀렉터 복원 + 빈 DB 회피

- `e2e/authenticated/admin-editor-viewport.spec.ts`: 기존 테스트가 `aria-label="편집"` / `[data-post-slug]` / `[data-portfolio-slug]` 3가지 셀렉터로 편집 진입을 시도했지만 해당 attribute들이 실제 `PostsPanel`/`PortfolioPanel` 마크업에 존재하지 않아 fallback까지 전부 실패 (CI `FoliumTeam/PortareFolium` 회귀). 실제 DOM 구조에 맞춰 `button:has-text('편집')`로 교체하고, Supabase test DB에 posts/portfolio가 없을 때는 `test.skip()`으로 graceful skip
- 원인: 테스트가 참조하던 `data-*` attribute와 `aria-label`은 코드베이스에 한 번도 존재한 적이 없었음. 과거 CI에서는 fallback까지 도달하기 전에 데이터가 존재해 `editBtn.click()` 경로로 우연히 통과했을 가능성이 높음. PR #32 빌드에서는 fallback에 도달 → timeout → 실패
- 수정: 실제 존재하는 마크업(`<button>` 내부 `<span>편집</span>`)을 기준으로 `button:has-text('편집')` 단일 셀렉터 사용. 데이터 없는 환경에서는 viewport overflow 검증 자체가 불가하므로 `test.skip()` 처리

## v0.11.45 (2026-04-16)

### refactor: Resume layout editor 코드 정리

- `src/components/admin/panels/ResumeLayoutEditor.tsx`: 로컬 `ensureAllKeys` 헬퍼 제거. `@/lib/resume-layout`의 `normalizeLayout()`을 재사용해 중복 정규화 로직 제거 (-14 lines)
- 동작 변화 없음. vitest 103/103 pass, `pnpm build` 성공

## v0.11.44 (2026-04-16)

### feat: Resume Layout Editor + ResumePanel 통합 + E2E (US-004, US-005, US-006, US-007)

- `src/components/admin/panels/ResumeLayoutEditor.tsx` 신규: 2-pane layout editor. left pane은 `ResumeClassicPreview`/`ResumeModernPreview`로 live preview, right pane은 13개 섹션 key의 drag + checkbox 토글 list
- `src/components/resume/ResumeClassicPreview.tsx`, `src/components/resume/ResumeModernPreview.tsx` 신규: layout editor 전용 sync preview. markdown 렌더링 + portfolio fetch 스킵 (client-side 렌더 가능하도록)
- `src/components/admin/panels/ResumePanel.tsx`:
    - `resume_section_layout` load/save 추가 (site_config upsert)
    - `layoutEditMode` toggle + 제목 옆 "레이아웃 편집" / "편집 종료" 버튼
    - 각 섹션 editor block을 `data-resume-section` wrapper div로 감싸 `layout.order`/`disabled` 반영 (CSS `order` + `display: none`)
    - careerPhases phases-only 조건부 wrapper 제거 → 일반 layout 섹션으로 편입
    - Theme selector 4개 → 2개 (classic/modern)로 축소
    - `useUnsavedWarning` 훅 연결로 beforeunload + route navigation 가드. `isLayoutDirty` 계산 + mode toggle off 시 `window.confirm`
- `e2e/authenticated/resume-layout-editor.spec.ts` 신규: 4개 E2E scenario (skills 비활성화, awards 활성화, work/projects 순서 swap, 일반 모드 disabled editor 미렌더링). afterEach에서 default layout 복구

## v0.11.43 (2026-04-16)

### feat: Resume theme 통합 + sectionLayout prop 연결 (US-002, US-003)

- `src/components/resume/ResumeMinimal.tsx`, `src/components/resume/ResumePhases.tsx` 삭제
- `src/components/resume/ResumeModern.tsx`: 구 Phases 구현을 base로 재작성. `sectionLayout?: ResumeSectionLayout` prop 추가, 하드코딩 섹션 순서 제거, `resolveSectionOrder()` 기반 렌더. volunteer/publications/interests/references 신규 generic renderer 추가. `data-pdf-block` + `data-pdf-block-item` attributes 유지
- `src/components/resume/ResumeClassic.tsx`: left sidebar (basics/contact/location/profiles) 유지, right-side 섹션만 `resolveSectionOrder()` 기반 렌더. `sectionLayout?: ResumeSectionLayout` prop 추가. 하드코딩 섹션 순서 제거
- `src/app/(frontend)/resume/page.tsx`: `site_config.resume_section_layout` fetch 추가, theme union `"classic" | "modern"`으로 narrow. 레거시 `"minimal"`/`"phases"` 값을 `"modern"`으로 coerce. DB에 row 없을 때 `DEFAULT_RESUME_LAYOUT` fallback

## v0.11.42 (2026-04-16)

### feat: Resume layout editor 데이터 모델 추가 (Phase A — 데이터 기반 작업)

- `src/lib/resume-layout.ts`: `ResumeSectionLayout` type, `DEFAULT_RESUME_LAYOUT`, `ALL_RESUME_SECTION_KEYS`, `normalizeLayout`, `resolveSectionOrder` 추가. 기본 활성 섹션: `coreCompetencies`, `work`, `projects`, `education`, `skills`. 비활성: `careerPhases`, `volunteer`, `awards`, `certificates`, `publications`, `languages`, `interests`, `references`
- `src/__tests__/resume-layout.test.ts`: 12개 unit test — default layout 구조, normalize 엣지 케이스, order/disabled 상호작용, empty entries 스킵 커버
- 후속 phase (theme 통합, editor UI, panel 통합, E2E)은 별도 commit으로 진행

## v0.11.41 (2026-04-16)

### fix: Admin PostsPanel 고정 header가 mobile과 tablet+에서 함께 스크롤되던 문제 수정

- `src/components/admin/AdminDashboard.tsx`: `posts` 탭 활성 시 `main`을 `overflow-hidden`으로 전환하고 내부 wrapper에 `h-full min-h-0 flex-col` 적용. `PostsPanel`이 자체 스크롤 컨테이너 높이를 안정적으로 받도록 조정
- `src/components/admin/panels/PostsPanel.tsx`: 목록 화면 root를 단일 `overflow-y-auto` 컨테이너로 고정하고 상단 title/filter 영역에 `sticky top-0` 적용. 기존 tablet 전용 내부 스크롤 영역 제거
- `src/components/admin/panels/PostsPanel.tsx`: sticky header의 `-mx-4` / `tablet:-mx-2` 폭 확장 보정을 제거해 mobile과 tablet+에서 발생하던 가로 스크롤 제거
- `src/components/admin/panels/PostsPanel.tsx`: 목록 화면을 `header 영역`과 `posts list 스크롤 영역`으로 분리. 세로 스크롤바가 패널 전체가 아니라 리스트 영역에만 표시되도록 조정
- `src/components/admin/panels/PostsPanel.tsx`: `전체 선택` 행을 리스트 스크롤 영역 밖의 고정 구간으로 이동. 포스트 row만 아래에서 스크롤되도록 조정
- `src/components/admin/AdminDashboard.tsx`: `portfolio` 탭에도 `h-full min-h-0` 높이 컨텍스트를 전달해 패널 내부 스크롤 레이아웃이 동작하도록 조정. 바깥 `main` 스크롤은 유지
- `src/components/admin/panels/PortfolioPanel.tsx`: tabs와 portfolio title/filter controls를 같은 상단 고정 블록으로 통합. portfolio list 영역은 그 아래 `overflow-y-auto`로 분리
- `src/components/admin/panels/BooksSubPanel.tsx`: title/filter controls를 상단 고정 구간으로 분리하고, books list만 내부 `overflow-y-auto`로 스크롤되도록 조정. edit 뷰도 새 높이 컨텍스트에 맞게 `h-full/min-h-0` 대응
- `src/components/admin/panels/PortfolioPanel.tsx`, `src/components/admin/panels/PostsPanel.tsx`: `BooksSubPanel`과 동일한 icon 기반 sort 버튼 UI로 정렬 controls 통일. 기존 dropdown 정렬 메뉴와 관련 state/import 제거
- `src/components/admin/panels/PostsPanel.tsx`: Published/Draft 상태 badge를 `PortfolioPanel`과 동일한 green/yellow 배경 스타일로 통일
- `src/components/admin/panels/TagsPanel.tsx`: sticky header의 음수 margin 제거, 상단 controls와 tag/category row를 wrap 가능한 구조로 조정해 horizontal scroll 제거
- `src/components/admin/panels/TagsPanel.tsx`: tab/new tag/sort controls를 하나의 상단 고정 블록으로 통합하고, 태그 목록만 내부 스크롤되도록 레이아웃 재구성. sort control도 icon-only 버튼으로 통일하고 왼쪽 정렬로 조정
- `src/components/admin/AdminDashboard.tsx`, `src/components/admin/panels/ResumePanel.tsx`: `resume` 탭도 내부 스크롤 컨텍스트를 사용하도록 조정. `ResumePanel`은 상단 title/save bar만 고정하고, 본문만 내부 `overflow-y-auto`로 스크롤되도록 재구성. 하단 중복 저장 버튼 제거
- `src/components/admin/panels/MigrationsPanel.tsx`: `max-w-3xl` 폭 제한 제거. `PostsPanel`/`PortfolioPanel`과 같은 패널 폭을 사용하도록 정렬
- `src/components/admin/AdminDashboard.tsx`, `src/components/admin/panels/MigrationsPanel.tsx`: `migrations` 탭도 내부 스크롤 컨텍스트를 사용하도록 조정. `MigrationsPanel`은 상단 header와 `최신 상태` 메시지를 하나의 고정 블록으로 묶고, migration section 목록만 내부 `overflow-y-auto`로 스크롤되도록 재구성
- `src/components/admin/AdminDashboard.tsx`, `src/components/admin/panels/SnapshotsPanel.tsx`: `snapshots` 탭도 내부 스크롤 컨텍스트를 사용하도록 조정. `SnapshotsPanel`은 `max-w-3xl` 폭 제한 제거 후, title~refresh controls를 하나의 상단 고정 블록으로 묶고 스냅샷 목록만 내부 `overflow-y-auto`로 스크롤되도록 재구성
- `src/components/admin/AdminDashboard.tsx`, `src/components/admin/panels/AgentTokensPanel.tsx`: `agent-tokens` 탭도 내부 스크롤 컨텍스트를 사용하도록 조정. `AgentTokensPanel`은 `ContentWrapper width="full"`로 폭 제한을 제거하고, title~refresh block을 상단 고정 영역으로 유지한 채 토큰 목록만 내부 `overflow-y-auto`로 스크롤되도록 재구성
- `src/components/admin/AdminDashboard.tsx`, `src/components/admin/panels/PromptLibraryPanel.tsx`: `prompts` 탭도 내부 스크롤 컨텍스트를 사용하도록 조정. `PromptLibraryPanel`은 `max-w-4xl` 폭 제한 제거 후, title+description을 하나의 상단 고정 블록으로 묶고 프롬프트 섹션만 내부 `overflow-y-auto`로 스크롤되도록 재구성
- `src/components/admin/panels/SiteConfigPanel.tsx`: horizontal scroll 원인은 sticky title에 사용한 `tablet:-mx-6` 음수 margin과 `Color Scheme` / `Job Field` 구간의 non-wrapping `flex` row 조합. 수정은 title sticky에서 음수 margin 제거, panel root에 `overflow-x-hidden` 추가, 관련 row를 `flex-wrap` 구조로 전환
- `src/components/admin/panels/AboutPanel.tsx`: root에 `tablet:h-full tablet:overflow-y-auto` 추가. tablet+ 에서는 About 패널 자체가 내부 스크롤 컨텍스트를 사용하도록 정렬
- `src/components/admin/RichMarkdownEditor.tsx`: non-fullscreen 에디터를 tablet+ 에선 `h-full + flex-col` 로 전환하고, scroll area에 `tablet:flex-1 tablet:overflow-y-auto` 적용. 모바일은 기존 page scroll 유지. Posts/Portfolio 편집 화면에서 에디터가 `main` 영역 높이에 맞춰 내부 스크롤되도록 조정
- `e2e/authenticated/admin-editor-viewport.spec.ts` 신규: laptop viewport에서 Posts/Portfolio 편집 화면 진입 시 `document.body.scrollHeight - window.innerHeight ≤ 2` 확인. 외곽 세로 스크롤 회귀 방지
- 결과: mobile 기본 viewport와 tablet+ viewport 모두에서 `PostsPanel` 상단 header는 고정되고, 포스트 목록만 그 아래에서 스크롤. Posts/Portfolio 편집 화면도 tablet+ 에서 에디터가 main 영역에 fit

## v0.11.40 (2026-04-15)

### docs: AGENTS.md Known Pitfalls 섹션에 MDX ↔ tiptap 상호작용 함정 3건 추가 + lib 트리 갱신

- `AGENTS.md` Project Structure → `lib/` 트리에 `tiptap-markdown.ts` (getCleanMarkdown, unescapeJsxBrackets helper) 추가
- `AGENTS.md` Known Pitfalls 섹션에 3 entries 추가:
    1. **JSX 속성값의 `[`/`]` backslash-escape (tiptap-markdown 잔재)** — v0.11.36+의 4-layer 방어 구조 (editor wrapper / converter / render-time / MCP save-time) 문서화. 새 진입 경로 추가 시 한 layer 이상 포함 필수
    2. **JSX 속성값의 `$` 가 inline math로 오인 (v0.11.39)** — `transformOutsideCodeBlocks` split 정규식의 self-closing JSX alternative 제거 금지 경고
    3. **MDX 렌더 에러 진단 (`renderMarkdown` catch)** — `[mdx-debug]` prefix 덤프 출력 설명, 향후 에러 재발 시 즉시 진단 가능하도록 참조
- 목적: v0.11.36~39의 MDX ↔ tiptap-markdown 상호작용 버그 체인이 숨은 코드 불변식(self-closing JSX 보호, 4-layer escape 방어)으로 정착된 상태를 docs로 명시화 → 향후 같은 함정에 빠지는 것 원천 차단

## v0.11.39 (2026-04-15)

### fix: JSX 태그 안의 `$` 가 inline math로 오인되어 뒷부분 `{}`가 escape되던 MDX 렌더 에러 해결

- `src/lib/mdx-directive-converter.ts` `transformOutsideCodeBlocks`: split 정규식에 **self-closing JSX 태그 (`<Tag ... />`) 보호 패턴 추가**. 코드 블록·math와 함께 해당 구간을 atomic하게 보존.
- **버그 체인**:
    1. ColoredTable 속성값에 `"$0"`, `"$0.01/GB"` 등 `$` 포함 문자열이 있음
    2. `transformOutsideCodeBlocks`의 `$(?!\$)[^\n$]+?\$` 정규식이 이 구간을 inline math로 잘못 매칭해 줄을 쪼갬
    3. 쪼개진 끝부분(예: `0.01/GB","..."]]'} columnHeadColors={'...'} />`)은 선행 `<Tag` 토큰이 없어 `escapeStrayCurlyBraces`의 JSX 라인 감지(`/<\w+[\s/>]/`)에 걸리지 않음
    4. 결과: JSX 표현식 경계 `{`, `}` 가 `\{`, `\}` 로 escape 되어 저장됨
    5. 이후 acorn이 parser 상태 혼란에 빠져 "Expecting Unicode escape sequence \\uXXXX" 발생
- 테스트: `transformOutsideCodeBlocks JSX 태그 보호` describe 3 cases 추가 (JSX 안의 `$`, 태그 밖의 math, 태그 뒤의 prose transform). 총 91 tests pass.

## v0.11.38 (2026-04-15)

### chore: MDX 렌더 에러 진단 로깅 추가 (임시)

- `src/lib/markdown.tsx`: `renderMarkdown()` catch 블록에 에러 위치 주변 content dump 추가 — line±40 substring (JSON-stringify), col±10 codepoint hex dump, `cause.pos`±60 global substring, `cause.raisedAt` 위치. 성공 path는 무영향.
- 목적: "Expecting Unicode escape sequence \\uXXXX" acorn 에러의 실제 위치 content를 파악하기 위함. 원인 확정 후 롤백 예정.

## v0.11.37 (2026-04-15)

### fix: JSX 속성 `\[ \]` escape 방어 — render-time + MCP save-time layer 추가

- `src/lib/markdown.tsx`: `renderMarkdown()` 진입부에 `unescapeJsxBrackets(content)` 추가. DB에 이미 오염된 content도 프론트엔드 render 시점에 자동 정리. `unstable_cache`로 감싸져 있어 cache hit 시 regex 스킵.
- `src/lib/mcp-tools.ts`: `sanitizeContentField(fields)` helper 추가. `handleCreatePost` / `handleUpdatePost` / `handleCreatePortfolioItem` / `handleUpdatePortfolioItem` 4개 핸들러의 insert/update payload에 적용 — MCP 에이전트가 직접 호출해도 DB에 오염된 content 유입 차단.
- **목적**: v0.11.36의 editor-path patch는 admin editor 경로만 커버. MCP 직접 호출 / psql 수동 UPDATE / snapshot 복원 등 예외 경로에도 방어 layer 추가해 **defense-in-depth** 완성.
- **DB 부담**: 0 (CPU-only regex, 기존 쿼리에 추가 I/O 없음). cache hit이면 render 경로도 스킵.
- 타입체크 + 기존 88 tests 모두 통과.

## v0.11.36 (2026-04-15)

### fix: tiptap-markdown의 JSX 속성 `\[ \]` escape 원천 차단 (acorn parse error 해결)

- `src/lib/tiptap-markdown.ts` 신규 — `getCleanMarkdown(editor)` + `unescapeJsxBrackets(md)` helper. tiptap-markdown serializer가 JSX 속성값 내부 `[`, `]`를 link 문법 충돌 회피용으로 `\[`, `\]` 이스케이프하는 것을 대문자로 시작하는 JSX tag 범위에 한해 선별 복원.
- `src/components/admin/RichMarkdownEditor.tsx`: 3개 `getMarkdown()` 호출 지점(enterSourceMode, onUpdate, localStorage autosave) → `getCleanMarkdown()` 로 교체.
- `src/components/admin/EditorStatePreservation.tsx`: auto-save + Bookmark 2개 지점 → `getCleanMarkdown()` 로 교체.
- `src/lib/mdx-directive-converter.ts`: `jsxToDirective()` + `directiveToJsx()` 양 방향의 ColoredTable attribute 값 unescape 체인에 `val.replace(/\\([\[\]])/g, "$1")` 추가 — 이중 safety net. 기존 DB에 이미 섞인 `\[`/`\]`도 render/load 시 자동 정리.
- **원인**: tiptap-markdown이 Tiptap 상태를 markdown으로 직렬화할 때 JSX 속성의 `{'...'}` 내부 문자열도 일반 prose로 취급해 `[`, `]`를 이스케이프. MDX 3 acorn JSX expression 파서가 이를 거부하면서 "Could not parse expression with acorn" 에러 발생.
- **효과**: WYSIWYG/Source 모드 전환, onUpdate, auto-save 전 경로에서 JSX tag 내부 backslash escape 유입 차단. 기존 오염 DB는 converter layer에서 투명하게 정리.
- 테스트: `src/__tests__/tiptap-markdown.test.ts` 신규 (4 cases), `mdx-directive-converter.test.ts` backslash unescape 2 cases 추가. 총 88 tests pass.

## v0.11.35 (2026-04-15)

### docs: 커밋 타입 분류표 + 선택 가이드를 AGENTS.md & ship.md에 통합

- `AGENTS.md`: 신규 **Commit Conventions** 섹션 추가 — 형식, 제목 규칙, 9개 type 분류표(`feat`/`fix`/`docs`/`style`/`refactor`/`perf`/`test`/`chore`/`revert`) + 사용 예 + 타입 선택 가이드, commit grouping, path quoting, no Co-Authored-By 룰을 한 자리에 정리
- `.claude/commands/ship.md`: rule 2의 단순 type 나열을 동일한 9개 type 분류표(설명 + 사용 예) + 타입 선택 가이드로 확장 — bug+test 한 commit이면 `fix`, refactor 중 사소한 bug 함께 고치면 `fix`, agent 동작에 영향 주는 메타-문서는 `chore`

## v0.11.34 (2026-04-15)

### docs: AGENTS.md + ship/docs skills 보강 + PR template 추가

- `AGENTS.md`:
    - Chat 섹션에 **English Input Handling** rule 추가 — 영어 입력 시 한국어 답변 + 끝에 `> Corrected English: "..."` 첨부
    - Coding Rules에 **TypeScript** (`any` 금지, `type` > `interface`, `@/*` 별칭) + **React/Next.js** (`const` 함수형 컴포넌트, Server Component 기본, Next.js 16 `params` Promise) 명문화
    - **File Naming** 신규 섹션 — Components PascalCase, hooks camelCase, lib kebab-case, types lowercase, App Router는 Next.js 규칙
    - **Branch Strategy** 신규 섹션 — trunk-based hybrid (작은 변경 main 직접 push, 3+ commits 또는 ≥3 도메인 영역 변경 시 `feature/*` 브랜치)
    - **PR Conventions** 신규 섹션 — 제목 형식 `<source> → <target>: <설명>`, template 위치, Claude 협력 문구 금지
- `.claude/commands/ship.md`:
    - commit format에 `(v<version>)` suffix 명시
    - title rules 추가 (명령형 현재 시제, 첫 글자 소문자, 끝 punctuation 없음, 한글)
    - **commit grouping** rule 추가 — 무관한 변경 묶음 금지
    - **path quoting** rule 추가 — `(frontend)`, `[slug]` 등은 반드시 `""` 인용
- `.claude/commands/docs.md`:
    - CHANGES.md를 single source of truth로 명시 — daily log 파일 생성 금지
- `.github/PULL_REQUEST_TEMPLATE.md` 신규 — `gh pr create` 자동 적용. Summary / Changes(기능/스타일/기타) / Test plan checklist / Screenshots / Notes 구조

## v0.11.33 (2026-04-15)

### fix: blog-views E2E placeholder 한국어 동기화

- `e2e/blog-views.spec.ts`: `Blog search` describe의 selector 2건을 `'input[placeholder="Search posts..."]:visible'` → `'input[placeholder="블로그 포스트 검색..."]:visible'`로 업데이트 (line 46, 54)
- **원인**: `d9a7654 (v0.11.16)`에서 `BlogPage.tsx` search input placeholder를 한국어로 변경했으나 E2E 테스트가 함께 동기화되지 않아 CI에서 element-not-found timeout 발생 (3회 retry 모두 실패)
- **수정 범위**: 테스트만, 애플리케이션 코드 미변경

## v0.11.32 (2026-04-15)

### chore: `/release` slash command 추가 — minor bump + tag push 자동화

- `.claude/commands/release.md` 신규 — 단계별 절차 정의:
    1. `package.json` 버전 읽고 patch != 0이면 다음 minor로 bump (`0.11.37` → `0.12.0`), patch == 0이면 그대로
    2. `main` 브랜치 + clean working tree + remote sync 확인
    3. 버전 bump가 필요하면 `package.json` + `docs/CHANGES.md` 업데이트 후 `release: v<target>` commit + push
    4. annotated tag `v<target>` 생성 후 push → `release.yml` workflow 자동 발화
    5. `gh run list` / `gh release view`로 검증
- 기존 태그 존재 시 abort, 비-main 브랜치 abort 등 안전 가드 포함

## v0.11.31 (2026-04-15)

### chore: Release workflow + fork owner 이메일 알림 안내 추가

- `.github/workflows/release.yml` 신규 — `v*.*.0` 태그 push 트리거. `docs/CHANGES.md`에서 해당 버전 섹션을 awk로 추출해 release body로 사용 (없으면 fallback). `softprops/action-gh-release@v2`로 GitHub Release 생성, `generate_release_notes: true`로 commit 목록 자동 첨부
- `README.md`: "방법 A" 섹션에 "새 버전 알림 받기 (이메일)" 서브섹션 추가 — Watch → Custom → Releases 안내
- **운영 정책**: patch bump는 release 없이 누적, minor bump (`v0.x.0`) 시점에 수동 태그 push로 release 발행. fork owner는 노이즈 없이 의미 있는 update만 수신

## v0.11.30 (2026-04-15)

### fix: 우측 TOC 비활성 시 slug 페이지 좌측 쏠림 — article max-width 조건부 적용

- `src/app/(frontend)/portfolio/[slug]/page.tsx`: `hasRightToc = tocEntries.length > 0` 계산. article className에 `max-w-3xl`을 `hasRightToc`일 때만 적용
- `src/app/(frontend)/blog/[slug]/page.tsx`: `hasRightToc = (tocStyle === "hover" || tocStyle === "both") && tocEntries.length > 0` 계산. 동일하게 `max-w-3xl` 조건부 적용
- **원인**: flex 컨테이너에 article(`max-w-3xl flex-1`) + `TableOfContents`(`w-52`) 구조에서 TOC가 렌더되지 않으면 article이 768px 상한에 막혀 우측이 비고 좌측 쏠림 발생
- **효과**: 우측 TOC OFF 시 article이 부모 ContentWrapper(`laptop:max-w-6xl`) 폭까지 stretch — 헤더/푸터와 동일한 최대 폭

## v0.11.29 (2026-04-15)

### feat: Portfolio PDF export에 Books 섹션 포함 여부 toggle 추가

- `src/components/PdfPreviewModal.tsx`: `sections` prop 추가 — key/label/defaultIncluded 구조. 사이드바에 체크박스 toggle 렌더링, 제외 시 `[data-pdf-section="<key>"]` 요소 clone에서 제거. toggle 변경 시 pagination 재실행
- `src/components/PdfExportButton.tsx`: `sections` prop pass-through 추가
- `src/app/(frontend)/portfolio/page.tsx`: Books divider + section을 `<div data-pdf-section="books">`로 wrap, `PdfExportButton`에 `sections=[{ key: "books", label: "Books 섹션 포함", defaultIncluded: false }]` 전달
- **기본값**: Books 섹션은 PDF에서 기본 제외 (toggle로 포함 가능)

## v0.11.28 (2026-04-15)

### feat: GithubToc 아코디언 icon animation + portfolio slug 페이지 적용

- `src/components/GithubToc.tsx`: 기존 `▶` 텍스트 문자 → SVG 화살표 교체 (Accordion 컴포넌트와 동일 디자인). `.github-toc-arrow` 클래스 기반으로 CSS 제어
- `src/styles/global.css`: `.github-toc-arrow` smooth rotation (0° → 90°) CSS 추가, default marker 제거. Accordion과 동일 패턴
- `src/app/(frontend)/portfolio/[slug]/page.tsx`: `GithubToc` import + 콘텐츠 상단에 렌더링 (tocEntries가 있을 때)
- **효과**: blog + portfolio slug 페이지 모두에서 동일한 아코디언 아이콘 애니메이션으로 TOC 표시

## v0.11.27 (2026-04-15)

### feat: Accordion (collapsible block) markdown 기능

- `src/extensions/AccordionNode.tsx` 신규 — Tiptap Node with React NodeView, `content: "block+"` (inner markdown 편집 가능), title inline 편집 + 화살표 토글
- `src/lib/mdx-directive-converter.ts`: `<Accordion>` JSX ↔ `:::accordion[]` directive 양방향 변환 추가
- `src/lib/markdown.tsx`: Frontend `Accordion` component 추가 — 네이티브 `<details>`/`<summary>` 사용 (JS 불필요), components 맵 등록
- `src/styles/global.css`: `.accordion-block` 스타일 + arrow 90° rotation (`details[open]` 기반 CSS only)
- `src/components/admin/RichMarkdownEditor.tsx`: `AccordionNode` extension 등록 + `accordionDirectiveToHtml` preprocessor 추가
- `src/components/admin/EditorToolbar.tsx`: Media group에 `AccordionInsert` 버튼 추가
- `src/__tests__/mdx-directive-converter.test.ts`: Accordion 변환 3개 test 추가

**DB 저장 형식**: `<Accordion title="X">\n\n...markdown...\n\n</Accordion>`
**Editor source mode**: `:::accordion[X]\n...\n:::`
**Frontend**: 네이티브 `<details>` — keyboard/screen reader 접근성 자동 지원

## v0.11.26 (2026-04-14)

### fix: EditorToolbar undo/redo 영구 disabled + fullscreen dropdown z-index

- `src/components/tiptap-ui/undo-redo-button/use-undo-redo.ts`: `canExecute`를 plain const → `useState` reactive state로 변경, `transaction` handler에서 갱신. 기존 중복 `canExecuteUndoRedoAction()` guard 제거
- `src/components/tiptap-ui/undo-redo-button/undo-redo-button.tsx`: `onMouseDown={e => e.preventDefault()}` 추가 (editor blur 방지)
- `heading-button.tsx`, `list-button.tsx`, `blockquote-button.tsx`, `code-block-button.tsx`, `mark-button.tsx`, `text-align-button.tsx`: 동일 `onMouseDown` blur 방지 추가
- `dropdown-menu.scss`, `popover.scss`: `z-index: 50` → `200` (fullscreen overlay `z-100` 뒤로 숨김 방지)

## v0.11.25 (2026-04-14)

### perf: Supabase egress 절감 — auth.getUser→getSession, content 컬럼 제거, 프로필 이미지 cache

- `src/components/UserMenu.tsx`: `auth.getUser()` → `auth.getSession()` (network 호출 제거), 프로필 이미지 `sessionStorage` cache 추가
- `src/components/BlogPage.tsx`: `auth.getUser()` → `auth.getSession()`, auth 대기 중 렌더 차단(spinner) 제거
- `src/components/PdfExportButton.tsx`: `auth.getUser()` → `auth.getSession()` (network 호출 제거)
- `src/app/(frontend)/blog/page.tsx`: 목록 쿼리에서 `content` 컬럼 제거 — fallback thumbnail/description 불필요
- `src/app/(frontend)/page.tsx`: 홈 최신글 쿼리에서 `content` 컬럼 제거
- **효과**: 모든 방문자의 auth API 호출 제거, blog/home revalidation payload 대폭 감소

## v0.11.24 (2026-04-14)

### perf: AboutView SSR 전환 — browserClient fetch 제거

- `src/components/AboutView.tsx`: `"use client"` 제거, `useEffect`/`useState`/`browserClient` 의존 제거 → Server Component로 전환. `data`/`profileImage` props 수신
- `src/app/(frontend)/about/page.tsx`: `serverClient`로 `about_data` + `resume_data` 서버 사이드 fetch 추가. `revalidate = false` (ISR 정적 생성)
- **효과**: `/about` 방문 시 `browserClient` 2회 API 호출(cached egress) 완전 제거

## v0.11.23 (2026-04-14)

### refactor: ColoredTable 기본 색상 — slate 고정 → 테마 상대 색상

- `src/lib/markdown.tsx`: `columnHeadColors` 미지정 시 `data-ct-color` 속성 생략 (기존 `"slate"` 기본값 제거)
- `src/styles/global.css`: `:not([data-ct-color])` fallback — 헤더 `var(--color-surface-subtle)`, 바디 `color-mix(40% surface-subtle, surface)` 적용. color scheme/dark mode에 자동 반응
- `src/components/admin/EditorToolbar.tsx`: slate 프리셋 복원, `SLATE_HEX` 상수 제거, clear 버튼 → light/dark 그라디언트로 "테마 자동" 표시
- `src/extensions/ColoredTableNode.tsx`: 에디터 프리뷰 미지정 컬럼 → `var(--color-surface-subtle)` 기본 배경

## v0.11.22 (2026-04-14)

### fix: ColoredTable 프론트엔드 색상 렌더링 복구 — CSS custom property → data attribute 방식

**문제**: ColoredTable 헤더/바디 색상이 프론트엔드에서 표시되지 않음

**원인**:

1. 중간 리팩터링에서 `backgroundColor` 직접 인라인 스타일을 CSS custom property (`--pt-head-bg`) 방식으로 교체했으나, cascade 우선순위 문제로 색상이 적용되지 않음
2. `deriveColorHex` 제거 시 shade 접미사 정규화(`.replace(/-\d+$/, "")`)가 누락되어, 기존 저장된 `"green-400"` 같은 값이 CSS 규칙의 `"green"`과 불일치

**수정**:

- `src/lib/markdown.tsx`: CSS variable 인라인 스타일 → `data-ct-color={colorName}` HTML attribute로 교체. `deriveColorHex` 함수 및 `tailwindToHex` import 제거. `resolvedColors`에 shade 접미사 제거 로직 추가
- `src/styles/global.css`: `var(--pt-head-bg)` 기반 4개 규칙 → `[data-ct-color="X"]` attribute selector 기반 32개 정적 규칙으로 교체 (8색 × light/dark × header/body). fallback selector도 `.pt-head-col`/`.pt-body-col` 클래스 → `[data-ct-color]` attribute로 변경

**결과**: SSR(`renderToString`) 호환, dark mode는 `html.dark` CSS로 처리 (client-side `ColoredTableColorSync` 불필요)

## v0.11.21 (2026-04-14)

### refactor: coreCompetencies DB 저장 위치 변경 — about_data → resume_data

- `src/types/resume.ts`: Resume 인터페이스에 `coreCompetencies` 필드 추가
- `src/app/(frontend)/resume/page.tsx`: about_data 조회 제거, resumeData에서 직접 coreCompetencies 읽기
- `src/components/admin/panels/ResumePanel.tsx`: coreCompetencies를 resumeData 상태에 통합, 별도 저장 버튼 제거
- `src/components/admin/panels/AboutPanel.tsx`: coreCompetencies pass-through 제거
- `src/lib/migrations.ts`: v0.11.21 마이그레이션 — about_data → resume_data JSONB 이동
- `supabase/setup.sql` + `migration-whole.sql`: 버전 0.11.21 동기화

## v0.11.20 (2026-04-14)

### refactor: 핵심역량 편집 UI — AboutPanel → ResumePanel 이동 + DB 키 마이그레이션

- `src/components/admin/panels/ResumePanel.tsx`: Core Competencies 편집 UI 추가 — `about_data` 독립 저장
- `src/components/admin/panels/AboutPanel.tsx`: Core Competencies UI 섹션 제거 (데이터 pass-through 저장 유지)
- `src/lib/migrations.ts`: v0.11.20 마이그레이션 추가 — `about_data.data.coreValues` → `coreCompetencies` 키 이름 변경
- `supabase/setup.sql`: `db_schema_version` → `"0.11.20"` 업데이트
- `supabase/migration-whole.sql`: `coreValues` → `coreCompetencies` 시드 키 변경 + JSONB 키 이름 변경 마이그레이션 추가 + 버전 업데이트

## v0.11.19 (2026-04-14)

### feat: 이력서 핵심역량 section — Admin `coreCompetencies` 데이터 연동

- `src/app/(frontend)/resume/page.tsx`: `about_data` 조회 추가, `coreCompetencies` 추출 후 4개 resume 컴포넌트에 prop으로 전달
- `src/components/resume/ResumePhases.tsx`: 하드코딩 placeholder 제거, `coreCompetencies` prop 받아 실제 데이터 렌더링 (비어있으면 section 숨김)
- `src/components/resume/ResumeClassic.tsx`: 핵심역량 section 추가
- `src/components/resume/ResumeModern.tsx`: 핵심역량 section 추가
- `src/components/resume/ResumeMinimal.tsx`: 핵심역량 section 추가
- `src/components/admin/panels/AboutPanel.tsx`: "Core Values" → "Core Competencies", 각 항목 "Value N" → "역량 N" 으로 변경

## v0.11.18 (2026-04-14)

### Fix: 일반 table overflow 방지

- `src/styles/global.css`: `.post-content.prose` / `.portfolio-markdoc-body.prose` 내 일반 table에 `display: block; overflow-x: auto` 적용 — 넓은 테이블에 horizontal scroll 추가. ColoredTable은 자체 wrapper 사용으로 영향 없음

## v0.11.17 (2026-04-14)

### Feat: SEO — robots.txt + sitemap.xml + 검색 엔진 인증

- `src/app/robots.ts`: 신규 — robots.txt 생성 (`/admin`, `/api` 차단)
- `src/app/sitemap.ts`: 신규 — 동적 sitemap (정적 페이지 + published blog/portfolio)
- `src/app/layout.tsx`: Google/NAVER 검색 엔진 인증 메타태그 추가 (env var 기반 — `NEXT_PUBLIC_GOOGLE_VERIFICATION`, `NEXT_PUBLIC_NAVER_VERIFICATION`)
- 모든 URL은 `NEXT_PUBLIC_SITE_URL` env var 기반 (fallback: `VERCEL_URL` → `localhost:3000`)

## v0.11.16 (2026-04-14)

### UI: Blog 디자인 개선 + sticky header + loading spinner

- `src/components/BlogPage.tsx`: dev-only `showWritePost` prop → 클라이언트 인증 기반 `showManagePost`로 전환, block/list view 카드 레이아웃 재구성, category badge 스타일 개선, grid `desktop:grid-cols-3`, loading spinner 추가, mobile/desktop header `sticky top-20` 고정 + `before:` pseudo-element gap 배경 채움
- `src/app/(frontend)/blog/page.tsx`: `showWritePost` prop 제거
- `src/app/(frontend)/page.tsx`: dev 전용 도구 섹션 제거
- `src/components/ContentWrapper.tsx`: `w-full` 추가

## v0.11.14 (2026-04-14)

### UI: GlobalSearch loading spinner 추가

- `src/components/GlobalSearch.tsx`: "Searching..." 텍스트 앞에 spinning SVG icon 추가

## v0.11.12 (2026-04-14)

### Test: Blog view toggle + search + pagination E2E 검증

- `e2e/blog-views.spec.ts`: 신규 — 6개 테스트 (toggle 버튼 존재, block/list 전환, search input, 검색 필터링, pagination 조건부 표시)

## v0.11.11 (2026-04-14)

### Feat: Header global search — posts + portfolio title 검색

- `src/components/GlobalSearch.tsx`: 신규 — header 내 global search 컴포넌트 (debounce 200ms, ESC/외부 클릭 닫기, Posts/Portfolio 카테고리별 결과)
- `src/components/Header.tsx`: GlobalSearch 추가 + `jobField` prop
- `src/app/(frontend)/layout.tsx`: `site_config.job_field` fetch → Header prop 전달

## v0.11.10 (2026-04-14)

### Feat: Blog pagination

- `src/components/BlogPage.tsx`: pagination 추가 — 12 posts/page (3×4 block mode), 필터/검색 변경 시 page 1 리셋, `< 1 2 3 ... >` 네비게이션 UI

## v0.11.9 (2026-04-14)

### Feat: Blog 페이지 검색 input

- `src/components/BlogPage.tsx`: search input 추가 (desktop + mobile) — 카테고리/태그 필터 결과 내에서 title 검색, `searchedPosts` memo 기반 필터링

## v0.11.8 (2026-04-14)

### Feat: Blog block view + list/block toggle

- `src/components/BlogPage.tsx`: block view grid 카드 추가 (Rust devlog 레퍼런스) — 3열 반응형 grid, 대형 thumbnail, 날짜+카테고리 badge, title, description (line-clamp-3)
- `src/components/BlogPage.tsx`: list/block view toggle 버튼 추가 (desktop + mobile) — localStorage로 선호 모드 저장

## v0.11.7 (2026-04-14)

### Feat: krrpinfo CSS 구현 이전 + scroll-reveal 제거

- `src/styles/global.css`: exclusive-range breakpoints 추가 (`--mobile-only`, `--tablet-only`, `--laptop-only`, `--not-desktop`)
- `src/styles/global.css`: `no-focus` utility 추가 (focus ring 완전 제거)
- `src/styles/global.css`: accordion animation keyframes 추가 (Radix UI expand/collapse)
- `src/styles/global.css`: Shiki code block line numbering CSS 추가 (CSS counter 기반)
- `src/styles/global.css`: scroll-reveal CSS 전체 제거
- `src/styles/fonts/`: Pretendard Variable 로컬 dynamic subset (CDN → 로컬 woff2)
- `src/components/ScrollRevealInit.tsx`: 삭제
- `src/app/(frontend)/layout.tsx`: ScrollRevealInit import 제거
- `src/app/(frontend)/page.tsx`, `blog/page.tsx`, `portfolio/page.tsx`, `src/components/AboutView.tsx`: `scroll-reveal` 클래스 제거

## v0.11.6 (2026-04-13)

### Feat: frontend footer 추가

- `src/components/Footer.tsx`: 저작권 (동적 연도 + DB site_name) + GitHub 아이콘 버튼
- `src/app/(frontend)/layout.tsx`: flex column 레이아웃 + Footer 배치 (스크롤 최하단에 표시)

## v0.11.5 (2026-04-13)

### Feat: React Compiler 활성화

- `next.config.ts`: `reactCompiler: true` 추가
- `babel-plugin-react-compiler` devDependency 설치
- `useMemo`/`useCallback`/`React.memo` 자동 최적화 활성화

## v0.11.4 (2026-04-13)

### Feat: 서버 시작 시 DB 마이그레이션 자동 실행

- `src/instrumentation.ts`: Next.js instrumentation hook — 서버 시작 시 `autoMigrate` 호출
- `src/lib/auto-migrate.ts`: pending 마이그레이션 자동 감지 및 순차 실행 (기존 `run-migrations` API 로직 재사용)
- Admin 마이그레이션 패널은 수동 fallback으로 유지

## v0.11.3 (2026-04-12)

### Docs: SEO 설정 가이드 추가

- `docs/SEO.md`: Google Search Console + NAVER Search Advisor 등록 가이드 — robots.txt, sitemap.xml 코드, 소유권 확인, 사이트맵 제출, Open Graph 메타데이터 확인, 환경 변수 요약, 체크리스트

## v0.11.2 (2026-04-12)

### Feat: 수동 체크리스트 E2E 자동화 — PDF grid 검증 + 콘텐츠 렌더링

- `e2e/authenticated/pdf-export.spec.ts`: 프로젝트 카드 grid 2열 레이아웃 유지 검증 테스트 추가 (7 테스트)
- `e2e/content-rendering.spec.ts`: 블로그 콘텐츠 렌더링 5개 테스트 — Shiki 코드 블록, 이미지 lazy loading, 목차 (TOC), Mermaid 다이어그램, KaTeX 수식
- `docs/TEST.md`: 자동화된 항목을 수동 체크리스트에서 제거, E2E 목록에 새 테스트 문서화

## v0.11.1 (2026-04-11)

### Feat: 인증 필요 E2E 테스트 — PDF Export 프리뷰 검증

- `e2e/auth.setup.ts`: Supabase 로그인 + `storageState` 저장 (`.auth/user.json`)
- `e2e/authenticated/pdf-export.spec.ts`: Resume/Portfolio PDF export 6개 테스트
    - PDF 내보내기 버튼 표시 (인증 상태)
    - 프리뷰 모달 열림 + 사이드바 UI (Color Scheme, Pages, 다운로드 버튼)
    - 페이지 구분선 (dashed line) 존재 확인
    - 컬러 스킴 변경 시 페이지 수 유지 확인
    - ESC 키로 모달 닫기
    - Portfolio 페이지 PDF export
- `playwright.config.ts`: `setup` project + `authenticated-*` projects 추가 (Chromium/Firefox/WebKit)
- `.gitignore`: `.auth/` 디렉토리 제외
- `.github/workflows/e2e.yml`: `E2E_EMAIL`, `E2E_PASSWORD` secrets 추가
- `dotenv` dev dependency 추가 (`.env.local` 로드)

## v0.11.0 (2026-04-11)

### Feat: Playwright E2E 테스트 인프라 + GitHub Actions CI

- Playwright 설치 (Chromium, Firefox, WebKit + mobile viewport)
- `playwright.config.ts`: 5개 프로젝트 (desktop 3 + mobile 2), dev 서버 자동 기동
- `e2e/smoke.spec.ts`: 주요 페이지 로딩 + 404 검증
- `e2e/navigation.spec.ts`: 헤더 네비게이션 + 페이지 이동
- `e2e/theme.spec.ts`: 다크/라이트 모드 토글
- `e2e/responsive.spec.ts`: mobile/tablet/desktop 수평 overflow 검증
- `e2e/seo.spec.ts`: 메타데이터 + 접근성 기본 검증 (alt, lang, viewport)
- `package.json`: `test:e2e`, `test:e2e:ui`, `test:e2e:chromium` 스크립트 추가
- `.gitignore`: Playwright 산출물 제외
- `.github/workflows/e2e.yml`: push(`main`/`test`)/PR(`main`) 시 크로스 브라우저 E2E 자동 실행 — Chromium/Firefox/WebKit 병렬 매트릭스, Vitest + Playwright 순차 실행, 실패 시 playwright-report artifact 7일 보존

### Chore: 불필요한 구조 검증 테스트 정리 (142→79개)

- `color-schemes.test.ts` 삭제 (TypeScript 타입이 이미 보장하는 구조 검증)
- `mermaid-themes.test.ts` 축소 (fallback 동작 테스트만 유지)
- `tailwind-colors.test.ts` 축소 (경계값 + edge case만 유지)
- `tiptap-utils.test.ts` 축소 (보안 관련 + 대표 케이스만 유지)

## v0.10.28 (2026-04-11)

### Feat: PDF export 페이지 분할 개선 — block-aware pagination

**배경**: 기존 PDF 내보내기는 `html2canvas`로 전체 콘텐츠를 하나의 이미지로 캡처한 뒤 A4 고정 높이로 슬라이싱했음. DOM 구조를 전혀 인식하지 못해서 섹션·카드·항목이 페이지 경계에서 중간에 잘리는 문제 발생.

**해결 — Block-Aware Spacing Injection**:

1. 모든 Resume 레이아웃(4종) + Portfolio 컴포넌트에 `data-pdf-block` / `data-pdf-block-item` attribute 부여
2. `PdfPreviewModal.tsx`에 `paginateBlocks()` 함수 추가:
    - 클론된 DOM에서 `[data-pdf-block]` / `[data-pdf-block-item]` 요소의 높이 측정
    - 페이지 경계를 넘는 블록 앞에 투명 spacer div 삽입 → 블록이 다음 페이지로 통째로 이동
    - A4 한 페이지보다 큰 블록은 graceful degradation (슬라이싱 허용)
    - `data-pdf-block-item` (grid 카드)은 행(row) 단위로 처리: 같은 `offsetTop`의 아이템을 그룹화하고, spacer에 `grid-column: 1 / -1`을 적용하여 전체 행을 다음 페이지로 이동 → grid 레이아웃 보존
    - 부모 블록이 자식 블록을 포함하면 자동 제외 (자식이 개별 pagination 처리)
3. 프리뷰에 페이지 구분선 overlay 추가 (dashed line + 페이지 번호, `previewRef` 외부에 absolute-positioned → html2canvas에 캡처되지 않음)
4. 사이드바에 총 페이지 수 표시

**주요 버그 수정 3건**:

1. **부모-자식 블록 충돌**: 부모 `data-pdf-block`이 A4보다 크면 graceful degradation으로 `currentPageBottom`을 섹션 끝까지 밀어버려 자식 블록에 spacer가 삽입되지 않음 → **수정**: 자식에 `[data-pdf-block]` 또는 `[data-pdf-block-item]`이 있는 부모는 pagination 대상에서 자동 제외

2. **grid 단일 열 강제 과잉 적용**: 모든 multi-column grid를 `1fr`로 강제하여 전체 프리뷰가 모바일 뷰로 렌더링 → **수정**: grid 강제를 완전 제거하고 `data-pdf-block-item` 행(row) 단위 pagination으로 대체. spacer에 `grid-column: 1 / -1` 적용하여 grid 레이아웃 보존

3. **페이지 구분선 overlay 콘텐츠 가림**: `h-4 bg-zinc-800` 간격이 dashed line 아래에 위치하여 다음 페이지 콘텐츠 상단 16px을 가림 → **수정**: 간격을 dashed line 위쪽(이전 페이지 spacer 영역)으로 이동, overlay top 위치를 `-16px` 보정

**변경 파일**:

- `src/components/PdfPreviewModal.tsx`: 전면 재작성 — `paginateBlocks()`, `createSpacer()`, overlay UI, 페이지 수 표시
- `src/components/resume/ResumeModern.tsx`: header, work section, work entries, education section, education entries, generic sections에 `data-pdf-block`
- `src/components/resume/ResumeClassic.tsx`: skills, work, education, generic sections에 `data-pdf-block`
- `src/components/resume/ResumeMinimal.tsx`: header, summary, work, skills, education, generic sections에 `data-pdf-block`
- `src/components/resume/ResumePhases.tsx`: header, 핵심역량, 웹 경력, 학력, 언어, 수상, 자격증에 `data-pdf-block`
- `src/components/resume/CareerPhasesSection.tsx`: 외부 section에 `data-pdf-block` (atomic)
- `src/components/resume/SkillsSection.tsx`: 외부 section에 `data-pdf-block` (atomic)
- `src/components/resume/ProjectsSection.tsx`: section에 `data-pdf-block`, 개별 카드에 `data-pdf-block-item`
- `src/components/PortfolioView.tsx`: 각 article에 `data-pdf-block`
- `src/app/(frontend)/portfolio/page.tsx`: Books section + 개별 book 카드에 `data-pdf-block`

## v0.10.27 (2026-04-09)

### Feat/Fix: 어드민 헤더 단축키 상시 표시 + 커맨드 팔레트 outline 제거

- `src/components/admin/AdminHeader.tsx`: ⌘K 단축키를 Tooltip 대신 kbd 배지로 검색 아이콘 우측에 상시 표시
- `src/components/ui/command.tsx`: CommandInput에 `style={{ outline: "none" }}` 추가 — globals.css `:focus-visible` 전역 규칙에 의한 outline 제거

### Test: 유틸리티 라이브러리 테스트 추가

- `src/__tests__/tiptap-utils.test.ts`: formatShortcutKey/isValidPosition/clamp/isAllowedUri/sanitizeUrl 검증 (27개 케이스)
- `src/__tests__/tailwind-colors.test.ts`: tailwindToHex/isLightBackground 검증 (20개 케이스)
- `src/__tests__/mermaid-themes.test.ts`: MERMAID_THEMES 구조 무결성 + getMermaidConfig 검증 (14개 케이스)
- 전체 테스트 66개 → 142개

## v0.10.26 (2026-04-09)

### Test: 유틸리티 라이브러리 테스트 추가

- `src/__tests__/color-schemes.test.ts`: ALL_SCHEME_IDS/COLOR_SCHEMES/NEUTRAL_SCHEME/PDF_COLOR_SCHEMES 구조 무결성 검증 (17개 케이스)
- `src/__tests__/mdx-directive-converter.test.ts`: jsxToDirective/directiveToJsx/transformOutsideCodeBlocks 양방향 변환 및 왕복 일관성 검증
- 전체 테스트 40개 → 66개

## v0.10.25 (2026-04-09)

### Feat: 직무 분야 이모지에 스쿼클 배경 추가

- `src/components/admin/panels/SiteConfigPanel.tsx`: 직무 분야 목록의 이모지에 `rounded-[22%]` 스쿼클 컨테이너(`bg-gray-300`, `shadow-sm`) 적용

## v0.10.24 (2026-04-09)

### Fix: 컬러 스킴 localStorage 의존성 제거 — DB 기반 서버 렌더링으로 통일

- `src/app/layout.tsx`: 인라인 스크립트에서 `folium_color_scheme` localStorage 읽기 제거 — 서버 렌더링 값(`data-color-scheme`)이 항상 DB 기준
- `src/components/admin/panels/SiteConfigPanel.tsx`: 저장 시 `localStorage.setItem("folium_color_scheme")` 제거 (초기 로드 시 동기화 포함)
- dev/prod 환경 간 localStorage 교차 오염 방지

## v0.10.23 (2026-04-09)

### Refactor: AdminSaveBar portal 방식으로 전환 — main 패딩 완전 복원

- `src/components/admin/AdminSaveBar.tsx`: `createPortal`로 `#admin-save-bar-slot`에 렌더링 — 부정 마진 완전 제거
- `src/components/admin/AdminDashboard.tsx`: `<main>` 전체 패딩 복원 (`p-4/p-6/p-8`) + `#admin-save-bar-slot` div 추가

## v0.10.22 (2026-04-09)

### Refactor: AdminSaveBar 공통 컴포넌트 추출

- `src/components/admin/AdminSaveBar.tsx`: sticky 저장 바 래퍼 공통 컴포넌트 신규 추출
- `src/components/admin/AdminDashboard.tsx`: `<main>` 하단 패딩 제거 — sticky 저장 바가 화면 바닥에 붙도록 수정
- 어드민 패널 5개 (PostsPanel, PortfolioPanel, BooksSubPanel, AboutPanel, SiteConfigPanel): 중복 div 패턴 → `<AdminSaveBar>` 교체

## v0.10.21 (2026-04-09)

### Refactor: 프론트엔드 max-width 통합 + 컬러 스킴 revalidation 수정

- `src/components/ContentWrapper.tsx`: CVA 기반 콘텐츠 너비 통합 컴포넌트 (default: `max-w-4xl desktop:max-w-6xl`)
- `src/app/(frontend)/layout.tsx`: ContentWrapper 적용 (개별 max-width → 통합)
- `src/components/Header.tsx`: contentVariants 적용
- 프론트엔드 페이지/컴포넌트 개별 max-width 제거 (page.tsx, blog, portfolio, books, AboutView, LandingHeroSwitcher)
- `src/app/admin/actions/revalidate.ts`: `revalidateLayout()` 추가
- `src/components/admin/panels/SiteConfigPanel.tsx`: 저장 시 `revalidateLayout()` 호출 추가 — 컬러 스킴 변경 즉시 반영
- 어드민 패널 5개 (PostsPanel, PortfolioPanel, BooksSubPanel, AboutPanel, SiteConfigPanel): sticky 저장 바에 `-mb-4 tablet:-mb-6 laptop:-mb-8` 추가 — `<main>` 하단 패딩으로 인한 바닥 간격 제거

## v0.10.20 (2026-04-09)

### Fix: 로그인 페이지 인증 리다이렉트

- `src/components/admin/LoginForm.tsx`: 마운트 시 세션 체크 추가 — 이미 로그인된 유저가 `/admin/login` 방문 시 랜딩 페이지(`/`)로 자동 리다이렉트

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

- `valuePillars`/`coreCompetencies` hardcoded → `about_data` JSONB 동적 관리
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
