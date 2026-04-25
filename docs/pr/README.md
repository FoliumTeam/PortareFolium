# docs/pr/

Branch 별 PR body. Gitignored except this README.

## 규칙

- 파일명: 현재 branch 이름 그대로 (`/` 는 `-` 로 치환). 예: `feature-credentials-admin-auth.md`
- repo root 에는 PR body `.md` 를 만들지 않는다.
- `gh pr create --body-file docs/pr/<branch>.md` 형태로 사용.
- 머지 후에는 삭제 또는 `archive/` 로 이동.
