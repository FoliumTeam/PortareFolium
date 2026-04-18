# PR: 본문 이미지 lightbox + admin follow-up 수정 + 에디터 drag-drop + true-orphan cleanup

**Branch**: `feature/content-image-lightbox` → `main`
**Version range**: v0.12.4 → v0.12.23 (19 commits)

## Summary

3개 feature 묶음 단일 PR:

1. **블로그/포트폴리오 상세 페이지 본문 이미지 lightbox** (v0.12.4) — full-resolution 모달, ±5 filmstrip, blur-up 로딩, alt caption.
2. **Admin follow-up 수정** (v0.12.5 ~ v0.12.10) — metadata modal overflow, thumbnail clear, job_field 이중 문자열화 regression, ship 규칙 문서화.
3. **에디터 drag-drop + paste 이미지 업로드 + true-orphan R2 cleanup** (v0.12.11 ~ v0.12.15) — `RichMarkdownEditor`에 drag-drop/paste 이미지 업로드 pipeline, 외부 URL paste 무업로드 처리, action-triggered (save와 완전 분리) true-orphan R2 key cleanup, slug rename 시 snapshot URL 자동 rewrite, 에디터 open 시 안전망 cleanup.
4. **본문 이미지 UX 보강** (v0.12.16 ~ v0.12.20) — image hover 시 trash 삭제 버튼 (정밀 backspace 대체), source ↔ WYSIWYG 전환 시 발생하던 `![](![](url))` double-wrap 버그 fix + repair, SVG fixture 기반 roundtrip 회귀 테스트, multi-image dnd source markdown multiline 정규화.
5. **다중 이미지 editor + cleanup UX** (v0.12.21 ~ v0.12.22) — multi-image layout modal, `ImageGroup` block, true-orphan cleanup 문서화, 이미지/이미지 그룹 삭제 confirm dialog.
6. **lightbox v2 Sub-A~D** (v0.12.23) — 모바일 swipe, gif `poster.webp`, filmstrip `thumb.webp`, sidecar-aware 회귀 테스트, Chromium lightbox E2E 추가.

---

## 주요 변경 사항

### (1) 본문 이미지 lightbox (v0.12.4)

- `src/components/ImageLightbox.tsx` 신규 — client portal, `z-[120] bg-black/80` backdrop, image `max-w-[80vw] max-h-[80vh] object-contain`
- DOM scan + click delegation + `MutationObserver` (Mermaid/lazy-load late render 대응)
- ArrowLeft/ArrowRight/Escape 키, 첫/마지막에서 disabled (wrap 없음)
- Filmstrip 고정 11개 (`FILMSTRIP_RADIUS=5`), 현재 항목 accent border + scale 강조
- Blur-up 로딩 (동일 src `blur-xl scale-110` 배경 → full-res `onLoad` opacity fade-in)
- `alt` caption + counter 렌더, body scroll lock on open
- `blog/[slug]/page.tsx`, `portfolio/[slug]/page.tsx`에 mount — 상단 thumbnail은 content wrapper 외부라 자동 제외

### (2) Admin follow-up 수정 (v0.12.5 ~ v0.12.10)

- **v0.12.5 fix**: `ThumbnailUploadField`/`MetadataSheet`/`ui/dialog` — 가로 overflow 보정 (`min-w-0` + `overflow-x-hidden`, `sm` → `tablet` breakpoint 정렬)
- **v0.12.6 fix**: `MetadataSheet` DialogHeader + body wrapper `min-w-0` — clipping 보정
- **v0.12.7 feat**: `ThumbnailUploadField` 삭제 버튼 추가 (값 있을 때 표시, `onChange("")` 즉시 비움)
- **v0.12.8 fix**: `site_config.job_field` 저장 시 `JSON.stringify` 제거 + `normalizeJobFieldValue/List` helper — 이미 저장된 `"game"` 형태도 load/재저장 경로에서 `game`으로 보정
- **v0.12.9 test**: `getInitialJobFieldSelection` helper + `__tests__/job-field.test.ts` 회귀 케이스 9개, panel openNew 경로 통일
- **v0.12.10 chore**: `.claude/commands/ship.md` — 독립 변경은 각각 별도 commit/version/CHANGES/PR 반영하도록 규칙 추가

### (3) DnD + 외부 URL + True-Orphan Cleanup (v0.12.11 ~ v0.12.15)

#### R2 storage 경로 확장 (v0.12.11)

- `src/app/api/storage-ops/route.ts` — `action === "delete-keys"` 분기 추가 (S3 `DeleteObjects` 1000 chunk)
- `src/lib/image-upload.ts` — `deleteStorageKeys(keys)` client helper

#### True-orphan cleanup lib (v0.12.12)

- `src/lib/orphan-cleanup.ts` 신규:
  - `baseKey(k)` — sidecar suffix (`\.(thumb|poster)\.webp$`) + 확장자 strip으로 stem만 남김
  - `extractKeysFromText(text, folderPath)` — content/thumbnail/snapshot 텍스트에서 R2 key 추출
  - `cleanupTrueOrphans(args)` — content + thumbnail + 모든 snapshot 합집합 referenced set 기반, listed에서 참조 없는 key 삭제. `candidates` 옵션으로 T1 단일 key 범위 한정
  - `cleanupSingleKey(args, base)` — `candidates: [base]` sugar
  - Safety guard: list empty/throw skip, referenced empty + content non-empty skip (parser 오류 wipe 방지)
  - Dev-mode `console.log` 진단 (`process.env.NODE_ENV === "development"`)
- `src/lib/snapshot-cleanup.ts` 신규:
  - `loadSnapshotsContent(entityType, entitySlug)` — entity의 모든 snapshot.content 조회
  - `triggerSnapshotCleanup(args)` fire-and-forget helper
- `src/__tests__/orphan-cleanup.test.ts` — 21개 회귀 케이스 (baseKey sidecar/확장자, extractKeysFromText markdown/query/unrelated, true-orphan delete, snapshot 참조 보존, sidecar 보존, candidates 범위, list 실패 가드, sanity guard)

#### 에디터 drag-drop + paste + URL handling (v0.12.13)

- `src/extensions/ImageDropPaste.ts` 신규 — Tiptap ProseMirror extension
  - Drop: `handleDOMEvents.drop` — `image/*` files filter → `view.posAtCoords` → `Promise.all` 병렬 업로드 → sequential insert (pos는 `node.nodeSize`만큼 증가)
  - Paste files: 동일 pipeline
  - Paste text URL: `(png|jpe?g|gif|webp|avif|svg)(\?|#|$)` 정규식 매치 시 R2 업로드 없이 image node 직접 삽입
  - `getFolderPath` getter로 slug rename 후에도 최신 folder 사용
  - `bareImageUrlsToMarkdown(text)` helper — source → WYSIWYG 전환 시 bare image URL을 `![](url)` markdown으로 변환
- `src/components/admin/RichMarkdownEditor.tsx`:
  - `ImageDropPaste.configure({ getFolderPath })` 등록
  - `onUpdate` diff: image node src 제거 감지 → 1000ms global debounce → `onImagesRemoved(urls)` 콜백 (Trigger 1)
  - `exitSourceMode`에서 `bareImageUrlsToMarkdown` preprocess
  - `onImagesRemoved` prop 추가
- `src/components/admin/TiptapImageUpload.tsx`: URL 탭 단순화 — "R2에 저장" 경로 제거, "URL 그대로" → "URL 삽입" 단일 버튼. 외부 URL은 R2 업로드 없이 본문 삽입

#### Snapshot/Image-remove cleanup 연동 (v0.12.14)

- `src/lib/snapshot-cleanup.ts`: `triggerSnapshotCleanup(args)` 추가
- `src/components/admin/EditorStatePreservation.tsx`:
  - `folderPath` / `thumbnail` props 추가 (post/portfolio 한정 cleanup 활성화)
  - `fireCleanup` callback — init 종료, autosave FIFO eviction, `handleDelete`, `handleDeleteAll` 4개 지점에서 호출
  - `currentContent` / `thumbnail` ref로 async cleanup 시 stale 회피
- `src/components/admin/panels/PostsPanel.tsx`, `PortfolioPanel.tsx`:
  - `EditorStatePreservation`에 `folderPath` + `thumbnail` 전달
  - `RichMarkdownEditor`에 `onImagesRemoved` 핸들러 — URL 배열을 `extractKeysFromText` + `baseKey` 변환 후 `cleanupTrueOrphans({ candidates })` 호출 (Trigger 1 parent-side wiring)

#### T3 안전망 + slug rename snapshot URL rewrite (v0.12.15)

- `src/lib/snapshot-cleanup.ts`:
  - `maybeCleanupOnOpen(entityType, entitySlug, args)` — `editor_states.count = 0`인 경우만 full cleanup (count > 0이면 R2 호출 0)
  - `rewriteSnapshotUrls(entityType, entitySlug, oldFolder, newFolder)` — slug rename 시 Initial/Auto-save/Bookmark 모든 snapshot.content의 folder prefix 일괄 치환
- `src/components/admin/panels/PostsPanel.tsx`, `PortfolioPanel.tsx`:
  - `openEdit`에서 `maybeCleanupOnOpen` 호출 (T3 안전망)
  - `migrateAssetsIfNeeded`에서 `moveStorageFolder` 뒤에 `rewriteSnapshotUrls` 호출
- `src/components/admin/EditorStatePreservation.tsx`: backdrop `z-[100]` → `z-100` (Tailwind 네이티브 syntax)

### (4) 본문 이미지 UX 보강 (v0.12.16 ~ v0.12.18)

#### Image hover trash 버튼 (v0.12.16)

- `src/components/admin/RichMarkdownEditor.tsx`: image NodeView 우상단에 `flex gap-2` container — 기존 "썸네일로 설정" 버튼 옆에 trash 아이콘 삭제 버튼 추가. group-hover 시 동시 표시. click 시 NodeView `deleteNode()` 호출 → 정밀 backspace 없이 노드 단위 삭제, T1 cleanup 자연 트리거

#### Source ↔ WYSIWYG roundtrip 버그 fix (v0.12.17)

- `src/extensions/ImageDropPaste.ts`:
  - `bareImageUrlsToMarkdown` regex 수정 — lead `[\s(]` → `\s`. 기존엔 `(`도 lead로 인식해 `![](url)`의 URL이 한 번 더 wrap돼 `![](![](url))` 생성, source mode 한 번 다녀오면 콘텐츠 영구 손상. 이제 `^` / `\s`만 lead로 인식
  - `repairDoubleWrappedImages` 신규 — 과거 버그로 손상된 `![](![](url))` / `![](![]\(url\))` 형태 자동 복원, `bareImageUrlsToMarkdown` 진입 시 호출
- `src/__tests__/image-url-conversion.test.ts` 신규: 11개 회귀 케이스 — wrap/no-wrap 분기, 다중 markdown image 보존, 확장자 종류, escape 처리

#### Roundtrip SVG fixture 회귀 테스트 (v0.12.18)

- `src/__tests__/image-url-conversion.test.ts`: dummy SVG URL 기반 roundtrip 6개 케이스 추가 — single roundtrip / 10회 멱등성 / 다중 SVG / query+fragment / legacy double-wrap repair 후 안정성 / bare URL → wrap 후 멱등

#### Multi-image source multiline 정규화 (v0.12.20)

- `src/lib/tiptap-markdown.ts`: `normalizeAdjacentImageMarkdown()` 추가 — tiptap serializer 결과의 연속 image markdown만 `\n\n`으로 분리해서 source mode, autosave, DB 저장 문자열이 모두 multiline 유지
- `src/__tests__/tiptap-markdown.test.ts`: 연속 image 분리, 기존 줄바꿈 유지, link 뒤 image 비변경 회귀 테스트 추가

#### Multi-image layout modal + ImageGroup (v0.12.21)

- `src/components/admin/ImageLayoutModal.tsx` 신규 — multi-image drop/paste 시 `개별사진`/`슬라이드` 선택 modal
- `src/components/ImageGroup.tsx`, `src/extensions/ImageGroupNode.tsx`, `src/lib/mdx-directive-converter.ts`, `src/lib/markdown.tsx` — source/WYSIWYG/frontend 공통 `ImageGroup` 구조 추가
- `src/components/admin/RichMarkdownEditor.tsx`, `src/extensions/ImageDropPaste.ts` — multi-image는 modal 선택 후 개별 image 또는 `imageGroup` block으로 삽입

#### Orphan cleanup 문서 + delete confirm dialog (v0.12.22)

- `docs/IMAGE_ORPHAN_CLEANUP.md` 신규 — Trigger 1/2/3, sidecar, source mode `ImageGroup` 삭제 반영 규칙 문서화
- `src/components/admin/ImageDeleteConfirmDialog.tsx` 신규 — standalone 이미지, 이미지 그룹, 그룹 내부 이미지 삭제 직전 미리보기 confirm dialog
- `src/extensions/ImageGroupNode.tsx` — slider hover 버튼 위치 보정, group/child 삭제 confirm 적용

#### Lightbox v2 Sub-A~D (v0.12.23)

- `src/components/ImageLightbox.tsx` — 모바일 swipe navigation, filmstrip `thumb.webp` 우선 사용, gif `poster.webp`/runtime static preview fallback
- `src/lib/image-upload.ts` — 업로드 시 `thumb.webp` sidecar 병행 생성, gif는 `poster.webp` 추가 생성
- `src/__tests__/image-upload.test.ts`, `src/__tests__/orphan-cleanup.test.ts` — sidecar 업로드 및 cleanup 회귀 보강
- `e2e/content-rendering.spec.ts` — lightbox open/close, next navigation, filmstrip 이동 시나리오 추가

---

## Cleanup Trigger 구조 요약

| Trigger | 발화 시점 | 동작 | Save UX 영향 |
|---|---|---|---|
| T1 | 본문 image 노드 제거 (`onUpdate` diff) | 1초 global debounce 후 `onImagesRemoved(urls)` → parent가 `cleanupTrueOrphans({ candidates })` | 없음 |
| T2 | snapshot 삭제 (init/autosave eviction/handleDelete/handleDeleteAll 4개 지점) | `triggerSnapshotCleanup(args)` fire-and-forget | 없음 |
| T3 | 에디터 open + `editor_states.count = 0` | `maybeCleanupOnOpen` → count check 후 cleanup 1회 | 없음 |

Save 버튼/autosave/handleBack에는 cleanup 연동 없음. 현재 save UX 그대로 유지.

---

## 변경 파일 목록

| 파일 | 변경 유형 | 버전 |
| ---- | --------- | ---- |
| `src/components/ImageLightbox.tsx` | 신규 | v0.12.4 |
| `src/app/(frontend)/blog/[slug]/page.tsx` | 수정 (mount) | v0.12.4 |
| `src/app/(frontend)/portfolio/[slug]/page.tsx` | 수정 (mount) | v0.12.4 |
| `src/components/admin/ThumbnailUploadField.tsx` | 수정 | v0.12.5, v0.12.7 |
| `src/components/admin/MetadataSheet.tsx` | 수정 | v0.12.5, v0.12.6 |
| `src/components/ui/dialog.tsx` | 수정 | v0.12.5 |
| `src/components/admin/panels/SiteConfigPanel.tsx` | 수정 | v0.12.8 |
| `src/lib/job-field.ts` | 수정 | v0.12.8, v0.12.9 |
| `src/components/admin/JobFieldSelector.tsx` | 수정 | v0.12.8 |
| `src/components/admin/panels/ResumePanel.tsx` | 수정 | v0.12.8 |
| `src/__tests__/job-field.test.ts` | 수정 | v0.12.9 |
| `.claude/commands/ship.md` | 수정 | v0.12.10 |
| `src/app/api/storage-ops/route.ts` | 수정 (delete-keys) | v0.12.11 |
| `src/lib/image-upload.ts` | 수정 (deleteStorageKeys) | v0.12.11 |
| `src/lib/orphan-cleanup.ts` | 신규 | v0.12.12 |
| `src/lib/snapshot-cleanup.ts` | 신규 | v0.12.12, v0.12.15 확장 |
| `src/__tests__/orphan-cleanup.test.ts` | 신규 | v0.12.12 |
| `src/extensions/ImageDropPaste.ts` | 신규 | v0.12.13 |
| `src/components/admin/RichMarkdownEditor.tsx` | 수정 | v0.12.13 |
| `src/components/admin/TiptapImageUpload.tsx` | 수정 | v0.12.13 |
| `src/components/admin/EditorStatePreservation.tsx` | 수정 | v0.12.14, v0.12.15 |
| `src/components/admin/panels/PostsPanel.tsx` | 수정 | v0.12.8~9, v0.12.14~15 |
| `src/components/admin/panels/PortfolioPanel.tsx` | 수정 | v0.12.8~9, v0.12.14~15 |
| `src/components/admin/panels/BooksSubPanel.tsx` | 수정 | v0.12.8~9 |
| `src/__tests__/image-url-conversion.test.ts` | 신규 | v0.12.17, v0.12.18 확장 |
| `AGENTS.md` | 수정 (components/lib 목록) | v0.12.4, v0.12.15 |
| `docs/CHANGES.md` | 수정 | 전 commit |
| `package.json` | 수정 (version) | 전 commit |

---

## Test Plan

### 자동

- [x] `pnpm exec vitest run` — 14 files, 159 tests pass (신규: orphan-cleanup 21 + job-field normalize 9 + image-url-conversion 17)
- [x] `pnpm build` — TypeScript 0 error, 38 static pages 생성
- [ ] CI (GitHub Actions E2E, 3 엔진 + authenticated) — push 후 자동 실행

### 수동 (lightbox)

- [ ] Blog 상세 본문 img 클릭 → lightbox open, Arrow/Esc/backdrop 닫기
- [ ] Portfolio 상세 동일 동작
- [ ] 상단 thumbnail 클릭 시 lightbox 안 열림
- [ ] Filmstrip 11개 고정 window, 현재 accent border, thumbnail 클릭 이동
- [ ] Blur-up 로딩, alt caption 표시

### 수동 (admin follow-up)

- [ ] 긴 썸네일 URL로 metadata modal 열어 가로 overflow 없음 확인
- [ ] 썸네일 값 있을 때 삭제 버튼 표시 + 클릭 시 비워짐
- [ ] SiteConfig에서 active job field 설정 저장 후 값 확인 (`"game"` 아닌 `game`)
- [ ] 기존에 `"game"`으로 저장된 값도 로드 시 `game`으로 정규화
- [ ] 신규 포스트/포트폴리오/도서 생성 시 기본 jobField가 active 값과 일치

### 수동 (DnD + cleanup)

- [ ] 본문에 이미지 4장 동시 drag-drop → 순서대로 drop 위치에 삽입, R2에 4개 key 저장 확인
- [ ] 본문에서 이미지 1장 삭제 → ~1초 후 dev console `[orphan-cleanup::cleanupTrueOrphans]` log + R2 key 사라짐 (true-orphan 확인)
- [ ] 같은 이미지 2회 삽입 후 1개만 삭제 → R2 key 유지 (referenced)
- [ ] Bookmark snapshot 저장 후 본문에서 이미지 삭제 → R2 유지 (snapshot 참조). snapshot 삭제 → R2 삭제
- [ ] Clipboard 이미지 URL paste (WYSIWYG) → R2 업로드 없이 image node 삽입
- [ ] Source mode paste URL → text 유지. WYSIWYG 전환 시 image로 렌더
- [ ] Modal URL 탭: `URL 삽입` 단일 버튼, R2 저장 경로 없음
- [ ] Slug rename 후 snapshot content도 새 prefix 참조 (false orphan 없음)
- [ ] `editor_states` 비어있는 post 열면 T3 cleanup 실행 (dev console log)

### 수동 (이미지 UX)

- [ ] 본문 이미지 hover → 우상단에 "썸네일로 설정" + trash 아이콘 동시 표시
- [ ] Trash 클릭 → 이미지 노드 즉시 삭제, ~1초 후 T1 cleanup 발화
- [ ] Source mode 진입 → 콘텐츠가 `![](url)` 정상 markdown
- [ ] Source mode → WYSIWYG 복귀 → 이미지 손상 없이 그대로 렌더
- [ ] (회귀) 손상된 `![](![](url))` 콘텐츠 가진 포스트 열고 source → WYSIWYG 한 번 → 정상 복원

---

## Locked decisions (from interview)

| 주제 | 결정 |
| --- | --- |
| snapshot URL 보존 | 모든 label 스캔 후 referenced set에 union (broken image 회피) |
| portfolio 경로 | `portfolio/{slug}/{filename}` 확인 — extraction은 uuid/legacy 이름 모두 수용 |
| Dry-run | `process.env.NODE_ENV === "development"` 한정 `console.log`, prod 실삭제 |
| 트리거 | action-triggered 3개 (T1/T2/T3), save 무관 |
| 다중 drop | 병렬 upload + sequential insert |
| URL handling | 외부 URL R2 미업로드, modal URL 탭 단순화 |
| sidecar | `baseKey` regex `\.(thumb|poster)\.webp$` + 확장자 strip |
| T1 debounce | 1000ms global single timer |
| snapshot rewrite | slug rename 시 모든 label (Initial/Auto-save/Bookmark) |
| URL detect | 확장자 정규식만, 실패 시 text fallback |
| cleanup 정책 | fire-and-forget, `handleBack`에서 await 안 함 |
| 범위 | post + portfolio만, book scope 외 |

---

## v2 Backlog (별도 PR)

- 모바일 touch swipe 제스처 (lightbox)
- `e2e/content-rendering.spec.ts` — lightbox + dnd 시나리오 + `e2e-*` prefix fixture seed
- GIF filmstrip 정적 thumbnail (업로드 시 `{uuid}.poster.webp` + runtime canvas fallback)
- Filmstrip thumbnail variant (`{uuid}.thumb.webp` 256px long-edge, runtime fallback)
- URL param sync (`?img=3`), wrap-around option, zoom/pan 제스처

v2 계획 파일: `.omc/plans/content-image-lightbox-v2.md`
