# PLAN: Rendering Pipeline Fix

## 목표

현재 `dangerouslySetInnerHTML` 기반 본문 렌더 경로를 제거하고, MDX를 React tree로 직접 렌더하는 구조로 전환

## 현재 구조

1. DB에서 markdown/MDX 문자열 로드
2. `src/lib/markdown.tsx` `renderMarkdown()`에서 `evaluate()` 실행
3. `renderToString()`으로 HTML string 생성
4. page에서 `dangerouslySetInnerHTML`로 주입

## 문제

- `dangerouslySetInnerHTML` 의존
- lightbox가 DOM scan 기반으로만 동작
- media registry 없이 렌더 후 DOM을 다시 읽어야 함
- React tree 수준에서 이미지/YouTube/`ImageGroup` 추적이 어려움

## 목표 구조

1. DB에서 markdown/MDX 문자열 로드
2. `evaluate()`로 MDX component 생성
3. `renderToString()` 제거
4. page에서 React component tree를 그대로 렌더

## 구현 방향

### Phase 1

- `src/lib/markdown.tsx`의 반환 계약 변경
- string 반환 대신 render 가능한 React component 또는 React node 반환
- `components` 매핑 (`YouTube`, `ImageGroup`, `MarkdownImage`, `Accordion`, `ColoredTable`) 유지

### Phase 2

- blog/portfolio slug page에서 `dangerouslySetInnerHTML` 제거
- server component에서 JSX로 직접 렌더

### Phase 3

- 현재 `unstable_cache` 전략 재검토
- string cache 대신 compile 결과 또는 content 단위 memo 구조로 조정

### Phase 4

- `ImageLightbox`를 DOM scan 기반에서 media registry 기반으로 점진 전환
- image / youtube / imageGroup child를 렌더 단계에서 직접 등록

## 예상 영향 파일

- `src/lib/markdown.tsx`
- `src/app/(frontend)/blog/[slug]/page.tsx`
- `src/app/(frontend)/portfolio/[slug]/page.tsx`
- `src/components/ImageLightbox.tsx`
- 관련 cache helper 또는 신규 registry helper

## 리스크

- cache 전략 재설계 필요
- page 렌더 계약 변경으로 영향 범위 큼
- current lightbox DOM scan 구조와 충돌 가능
- MDX custom component 호환성 회귀 가능

## 권장 순서

1. 현재 lightbox 브랜치 기능 마무리 및 merge
2. `main` 기준 새 branch 생성
3. 렌더 파이프라인 전환
4. 이후 lightbox를 registry 기반으로 재정리

## 비고

지금 브랜치에서 같이 진행하지 않음
기능 완성과 렌더 파이프라인 리팩터를 분리
