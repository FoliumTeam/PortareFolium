# Unreal Client Portfolio 분석

## 목표

`https://unreal-client-portfolio.vercel.app/#itt-detail`의 공개 배포본을 실제 전송 자산과 브라우저 동작 기준으로 분석해, PortareFolium에 적용할 수 있는 구조·성능·미디어 전달 방식을 정리한다.

## 수행 결과

- [x] HTML, 응답 헤더, 정적 자산 목록을 수집했다.
- [x] 영상/GIF 자산의 실제 형식·호스트·용량·캐시 정책을 확인했다.
- [x] JavaScript와 HTML 비중, 좌측 목차 동작, 가독성 및 포트폴리오 구조를 평가했다.
- [x] 근거와 적용 가능한 교훈을 한국어로 보고했다.

## 확인 범위

- Vercel `icn1` 캐시 적중 응답과 한 번의 브라우저 렌더링을 확인했다.
- 각 사용자의 실제 회선·기기별 Core Web Vitals, 비디오 해상도·코덱 세부값은 측정하지 않았다. 현재 호스트에 `ffprobe`가 없어 메타데이터 판독은 실행하지 못했다.
