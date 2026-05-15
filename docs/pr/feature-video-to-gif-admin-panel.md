# PR: feature/video-to-gif-admin-panel

## v0.12.179 - GIF 압축률 slider 전환

- GIF 최적화 select를 압축률 slider/number input으로 전환.
- 권장 압축률과 고압축 시 예상되는 움직임 저하/유사 프레임 제거 안내 추가.
- 압축률 기반 FPS, palette, 유사 프레임 제거, 예상 크기 계산으로 최적화 로직 보정.
- 기존 localStorage 최적화 모드 값을 압축률로 migration.
