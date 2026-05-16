# PR: feature/video-to-gif-admin-panel

## v0.12.179 - GIF 압축률 slider 전환

- GIF 최적화 select를 압축률 slider/number input으로 전환.
- 권장 압축률과 고압축 시 예상되는 움직임 저하/유사 프레임 제거 안내 추가.
- 압축률 기반 FPS, palette, 유사 프레임 제거, 예상 크기 계산으로 최적화 로직 보정.
- 기존 localStorage 최적화 모드 값을 압축률로 migration.

## v0.12.180 - MCP post slug rename 도구 추가

- MCP `rename_post_slug` 도구 추가.
- posts row 유지 기반 slug 변경, 중복 slug 검증, blog route revalidate 적용.
- 누락 또는 구버전 의존성 발견 시 `pnpm reinstall` 우선 실행 agent 지침 추가.

## v0.12.181 - reinstall script Windows 호환

- `pnpm reinstall` script의 `rm -rf` 의존을 제거하고 Node 기반 삭제 명령으로 전환.
