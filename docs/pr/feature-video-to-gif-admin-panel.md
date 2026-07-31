# feature/video-to-gif-admin-panel → main: Video GIF 관리자 기능 추가

## 변경 사항

- browser 내 FFmpeg WebAssembly 기반 Video → GIF 변환, trim, crop, 해상도, FPS, 압축률 설정 추가
- 변환 결과와 원본을 browser memory에만 유지하고 자동 저장하지 않는 흐름 반영
- MCP `rename_post_slug` 도구와 PostsPanel의 다중 선택 batch rename/delete 추가
- Windows에서 동작하는 `pnpm reinstall` script와 의존성 재설치 지침 추가

## Test plan

- [x] `pnpm exec vitest run src/__tests__/video-gif-math.test.ts src/__tests__/video-gif-panel.test.tsx src/__tests__/video-gif-preview.test.tsx`
- [ ] admin의 Video → GIF 화면에서 local video를 선택하고 GIF 변환 및 다운로드 확인
- [ ] PostsPanel에서 다중 선택 rename 미리보기와 batch delete 동작 확인
