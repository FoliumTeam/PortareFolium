# Raw

원본 또는 정규화한 source material 보관 위치.

- 기존 source bytes 수정 금지
- source bytes의 SHA-256을 revision filename과 locator에 결합
- 변경된 source는 새 immutable revision으로 수집
- 폐기된 source는 active tree에서 삭제
- 재유입 방지는 `../suppression.yml`의 최소 fingerprint로 처리
- 기밀정보와 credential 저장 금지
