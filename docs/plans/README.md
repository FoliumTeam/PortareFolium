# docs/plans/

Local planning notes. Gitignored except this README.

## Layout

- `active/<slug>.md` — 진행 중 또는 곧 진행할 plan
- `archive/<slug>.md` — 완료, 보류, 폐기된 plan retention

## 규칙

- 새 plan 은 `active/` 에 생성. 완료/보류 시 `archive/` 로 이동.
- 파일명은 kebab-case slug. `PLAN_` prefix 없음 (폴더가 의미를 담당).
- repo root 에는 `.md` plan 을 만들지 않는다.
- plan-only 변경은 `package.json` version 또는 `docs/CHANGES.md` 에 영향 없다.
