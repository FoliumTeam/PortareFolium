# ABANDONED — KEDITOR migration failure

이 plan은 실패한 migration 기록이다. 재시도하지 않는다.

- KEDITOR migration은 폐기됨.
- `content_mode` column/field/schema를 다시 추가하지 않는다.
- posts/portfolio/books content는 기존 Tiptap/MDX 경로를 유지한다.
- SQLite refuge 복귀는 남은 `content_mode` residue를 자동 제거한다.

---
# PLAN — KEDITOR A1' migration + 전용 편집 페이지 (Phase 1 구현 plan)

**경로**: A1' (keditor-0.3.0 **source vendored + 자체 빌드**)
**범위**: posts + portfolio + books 전용 편집 페이지 + 3-mode editor (html/markdown/text)
**브랜딩**: siteTitle 로고, "POWERED BY TINY" 유지 (LGPL attribution 겸용)
**보류**: Mermaid/KaTeX/ImageGroup/ColoredTable/YouTubeEmbed 포팅 → phase 2. Accordion 은 KEDITOR `moreLess` 로 대체.
**저장 위치**: 본 파일(로컬, commit 제외) + `.omc/plans/keditor-migration.md`(skill 규정)

## 0. A1 → A1' 으로의 변경 배경

원래 A1 안은 `KEDITOR-0.7.21/*.min.js` prebuilt 를 `public/keditor/` 에 복사하는 **bundle-only** 형태였음. 사용자 요구 추가:

1. **Source code must live in repo** — 향후 기능 추가·버그 수정이 일상적. prebuilt 만 두면 수정 불가.
2. **Flawless integration** — content state, DB connections, autosave, snapshot 등 기존 hierarchy 와 엮여야 함.
3. **Active feature additions** — Tistory 실사용자 불만 (https://holika.tistory.com/m/entry/티스토리-새-에디터로-글을-작성하면서-느낀-장단점들) 해결 필요. 요약:
   - 폰트 preset 6개 한정 (제목1~3, 본문1~3), 줄 단위만 size 조정
   - 드롭 이미지 기본값 `match-parent` 로 원본 크기 무시
   - 다중 이미지 그룹 일괄 resize 불가
   - 폰트 기본 타입 불명확 → 동일 style 라인 간 size 편차
   - 모바일 편집 시 `<html>` 박스 렌더 버그, 폰트 size 리셋

→ 이 문제들은 **KEDITOR source 수정으로만 해결 가능**. prebuilt 고정 시 영구 고착.

**A1' 핵심 구조**:

```
packages/
  keditor/                                 # pnpm workspace subpackage
    src/                                   # ← keditor-0.3.0/src 이식 + 우리 패치
      plugins/<name>/
      themes/{classic,balloon,mobileClassic}/
      skins/classic/
      langs/ko_KR/
      lib/{Uploader, openFile, ...}
    tinymce/                               # ← keditor-0.3.0/tinymce 이식 (LGPL source)
    build/
      webpack.config.js                    # webpack 5, modern toolchain
      rollup.theme.config.mjs              # theme rollup (원래 Gruntfile 역할)
    package.json                           # 자체 devDeps, build scripts
    tsconfig.json
    dist/                                  # build output (gitignored)

scripts/
  copy-keditor-dist.mjs                    # packages/keditor/dist → public/keditor/

public/
  keditor/                                 # build artifact (gitignored)
    tinymce.min.js                         # npm tinymce@4.9.11 에서 복사 (LGPL runtime)
    plugins/<name>/plugin.min.js
    themes/classic/theme.min.js
    skins/classic/*
    langs/ko_KR.min.js
    NOTICE.html
    source/keditor-0.3.0.zip               # (LGPL 의무 — source archive 는 빌드 시 자동 생성)
```

- **Build flow**: `pnpm --filter keditor build` → `packages/keditor/dist/` → `scripts/copy-keditor-dist.mjs` → `public/keditor/`
- **Dev flow**: source 수정 → `pnpm --filter keditor build` → `pnpm dev` 자동 reload
- **CI**: `pnpm build` (root) 가 prebuild hook 에서 `pnpm --filter keditor build` 먼저 실행

**공사 기간 재평가**: 기존 A1 (1–2주) → A1' (2–3주). +4–6일 (workspace 구성 + webpack 5 migration + 초기 source patch).

---

## 1. Requirements Summary

1. `KEDITOR-0.7.21/` 의 prebuilt minified bundle 을 `public/keditor/` 에 배치, `tinymce@4.9.11` (npm LGPL tarball) 를 `public/keditor/tinymce.min.js` 로 병치.
2. React wrapper `KeditorEditor` 로 admin 편집 페이지에서 tinymce 인스턴스 mount/unmount.
3. 편집 페이지를 admin dashboard tab 에서 분리해 전용 route 로 이동:
    - `/admin/posts/[slug]/edit`
    - `/admin/portfolio/[slug]/edit`
    - `/admin/books/[slug]/edit`
4. 에디터에 3-mode 지원 (Tistory 와 동일):
    - `'wysiwyg'` — 기본모드 (KEDITOR WYSIWYG, iframe contenteditable)
    - `'html'` — HTML source 모드 (CodeMirror 6 + `@codemirror/lang-html`, raw markup 직접 편집)
    - `'markdown'` — 마크다운 모드 (CodeMirror 6 + `@codemirror/lang-markdown`)
   mode 전환 시 confirm + destructive flatten (Tistory 거동: 방향 무관 플레인 텍스트로 수렴 후 새 mode 에 주입).
5. DB 각 테이블에 `content_mode text` 컬럼 추가. 기본값 정책: **신규 콘텐츠 `'wysiwyg'`, 기존 MDX rows `'markdown'`** 로 backfill.
6. 편집 페이지 진입 시 기본 active mode = 해당 row 의 `content_mode` 값 (신규면 `'wysiwyg'`).
7. 프론트 `renderMarkdown` 파이프라인을 `content_mode` 에 따라 분기:
    - `'wysiwyg'` → rehype sanitize → 직접 주입 (KEDITOR getContent 결과가 이미 HTML)
    - `'html'` → rehype sanitize → 직접 주입 (사용자가 수기로 작성한 raw HTML)
    - `'markdown'` → 기존 MDX 파이프라인 유지 (Mermaid/KaTeX/directive 렌더 보존)
   wysiwyg 와 html 은 프론트 렌더 동일. admin 편집 UI 에서만 구분.
8. admin 편집 페이지 좌상단 로고 영역에 `SiteConfig.siteTitle` 노출. `(edit)` route group 전용 layout 으로 Header/Sidebar 제거 후 full-bleed.
9. 하단 StatusBar 우측: "미리보기 · 맞춤법(disabled) · open source / DOWNLOAD · POWERED BY TINY · 임시저장 | N · 완료" 구성. LGPL NOTICE 링크를 "open source / DOWNLOAD" 에 연결.
10. 기능 회귀 0: autosave, Cmd+S, unsaved warning, editor_states snapshot, orphan cleanup, lightbox sidecar, PDF export 모두 phase 1 종료 시점에 동일 동작.
11. 본 변경은 `feature/keditor-migration` branch 에서 진행. 현 `feature/nextauth-sqlite-refuge` 와 분리.

### 명시적 비목표 (Out of Scope — Phase 1)
- Mermaid/KaTeX/ImageGroup/ColoredTable/YouTubeEmbed 를 KEDITOR custom plugin 으로 포팅. 기존 데이터의 해당 directive 는 `markdown` mode 로 남겨 렌더/편집 가능. 사용자가 `html` 로 전환하면 destructive flatten 으로 편집 불가 블록이 될 수 있음 — 허용.
- 맞춤법 검사 API 연동. 버튼은 disabled + tooltip.
- mobile skin (KEDITOR mobileClassic). 모바일 편집은 phase 1 에서 best-effort (기본 skin).
- KEDITOR 의 `maps`, `location`, `google-photos` plugin. 로드하지 않음.

---

## 2. Acceptance Criteria

각 항목 전부 통과해야 phase 1 종료:

- [ ] `pnpm dev` 에서 `/admin/posts/<existing-slug>/edit` 접근 시 KEDITOR WYSIWYG 가 wysiwyg mode (`content_mode='wysiwyg'`) 에서 로드되고, `t1.daumcdn.net` 등 외부 도메인 요청 0건 (DevTools Network 기준).
- [ ] 기존 MDX 포스트(`content_mode='markdown'`) 편집 페이지 진입 시 CodeMirror markdown mode 가 기본 활성, 본문은 원본 MDX 텍스트 그대로 편집 가능.
- [ ] HTML source mode (`content_mode='html'`) 진입 시 CodeMirror + html lang 으로 raw HTML 직접 편집.
- [ ] mode dropdown (`기본 / HTML / 마크다운`) 에서 다른 mode 선택 → confirm dialog 출력 → 확인 시 현재 content 를 plain text 로 flatten 후 새 mode editor 에 주입. 취소 시 dropdown 원복.
- [ ] KEDITOR kTable 로 표 삽입·셀 배경·행/열 추가·병합 동작. 저장 후 프론트에서 동일 렌더.
- [ ] kImage 업로드 → 기존 `/api/upload-image` R2 경유 → editor 에 `<img src=https://pub-....r2.dev/...>` 삽입.
- [ ] moreLess (접은글) 삽입 → 저장 → 프론트에서 `<details><summary>` 기반 collapsible 렌더.
- [ ] 저장 시 `content_mode` 가 DB 에 함께 기록되고, `docs/CHANGES.md` 에 phase 1 변경 이력 기록.
- [ ] admin dashboard `/admin` list panel 에서 post/portfolio/book 의 "편집" 버튼이 `router.push(<edit route>)` 로 전용 페이지 이동. list 조회·검색·삭제 regression 0.
- [ ] Cmd+S, 5초 주기 autosave (localStorage `portare_autosave_editor_*`), unsaved warning, editor_states snapshot 전체 작동.
- [ ] 이미지 제거 1초 후 `onImagesRemoved` debounce 호출 → 기존 sidecar/orphan cleanup 경로 그대로 진행.
- [ ] `pnpm build` 성공. `pnpm exec vitest run` 통과. `pnpm exec playwright test --project=chromium --project=authenticated-chromium` 통과.
- [ ] LGPL NOTICE 링크가 edit 페이지 StatusBar 에 노출되고, 클릭 시 `/keditor/NOTICE.html` 로 이동. NOTICE 문서에 TinyMCE 4 source ZIP 다운로드 링크 + Kakao 수정 고지 포함.
- [ ] `/admin/posts/<slug>/edit` 에서 PdfPreviewModal 정상 (wysiwyg/html mode 저장 콘텐츠에서도 `data-pdf-block` 로 페이지 분할 동작).

---

## 3. Implementation Steps (commit 단위)

각 단계는 별도 commit (`<type>: <설명> (v<version>)`). version suffix 는 `package.json` patch bump. **Step 1 은 prerequisite (branch 분기), commit 없음**. **Step 18 은 integration gate (verification only), commit 없음**. **Step 19 (source patches) 는 Step 18 통과 이후에만 착수**.

### Step 1 — Branch 분기 (Prerequisite, 코드 변경 없음)
- **선결 조건**: 현재 `feature/credentials-admin-auth` 가 main 으로 머지 완료. 로컬 `main` 이 origin/main 과 동기화됨.
- **실행**:
    ```bash
    git switch main
    git pull --ff-only origin main
    git switch -c feature/keditor-migration
    ```
- **확인**:
    - `git branch --show-current` → `feature/keditor-migration`
    - `git status` → 작업 트리 clean
    - `git log --oneline -3` → main 의 최신 commit 이 HEAD
- **비고**:
    - 중간에 credentials 머지 전 KEDITOR 작업 착수 필요 시, `feature/credentials-admin-auth` 에서 분기 후 나중에 `git rebase --onto origin/main feature/credentials-admin-auth feature/keditor-migration` 로 재부모. rebase 절차는 대화 이력의 "branch 반부모 가이드" 참조.
    - **이 Step 은 commit 을 생성하지 않음**. Step 2 부터 실제 작업.
- **commit**: 없음.

### Step 2 — DB migration: `content_mode` 컬럼 추가
- **편집 파일**: `src/lib/migrations.ts`
- **추가 migration** (version = phase 1 첫 bump, 예: `0.12.78`):
    ```sql
    ALTER TABLE posts            ADD COLUMN IF NOT EXISTS content_mode text DEFAULT 'markdown';
    ALTER TABLE portfolio_items  ADD COLUMN IF NOT EXISTS content_mode text DEFAULT 'markdown';
    ALTER TABLE books            ADD COLUMN IF NOT EXISTS content_mode text DEFAULT 'markdown';
    ALTER TABLE posts            ADD CONSTRAINT posts_content_mode_chk           CHECK (content_mode IN ('wysiwyg','html','markdown'));
    ALTER TABLE portfolio_items  ADD CONSTRAINT portfolio_items_content_mode_chk CHECK (content_mode IN ('wysiwyg','html','markdown'));
    ALTER TABLE books            ADD CONSTRAINT books_content_mode_chk           CHECK (content_mode IN ('wysiwyg','html','markdown'));
    ```
- **verify**: `admin/migrations` panel 에서 수동 실행 or 서버 restart 시 auto-migrate 성공. `supabase/setup.sql` + `supabase/migration-whole.sql` 에도 동일 컬럼 추가.
- **commit**: `feat: content_mode 컬럼과 3-mode editor 기반 추가 (v0.12.78)`

### Step 3 — Server Actions: content_mode 필드 확장
- **편집 파일**:
    - `src/app/admin/actions/posts.ts`
    - `src/app/admin/actions/portfolio.ts`
    - `src/app/admin/actions/books.ts` (books 는 현재 panel 에서만 저장 → action 존재 여부 재확인 후 분리 필요 시 신설)
- **변경**: `update`/`create` payload 에 `content_mode?: 'wysiwyg' | 'html' | 'markdown'`. 검증 후 저장. 신규 콘텐츠 기본 `'wysiwyg'`.
- **MCP 대응** (`src/lib/mcp-tools.ts`): `create_post`, `update_post`, `create_portfolio_item`, `update_portfolio_item` 의 input schema 에 optional `content_mode` 추가. 기본 `'markdown'` (기존 에이전트 호환 유지).
- **verify**: `tsc` 통과, server action unit 테스트 (`src/__tests__/`) 필요 시 스냅샷.
- **commit**: `feat: server actions 가 content_mode 필드 저장 지원 (v0.12.79)`

### Step 4 — Frontend render dispatch
- **편집 파일**: `src/lib/markdown.tsx`
- **변경**: `renderMarkdown(content, options)` signature 에 `mode?: 'wysiwyg'|'html'|'markdown'` 추가. 호출부 (`src/app/(frontend)/blog/[slug]/page.tsx`, `portfolio/[slug]/page.tsx`, `books/[slug]/page.tsx`) 에서 row 의 `content_mode` 전달.
    - `'wysiwyg'` 또는 `'html'`: `rehype-sanitize` (기존에 없으면 추가) → `dangerouslySetInnerHTML`. `MarkdownImage` 대체 없이 `<img>` 그대로 (sanitize whitelist 에 `img[src|alt|title|width|height|data-*]` 포함). 두 mode 의 프론트 렌더 결과는 동일.
    - `'markdown'`: 기존 경로 유지.
- **의존성**: `pnpm add rehype-sanitize` (미설치 시).
- **verify**: 기존 MDX 포스트 렌더 regression 0. 새 html 샘플 row 삽입 후 프론트 렌더 검증.
- **commit**: `feat: frontend render 를 content_mode 기반 dispatch 로 분기 (v0.12.80)`

### Step 5 — pnpm workspace + `packages/keditor/` source vendoring
- **편집 파일**:
    - `pnpm-workspace.yaml` (신규) — `packages: ['packages/*']`
    - root `package.json` — workspace 모드 활성. `scripts.build` 앞에 `"prebuild": "pnpm --filter keditor build && node scripts/copy-keditor-dist.mjs"` 추가.
- **신규 디렉토리**: `packages/keditor/`
    - `src/` ← `KEDITOR-0.7.21/keditor-0.3.0/src/**` 전체 복사 (plugins, themes, skins, langs, lib)
    - `tinymce/` ← `KEDITOR-0.7.21/keditor-0.3.0/tinymce/**` 복사 (LGPL source 보관)
    - `package.json` — `name: "@portare/keditor"`, `private: true`, `scripts: { build, build:plugins, build:themes, build:skins, dev }`, devDeps 는 webpack 5 modern set (§Step 5 참조).
    - `tsconfig.json` — TinyMCE 4 require baseUrl + paths. `compilerOptions.target: ES2018` (IE11 호환 불필요 가정).
    - `.gitignore` — `dist/`, `node_modules/`
    - `README.md` — build 방법, source 수정 가이드, LGPL 의무 요약
- **`.gitignore` root** — `public/keditor/` 추가 (build artifact). 단 `public/keditor/NOTICE.html` 은 별도로 source 보관 (template) 후 build 시 dist 에 복사.
- **NOTICE 템플릿**: `packages/keditor/build/NOTICE.template.html` — `KEDITOR-0.7.21/1397.html` 의 OSS 목록 + 상단에 "Modified by Kakao Corp. Based on TinyMCE 4.9.x (LGPL-2.1). Re-modified by Hojin Jeong for Portare Folium." 추가. TinyMCE 4 source ZIP 다운로드 경로 `/keditor/source/keditor-0.3.0.zip` 명시.
- **source ZIP 자동 생성**: `packages/keditor/build/create-source-zip.mjs` — `src/` + `tinymce/` 를 zip → `packages/keditor/dist/source/keditor-0.3.0.zip`. build 시 자동 실행.
- **verify**: `pnpm install` 성공, workspace 인식. `packages/keditor/` tree 복사 완료.
- **commit**: `chore: KEDITOR source 를 packages/keditor workspace 로 vendoring (v0.12.81)`

### Step 6 — `packages/keditor` 빌드 체인 현대화 (webpack 5)
- **목적**: 원본 `webpack.config.js` 는 webpack 4 + babel 6 + awesome-typescript-loader + node-sass. Node 24.13 비호환. 최신 도구로 재작성.
- **신규/이식 파일**:
    - `packages/keditor/build/webpack.config.mjs` — webpack 5 기반. entry 는 기존 `KEDITOR-0.7.21/keditor-0.3.0/webpack.config.js` 의 plugin/theme/skin 목록 그대로 재현. `externals: { tinymce: 'tinymce' }` 유지.
    - `packages/keditor/build/rollup.theme.config.mjs` — `classic` 테마만 rollup (mobileClassic 은 phase 1 제외). 입력: `src/themes/classic/main/ts/Theme.ts` → 출력: `dist/themes/classic/theme.js` + `theme.min.js`.
- **devDeps 전환**:
    | old (webpack 4) | new (webpack 5) |
    |---|---|
    | webpack ^4.8 | webpack ^5.97 |
    | babel-core ^6 | @babel/core ^7.25 |
    | babel-preset-env ^1.7 | @babel/preset-env ^7.25 |
    | babel-preset-react ^6 | @babel/preset-react ^7.25 |
    | babel-plugin-transform-decorators-legacy | @babel/plugin-proposal-decorators (legacy) |
    | awesome-typescript-loader ^5 | ts-loader ^9.5 |
    | typescript ^2.9 | typescript ^5.9 (root 버전과 동일) |
    | node-sass ^4.8 | sass ^1.98 (dart-sass; root devDeps 에 이미 존재) |
    | sass-loader ^7 | sass-loader ^16 |
    | less-loader ^4 | less-loader ^12 |
    | less ^3 | less ^4.2 |
    | mini-css-extract-plugin ^0.4 | mini-css-extract-plugin ^2.9 |
    | uglifyjs-webpack-plugin ^1 | (webpack 5 기본 terser) |
    | optimize-css-assets-webpack-plugin ^4 | css-minimizer-webpack-plugin ^7 |
    | copy-webpack-plugin ^4 | copy-webpack-plugin ^12 |
    | file-loader ^1 | (webpack 5 asset modules `type: 'asset/resource'`) |
    | url-loader ^1 | (asset modules) |
- **TypeScript 2.9 → 5.x 호환성 수정**: `src/plugins/**/*.ts` 일부는 TS 2.x 의 느슨한 문법 사용. 예상 에러:
    - implicit `any` 오류 → 각 plugin index 상단에 `// @ts-nocheck` 추가 (1차 대응), phase 2 에서 개별 타이핑.
    - `autobind-decorator` 구문 → `experimentalDecorators: true` + `useDefineForClassFields: false` 로 통과.
    - `import` path 의 `../../../lib/openFile` 등은 그대로 해결됨.
- **스크립트**:
    - `packages/keditor/package.json` scripts:
        ```json
        {
          "build": "pnpm run build:clean && pnpm run build:webpack && pnpm run build:theme && pnpm run build:notice && pnpm run build:source-zip",
          "build:clean": "rimraf dist",
          "build:webpack": "webpack --mode=production --config build/webpack.config.mjs",
          "build:theme": "rollup -c build/rollup.theme.config.mjs",
          "build:notice": "node build/render-notice.mjs",
          "build:source-zip": "node build/create-source-zip.mjs",
          "dev": "webpack --mode=development --watch --config build/webpack.config.mjs"
        }
        ```
- **루트 통합**: `scripts/copy-keditor-dist.mjs` 가 `packages/keditor/dist/` → `public/keditor/` 복사. `package.json` 의 `prebuild` hook 에 연결.
- **runtime tinymce.min.js 확보**: `packages/keditor/package.json` 에 `"dependencies": { "tinymce": "4.9.11" }` 추가. `build/copy-tinymce-runtime.mjs` 가 `node_modules/tinymce/tinymce.min.js` → `packages/keditor/dist/tinymce.min.js` 복사. LGPL 의무 충족.
- **verify**: `pnpm --filter @portare/keditor build` 성공. `packages/keditor/dist/` 에 `tinymce.min.js`, `plugins/<name>/plugin.min.js`, `themes/classic/theme.min.js`, `skins/classic/**`, `langs/ko_KR.min.js`, `NOTICE.html`, `source/keditor-0.3.0.zip` 전부 존재. `pnpm build` (root) 시 prebuild → copy → Next build 순서 정상 작동.
- **commit**: `feat: packages/keditor 빌드 체인을 webpack 5 로 현대화 (v0.12.82)`

### Step 7 — `(edit)` route group + layout
- **신규 파일**:
    - `src/app/admin/(edit)/layout.tsx` — admin auth guard 상속, Header/Sidebar 제거, full-bleed. `<Script src="/keditor/tinymce.min.js" strategy="beforeInteractive" />` 주입.
    - `src/app/admin/(edit)/posts/[slug]/edit/page.tsx`
    - `src/app/admin/(edit)/portfolio/[slug]/edit/page.tsx`
    - `src/app/admin/(edit)/books/[slug]/edit/page.tsx`
- **각 `page.tsx`**: server component. slug 로 row fetch → `SiteConfig` fetch → client `<PostEditor row={...} siteTitle={...} />` 에 넘김. 404 시 `notFound()`.
- **타입**: `declare global { interface Window { tinymce: any } }` 를 `src/types/keditor.d.ts` 에 신설.
- **verify**: route 3개 모두 로드, auth 미통과 시 `/admin/login` 리다이렉트.
- **commit**: `feat: admin 전용 편집 페이지 route group 추가 (v0.12.83)`

### Step 8 — EditorFrame shell (공용 UI)
- **신규 디렉토리**: `src/components/admin/editor-page/`
    - `EditorFrame.tsx` — 3단 grid (상단 toolbar 영역, 본문 area, 하단 StatusBar). `siteTitle` prop 표시.
    - `TitleField.tsx` — autosize textarea, placeholder "제목을 입력하세요".
    - `TagLine.tsx` — `#태그입력` 인라인 입력 + 기존 `TagSelector` 재활용 가능하면 그대로.
    - `CategoryDropdown.tsx` — `JobFieldSelector`/`CategorySelect` re-style.
    - `StatusBar.tsx` — `미리보기 | 맞춤법(disabled) | open source/DOWNLOAD | POWERED BY TINY | 임시저장 | N | 완료`. `완료` 버튼은 기존 `AdminSaveBar` portal 대상.
    - `ModeDropdown.tsx` — 3-mode select (UI 라벨: `기본 (WYSIWYG)` / `HTML` / `마크다운`, 내부 값: `wysiwyg`/`html`/`markdown`). 변경 시 `onRequestModeChange(next)` 콜백.
    - `ModeSwitchDialog.tsx` — 확인 modal. 취소 시 현 mode 유지, 확인 시 flatten + mode 변경.
    - `MetadataSheet.tsx` — 기존 `src/components/admin/MetadataSheet.tsx` 를 import 해 그대로 사용 또는 이 위치로 재배치.
- **layout 기준**: `max-w-4xl` 중앙 정렬, 상단 toolbar sticky, 하단 StatusBar fixed, 본문 flex-1 scroll. appearance.png 대응.
- **verify**: 빈 content 삽입 시 appearance.png 와 픽셀 비율 유사.
- **commit**: `feat: editor-page shell 과 mode dropdown 구성 (v0.12.84)`

### Step 9 — Mode switch flatten utility
- **신규 파일**: `src/lib/editor-mode-switch.ts`
    ```ts
    export type EditorMode = 'wysiwyg' | 'html' | 'markdown';

    export function flattenToPlainText(content: string, fromMode: EditorMode): string {
      if (fromMode === 'wysiwyg' || fromMode === 'html') {
        // 둘 다 HTML 표현. DOMParser 로 textContent 추출
        const doc = new DOMParser().parseFromString(content, 'text/html');
        return doc.body.innerText ?? doc.body.textContent ?? '';
      }
      // markdown → plain: heading markers, emphasis, links (keep text), code fences, list markers, blockquote, hr, image (keep alt), html tags
      return content
        .replace(/```[\s\S]*?```/g, (m) => m.replace(/^```\w*\n|```$/g, ''))
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^\s*>\s?/gm, '')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
        .replace(/^---+$/gm, '')
        .replace(/<[^>]+>/g, '');
    }
    ```
- **참고 (Tistory 거동)**: wysiwyg ↔ html 간 전환은 기술적으로 무손실 가능 (둘 다 HTML) 이지만 Tistory 는 모든 방향에서 destructive flatten 적용. 본 plan 도 동일 정책 — UX 일관성 확보.
- **unit test**: `src/__tests__/editor-mode-switch.test.ts` — wysiwyg/html/markdown fixture 각 5개 flatten 결과 assertion.
- **commit**: `feat: mode switch flatten utility 추가 (v0.12.85)`

### Step 10 — KeditorEditor React wrapper (wysiwyg / 기본 mode)
- **신규 파일**: `src/components/admin/editor-page/KeditorEditor.tsx`
- **역할**: `tinymce.init({ target, base_url: '/keditor', suffix: '.min', skin: 'classic', theme: 'classic', language: 'ko_KR', external_plugins: {...}, plugins: 'kImage codeblock kTable klink fontSelect colorPalette kAlign kList blockquoteList hrList moreLess styleFormat kPaste kEmoticon imageSlide video autosave', toolbar: ..., kImage: { upload_url, upload_handler }, setup })`.
- **upload_handler**: 기존 `/api/upload-image` 호출. `FormData(file)` POST, 응답 `{ url, name }` 을 `callback({ data: { url, name }, options })` 로 전달.
- **value/onChange bridge**: controlled. `editor.on('Change KeyUp Undo Redo', () => onChange(editor.getContent()))`. 초기화 시 `editor.setContent(value)`.
- **cleanup**: `useEffect` cleanup 에서 `tinymce.remove(ref.current)`. React 19 strict mode 대응 — `initialized` flag 로 double init 방지.
- **onImagesRemoved**: `editor.on('Change')` 에서 이전/현재 `<img src>` 집합 diff → debounce 1s → 콜백. 기존 `RichMarkdownEditor` 경로와 동일 signature.
- **verify**: 페이지 mount, unmount, remount (strict mode) 누수 0. kTable 삽입·셀 배경 변경·이미지 드래그 업로드.
- **commit**: `feat: KeditorEditor wrapper 로 TinyMCE 4 기반 wysiwyg mode 도입 (v0.12.86)`

### Step 11 — CodeMirror markdown mode wrapper
- **의존성 추가**: `pnpm add @codemirror/state @codemirror/view @codemirror/lang-markdown @codemirror/commands @codemirror/language @codemirror/search`. (기존에 `cm6-theme-basic-{dark,light}` 있음.)
- **신규 파일**: `src/components/admin/editor-page/MarkdownEditor.tsx`
    - CodeMirror 6 EditorView. extensions: `markdown()`, `basicSetup`, theme (light/dark from `data-theme`), `EditorView.updateListener.of(v => onChange(v.state.doc.toString()))`.
    - 높이: `EditorView.theme({ '&': { height: '100%', minHeight: '400px' } })`.
- **verify**: 기존 MDX 포스트 열기 → syntax highlight 동작, 저장 시 원본 텍스트 보존.
- **commit**: `feat: markdown mode CodeMirror 6 editor 통합 (v0.12.87)`

### Step 12 — HTML source mode wrapper (CodeMirror html lang)
- **의존성 추가**: `pnpm add @codemirror/lang-html` (Step 11 의 CodeMirror 6 코어 deps 와 함께 설치되도록 단일 commit 으로 묶어도 됨).
- **신규 파일**: `src/components/admin/editor-page/HtmlSourceEditor.tsx`
- **구현**: CodeMirror 6 EditorView with `html()` extension, `basicSetup`, theme (light/dark), `EditorView.updateListener.of(v => onChange(v.state.doc.toString()))`. value prop 으로 초기 raw HTML 주입.
- **verify**: wysiwyg mode 에서 작성한 콘텐츠를 html mode 로 destructive flatten 후 raw HTML 직접 편집 → markdown mode 로 또 flatten 했다가 wysiwyg 으로 돌아와도 데이터 일관성 유지 (모두 plain text 로 한번씩 거쳐가는 거동 확인).
- **commit**: `feat: html source mode CodeMirror html lang editor 추가 (v0.12.88)`

### Step 13 — PostEditor / PortfolioEditor / BookEditor 클라이언트 컴포넌트
- **신규 파일**:
    - `src/components/admin/editor-page/PostEditor.tsx`
    - `src/components/admin/editor-page/PortfolioEditor.tsx`
    - `src/components/admin/editor-page/BookEditor.tsx`
- **공통 상태**:
    - `const [mode, setMode] = useState<EditorMode>(initialMode ?? 'wysiwyg')`  // EditorMode = 'wysiwyg'|'html'|'markdown'
    - `const [content, setContent] = useState(initialContent)`
    - `const [pendingMode, setPendingMode] = useState<EditorMode | null>(null)`
- **mode switch flow**:
    1. ModeDropdown `onRequestModeChange(next)` → `setPendingMode(next)` → ModeSwitchDialog 오픈.
    2. 확인 시 `const flat = flattenToPlainText(content, mode); setContent(flat); setMode(next); setPendingMode(null);`
    3. 취소 시 `setPendingMode(null)`.
- **save**: 기존 `useAutoSave` 훅 + Cmd+S (`useKeyboardSave`). save payload 에 `content_mode: mode` 포함.
- **unsaved warning**: `useUnsavedWarning`.
- **commit**: `feat: post/portfolio/book editor 클라이언트 합성 (v0.12.89)`

### Step 14 — Admin list panel 축소 + navigate
- **편집 파일**:
    - `src/components/admin/panels/PostsPanel.tsx` — inline `<RichMarkdownEditor/>` 및 관련 상태 제거. "편집" 버튼 → `<Link href={`/admin/posts/${slug}/edit`}>`.
    - `src/components/admin/panels/PortfolioPanel.tsx` — 동일.
    - `src/components/admin/panels/BooksSubPanel.tsx` — 동일.
- **AdminDashboard 영향**: list tab 만 남기고 "편집 탭 내부"가 사라짐. header 의 탭 라벨 조정.
- **verify**: list 검색/필터/삭제/thumbnail 등 기타 기능 regression 0.
- **commit**: `refactor: admin list panel 을 list 전용으로 축소하고 편집은 전용 페이지로 이동 (v0.12.90)`

### Step 15 — LegacyRichMarkdownEditor 정리
- **평가**: `RichMarkdownEditor.tsx` 와 관련 Tiptap 확장 (`src/extensions/*`), `tiptap-markdown.ts`, `tiptap-utils.test.ts` 는 더 이상 admin 에서 직접 사용되지 않음.
- **조치 범위 옵션 A**: 파일 유지 (markdown mode 렌더 경로 `renderMarkdown` 이 MDX directive 보존을 위해 directive → JSX 변환에 여전히 의존). **이 경우 `mdx-directive-converter.ts`, `src/extensions/*`, `src/components/{ImageGroup,ColoredTable,Accordion,YouTubeEmbed,MermaidRenderer}.tsx` 는 건드리지 않음**.
- **조치 범위 옵션 B (비추천)**: 즉시 제거 — Mermaid/KaTeX/ImageGroup 등 기존 콘텐츠 렌더 파괴 risk. phase 1 에서 실행 금지.
- **결정**: 옵션 A. `RichMarkdownEditor.tsx` 자체는 unused import 제거만 수행 (혹은 admin route 에서 dead import). dead code 는 phase 2 정리.
- **verify**: `tsc` unused import warning 0.
- **commit**: `chore: admin panel 의 RichMarkdownEditor import 정리 (v0.12.91)`

### Step 16 — autosave / Cmd+S / unsaved warning / snapshot 배선 검증
- **편집 파일 없음** (기존 훅 재사용). `PostEditor` 등이 훅을 호출하도록 합성만 확인.
- **verify**:
    - 5초 주기 localStorage `portare_autosave_editor_posts_<slug>` 기록
    - Cmd+S 저장 → toast "저장됨"
    - dirty 상태 페이지 이탈 시 browser confirm
    - `editor_states` snapshot 자동저장 정상 (editor_states.ts action 호출 경로 유지)
- **commit**: 없음 (검증만) — 문제 발견 시 별도 fix commit.

### Step 17 — Orphan cleanup / lightbox sidecar 배선
- **편집 파일 없음** (기존 경로). `KeditorEditor` 가 기존 `onImagesRemoved(urls)` 시그니처 호출하도록만 보장. markdown/html mode (CodeMirror) 에서는 onImagesRemoved 생략 (wysiwyg mode 만 적용 — KEDITOR 가 image 노드 트래킹 가능한 유일 mode).
- **verify**:
    - wysiwyg mode 편집 중 이미지 삭제 → 1초 후 `/api/r2-cleanup` 또는 기존 경로로 파이프라인 호출
    - slug rename 시 `snapshot-cleanup.ts` 경로 영향 없음 (content_mode 무관)
- **commit**: 없음 (검증만).

### Step 18 — Integration verification gate (Prerequisite for Step 19)
- **목적**: KEDITOR 원본이 우리 프로젝트 hierarchy (content state, DB, R2 upload, autosave, snapshot, orphan cleanup, mode dispatch) 에 **결함 없이 통합됐는지** 검증. 이 게이트 실패 시 Step 19 (source patches) 착수 금지 — 통합 실패를 source 수정으로 덮는 잘못된 진단 차단.
- **체크리스트** (모두 ✅ 이어야 통과):
    - [ ] `/admin/posts/<slug>/edit` · `/admin/portfolio/<slug>/edit` · `/admin/books/<slug>/edit` 3종 모두 KEDITOR WYSIWYG 로드 성공 (wysiwyg mode, content_mode='wysiwyg')
    - [ ] 기존 MDX 포스트 열기 → CodeMirror markdown mode 기본 활성, 원본 MDX 텍스트 그대로 표시
    - [ ] mode dropdown 3-way 전환 (html↔markdown↔text) 양방향 confirm + flatten 동작
    - [ ] kTable 삽입·셀 배경·행/열 추가·병합 → 저장 → DB 확인 → 프론트 `/blog/<slug>` 렌더 일치
    - [ ] kImage 드래그 업로드 → `/api/upload-image` 호출 → R2 URL 응답 → `<img src>` 삽입
    - [ ] moreLess (접은글) 삽입 → 저장 → 프론트에서 `<details><summary>` 렌더
    - [ ] 코드블록 (codeblock plugin) 삽입 → 저장 → 프론트에서 shiki 렌더 (html sanitize whitelist 통과)
    - [ ] 링크 (klink) / 목록 (kList) / HR (hrList) / 인용 (blockquoteList) / 이모티콘 (kEmoticon) 각 1회 삽입·렌더 검증
    - [ ] Cmd+S 저장 → toast "저장됨" + DB row 의 `content_mode` + `content` 갱신
    - [ ] 5초 주기 localStorage `portare_autosave_editor_{posts,portfolio,books}_<slug>` 기록 확인
    - [ ] unsaved warning — dirty 상태에서 페이지 이탈 시 browser confirm
    - [ ] `editor_states` snapshot 테이블에 자동저장 row 누적
    - [ ] wysiwyg mode 이미지 삭제 → 1초 후 `onImagesRemoved` 호출 → orphan cleanup 파이프라인 트리거
    - [ ] DevTools Network 탭 — `t1.daumcdn.net`, `*.kakao.com`, `*.daum.net` 요청 0건
    - [ ] browser console — editor 관련 에러·경고 0건 (React 19 strict mode 재마운트 포함)
    - [ ] `pnpm exec vitest run` — editor-mode-switch 포함 전체 통과
    - [ ] `pnpm build` — 경고/에러 0. `pnpm start` 로 production smoke
- **게이트 실패 시 대응**:
    - 어느 항목이라도 ✗ 이면 해당 기능 담당 Step (예: kImage 업로드 실패 → Step 10 KeditorEditor 재검토) 로 되돌아가 fix commit 추가 후 이 게이트 재실행.
    - 절대로 Step 19 (source patches) 를 우회해서 진행 금지.
- **commit**: 없음. 단 실패로 인한 fix commit 들은 `fix: ...` prefix 로 별도 기록.

### Step 19 — KEDITOR source patch: Tistory 사용자 불만 대응
- **선결 조건**: Step 18 게이트 전 항목 통과. KEDITOR 원본이 우리 프로젝트에 결함 없이 통합된 것이 공식 확인된 상태.
- **배경**: https://holika.tistory.com/m/entry/... 에서 보고된 문제 중 **phase 1 에서 바로 해결 가능한 low-risk 항목만** 처리. 기능 추가가 필요한 항목(이미지 그룹 resize 등)은 phase 2.
- **대상 패치**:
    1. **이미지 기본 max-width 문제** — `packages/keditor/src/plugins/kImage/src/components/attachLocalImage.ts` 의 `img` 생성 구문에서 inline `max-width: match-parent` 제거 또는 `max-width: 100%; height: auto;` 로 교체. 원본 width attribute 보존.
    2. **폰트 기본 타입 명시** — `packages/keditor/src/skins/classic/main/less/desktop/Content.less` 의 body selector 에 `font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif; font-size: 16px; line-height: 1.7;` 추가. `src/plugins/styleFormat/src/` 의 default preset 주석/코드 정리.
    3. **줄 단위만 size 조정 문제** — `src/plugins/fontSize/` plugin 은 기본적으로 selection 대상 동작. 문제는 toolbar dropdown 이 블록 레벨 apply 우선 → `plugin.ts` 에서 `editor.selection.getRng().collapsed === false` 일 때 inline `<span style="font-size:...">` wrap 경로 확인. 필요 시 `editor.formatter.apply('fontsize', { value })` 의 `inline: 'span'` 옵션 강제.
    4. **폰트 일관성** — `src/plugins/fontSelect/` + `src/plugins/styleFormat/` 의 default body 지정이 `Content.less` 와 동일하도록 동기화.
- **비목표 (phase 2)**:
    - 다중 이미지 그룹 일괄 resize (imageSlide plugin 확장 필요)
    - 모바일 `<html>` 박스 렌더 버그 (mobile skin 영역)
    - 폰트 preset 6개 → 커스텀 확장
- **verify**: 각 패치 후 `pnpm --filter @portare/keditor build` 재실행, `/admin/posts/<slug>/edit` 에서 이미지 드래그 시 원본 크기 유지 + 본문 폰트가 Pretendard 로 렌더 확인. 그리고 Step 18 게이트 체크리스트의 "기존 통과 항목" 이 여전히 ✅ 인지 회귀 검증.
- **commit**: `fix: KEDITOR source 패치로 이미지 max-width 와 기본 폰트 이슈 해결 (v0.12.92)`

### Step 20 — PDF export 호환
- **편집 파일**: `src/lib/markdown.tsx` 의 html branch 에서 `<section>`/`<h1-h3>` 등 블록 요소에 `data-pdf-block` attribute 를 post-render 으로 주입하는 hook 추가 (기존 renderMarkdown 의 데이터와 동일 패턴). `PdfPreviewModal.tsx` 는 미수정.
- **verify**: wysiwyg mode 저장 포스트 + html mode 저장 포스트 → PdfPreviewModal 에서 페이지 분할 정상 (두 mode 모두 HTML 출력이므로 공통 처리).
- **commit**: `feat: wysiwyg/html mode 콘텐츠에 data-pdf-block 주입으로 PDF export 호환 (v0.12.93)`

### Step 21 — E2E + unit 테스트
- **신규 파일**:
    - `e2e/authenticated/admin-editor.spec.ts` — login → /admin → 편집 이동 → 저장 → 프론트 렌더 visibility + console error 0.
    - `e2e/authenticated/editor-mode-switch.spec.ts` — html→markdown 전환 confirm → flatten 확인.
    - `src/__tests__/editor-mode-switch.test.ts` (Step 9 에서 생성).
- **verify**: `pnpm exec playwright test --project=authenticated-chromium` 전체 통과.
- **commit**: `test: admin 편집 페이지 E2E + mode switch unit 추가 (v0.12.94)`

### Step 22 — docs + CHANGES
- **편집 파일**:
    - `docs/CHANGES.md` — phase 1 전체 변경 summary.
    - `AGENTS.md` "Project Structure" 섹션 — `(edit)` route group + editor-page 서브폴더 구조 반영.
    - `docs/IMAGE_ORPHAN_CLEANUP.md` — wysiwyg mode 트리거 적용 범위 명시 (markdown/html mode 는 cleanup hook 비적용).
- **commit**: `docs: KEDITOR A1' migration phase 1 변경 이력 기록 (v0.12.95)`

---

## 4. Risks & Mitigations

| 위험 | 영향 | 완화 |
|---|---|---|
| TinyMCE 4 EOL 보안 취약점 | admin 범위로 공격면 제한, 장기적 risk | admin-only 접근 유지. long-term 으로 A2 (TinyMCE 7) 이주 옵션 문서화. |
| React 19 strict mode 재마운트로 editor 중복 init | 에디터 flicker / memory leak | `KeditorEditor` useEffect 에 `initialized` ref guard + cleanup `tinymce.remove`. React 19 strict dev loop 수동 검증. |
| prebuilt bundle 경로 깨짐 (skin fonts/img CDN hardcode) | skin CSS 흐지부지, 아이콘 깨짐 | `base_url: '/keditor'` + file-copy 시 `skins/classic/img/` + `skins/classic/fonts/` 전부 동기화. 404 없을 때까지 Network 검증. |
| mode switch flatten 로직이 사용자 콘텐츠를 의도치 않게 파괴 | 데이터 손실 | confirm dialog 에 "이 작업은 되돌릴 수 없으며 스타일이 제거됩니다" 명시 + `editor_states` snapshot 을 switch 직전에 강제 저장. |
| kImage upload_handler API 시그니처 미스매치 | 업로드 실패 alert | `keditor-0.3.0/src/lib/Uploader.js` 실측 후 wrapper 구현 전 1시간 검증. 실패 시 대안: kImage drop + TinyMCE 기본 `images_upload_handler` 사용. |
| LGPL 의무 누락으로 법적 risk | 라이선스 위반 | Step 5 에서 NOTICE + source ZIP 배포. Step 8 StatusBar 에 "open source/DOWNLOAD" 링크 필수. PR 머지 전 checklist 재검증. |
| `(edit)` route group layout 이 admin auth guard 상속 실패 | 비인증 사용자 편집 접근 | layout.tsx 에서 `requireAdminSession()` 명시적 호출. E2E 테스트로 미인증 redirect 검증. |
| rehype-sanitize whitelist 가 KEDITOR 출력 태그 일부 제거 | 렌더 결과 불일치 | KEDITOR 출력 샘플 (table colgroup, figure, details, caption 등) 을 whitelist 에 명시 추가. 필요 시 `rehype-sanitize` 의 default schema 확장. |
| Books 의 Server Action/action 경로 구조 미비 | Step 3 blockage | Step 3 초입에 `src/app/admin/actions/books.ts` 존재 확인. 없으면 panel 내 저장 로직을 action 으로 추출 (작업 +0.5일). |
| MCP 에이전트가 `content_mode` 누락으로 기본값 사용 | 기존 에이전트 동작 변경 | MCP 툴 기본값을 `'markdown'` 으로 유지 (UI 기본값 `'html'` 과 분리). `get_schema` 응답에 명시. |
| webpack 4 → 5 migration 중 plugin/theme build 실패 | Step 6 blockage, phase 1 전체 지연 | 단계적 접근: (1) 단순 JS plugin (codeblock, moreLess 등) 부터 webpack 5 로 빌드 확인, (2) TS plugin (kImage, kTable 등) 순차 확인, (3) theme rollup 마지막. 각 plugin 빌드 실패 시 임시로 `KEDITOR-0.7.21/plugins/<name>/plugin.min.js` 직접 복사 (partial fallback). full re-build 성공 이전에는 prebuilt 파일 섞어 쓰기 허용. |
| TypeScript 2.9 → 5.x 호환성 오류 폭증 | Step 6 blockage | 초기 전략: 모든 `src/plugins/**/*.ts` 및 `src/themes/classic/main/ts/**/*.ts` 상단에 `// @ts-nocheck` 일괄 추가 → 빌드 통과 우선. phase 2 에서 개별 typing. tsconfig `strict: false` + `skipLibCheck: true` 유지. |
| @ephox/* 패키지 의 latest 버전이 TinyMCE 4 와 호환 깨짐 | Step 6 runtime break | `packages/keditor/package.json` 에서 @ephox/* 버전을 원본 `keditor-0.3.0/package.json` 과 **완전 동일 고정** (`@ephox/alloy: "2.2.3"`, `@ephox/boulder: "3.2.1"`, 나머지 `latest` → 실제 설치 버전 pin). `pnpm-lock.yaml` 에 lock. |
| Tistory 실사용자 불만 (이미지 max-width, 폰트 일관성) 재발 | 사용자 경험 저해 | Step 18 통합 게이트 통과 후 Step 19 에서 source patch 적용. 각 수정 후 dev 브라우저에서 이미지 드래그 + 폰트 일관성 수동 검증. 패치가 효과 없으면 phase 2 확장 예정 (이미지 그룹 resize plugin 신설 등). |
| 통합 미검증 상태에서 source patch 착수로 원인 판별 불가 | phase 1 디버깅 혼선 | Step 18 integration gate 체크리스트를 **모두** 통과해야만 Step 19 착수. 게이트 실패 시 해당 기능 담당 Step 으로 회귀 후 fix commit. source patches 는 통합 실패를 덮는 우회 수단이 아님. |
| source 수정 후 rebuild 누락으로 stale dist 로드 | 버그 재현 불가, 개발 혼선 | `pnpm dev` watch 모드에서 `packages/keditor/` 변경 감지 시 자동 rebuild 스크립트 (`pnpm --filter @portare/keditor dev` 병렬 실행). root `pnpm dev` 명령을 `concurrently` 로 Next.js + keditor watch 동시 실행. |

---

## 5. Verification Steps

phase 1 종료 시 실행:

1. **Local dev**:
    ```bash
    pnpm dev
    # http://localhost:3000/admin 로그인
    # /admin/posts/<slug>/edit 열기, kTable 삽입, 이미지 업로드, moreLess(접은글) 삽입, 저장
    # /admin/portfolio/<slug>/edit 동일
    # /admin/books/<slug>/edit 동일
    # mode dropdown 에서 마크다운 → 기본(wysiwyg) → HTML 3-way 전환 confirm→flatten 확인
    ```
2. **Unit tests**: `pnpm exec vitest run` — 전 테스트 통과 + 신규 `editor-mode-switch` / `editor-frame` 포함.
3. **E2E**: `BASE_URL=http://127.0.0.1:3100 E2E_SERVER_MODE=start pnpm exec playwright test --project=chromium --project=authenticated-chromium` — admin-editor + editor-mode-switch spec 통과.
4. **Build**: `pnpm build` — 경고/에러 0. `pnpm start` 로 production 확인.
5. **Frontend render**: `/blog/<slug>` (기존 markdown mode) + `/blog/<new-wysiwyg-slug>` (wysiwyg mode) + `/blog/<new-html-source-slug>` (html mode) 각각 렌더 콘솔 에러 0.
6. **Console network**: admin 편집 페이지 Network 에 `t1.daumcdn.net`, `*.kakao.com`, `*.daum.net` 요청 0건.
7. **LGPL**: `/keditor/NOTICE.html` 접근 200, source ZIP 다운로드 링크 유효.
8. **Lighthouse (선택)**: admin 편집 페이지 performance score regression 없음 (기존 대비 ±10 허용).

---

## 6. 후속 (Phase 2 — 본 plan 범위 외)

사용자가 추후 필요 시 한 건씩 포팅:

- **Mermaid plugin**: KEDITOR plugin `mermaid` 신설 → `<pre data-mermaid>` wrapping + fence input, 저장 시 HTML fragment 유지.
- **KaTeX plugin**: `katex` 신설 → modal 수식 입력 → `<span class="math inline">` 렌더.
- **ImageGroup plugin**: 다중 이미지 그룹 layout (stack/slider) 삽입 → `<div class="image-group" data-layout>` 으로 flatten.
- **ColoredTable plugin**: 기존 FoliumTable attribute 집합을 KEDITOR kTable 확장으로 재구성 or 별도 plugin.
- **YouTube plugin**: `video` plugin 을 확장해 YouTube URL → `<iframe>` 자동 변환.
- **TinyMCE 7 이주 (A2 경로)**: 보안/유지보수 개선. phase 2 중/후반.
- **모바일 skin 적용**: `classic.mobile` skin import.
- **맞춤법 검사 API**: 한국어 맞춤법 서비스 계약 후 `grammarCheck.check_url` 연결.

---

## Changelog (본 plan 파일)

- v2 — KEDITOR-0.7.21/keditor-0.3.0 full source 실측 반영, 3 경로(B/A1/A2) 비교
- v3 — A1 확정, 3-mode editor (html/markdown/text) 추가, moreLess Accordion 대체, siteTitle logo, POWERED BY TINY 유지, phase 1 18-step 구현 plan 확정
- v4 — A1→A1' 업그레이드. Source 를 `packages/keditor/` 로 vendoring. webpack 5 빌드 체인 현대화. Tistory 사용자 불만 source patch Step 추가. 20-step.
- v5 — Step 1 branch 분기 prerequisite 추가, Step 18 integration verification gate 신설, source patches 를 Step 19 로 이동 (통합 미검증 상태에서 source 수정 착수 금지). 총 22-step.
- **v6 (현재)** — 3-mode 정의를 Tistory 실제 거동에 맞춰 재정의: `'wysiwyg'` (기본모드, KEDITOR WYSIWYG, 신규 콘텐츠 default) / `'html'` (raw HTML source, CodeMirror html lang) / `'markdown'` (CodeMirror markdown lang). 기존 `'text'` plain textarea mode 제거. Step 12 (Text mode) → HTML source mode editor 로 교체. DB CHECK enum, server actions, render dispatch, EditorFrame, flatten utility, integration gate, PDF export, docs 전반 적용. 총 22-step 유지.
