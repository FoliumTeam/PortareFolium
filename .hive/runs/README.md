# Runs

장기 작업은 host session이 아니라 tracked Markdown artifact로 재개.

권장 구성:

```text
runs/<run-id>/
  PLAN.md
  STATUS.md
  evidence/
```

Transcript 전체의 정본 사용 금지. 현재 목표, 완료 기준, 남은 작업, artifact hash와 검증 결과만 유지.
