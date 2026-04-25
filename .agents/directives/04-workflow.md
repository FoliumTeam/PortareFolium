# 04. Git Workflow & Documentation

## Branch Strategy

- **Trunk-based hybrid**: `main` 브랜치가 production이며 작은 변경(bug fix, doc update, single-file refactor)은 `main`에 직접 commit + push.
- **Large work**: 여러 commit이 필요하거나 리뷰가 필요한 큰 작업(신규 feature, 광범위 refactor, 디자인 시스템 변경 등)은 `feature/<설명>` 브랜치를 만들어 작업 후 `gh pr create`로 PR을 열고 main에 머지.
- 판단 기준: **3 commit 이상 예상되거나 ≥3 파일 도메인 영역에 걸쳐 있으면 feature branch 권장**. 그 외엔 main 직접 push.
- `main`에는 절대 force push 하지 않는다. release tag(`v*.*.0`)는 `main`의 head에서만 생성.

## Testing Gate

- **Commit gate (로컬)**: `git commit` 전에는 `pnpm exec vitest run` (unit + integration)만 통과하면 된다. pre-commit hook이 이미 이 수준을 강제함.
- **Push gate (로컬 strict)**: `git push` 전에 `.husky/pre-push`가 `pnpm build` 후 `BASE_URL=http://127.0.0.1:3100 E2E_SERVER_MODE=start pnpm exec playwright test --project=chromium --project=authenticated-chromium` 자동 실행. E2E 통과 못 하면 push 차단. `--no-verify`로 hook 우회 금지.
- **Frontend runtime gate (필수)**: frontend route, `src/components/**/*.tsx` client component, 브라우저 인터랙션 코드를 수정했으면 `pnpm dev` 기준으로 실제 대상 route를 열어 browser console error / `pageerror` / redbox 0개를 직접 확인해야 함. build 통과만으로 런타임 검증을 대체하지 말 것.
- **E2E runtime assertions**: 새 E2E나 기존 E2E를 수정할 때는 가능하면 browser console error 와 `pageerror`를 수집해 assertion에 포함. 단순 visibility check만으로 "all tests good" 판단 금지.

## Commit Conventions

- **형식**: `<type>: <Korean description> (v<version>)` — version suffix는 `package.json`의 bump된 patch 버전과 일치해야 함.
- **제목 규칙**: 명령형 현재 시제, 첫 글자 소문자, 끝 punctuation 없음, 한글 (파일명·고유명사·기술 용어는 영어 원문 유지).
- **타입**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`.
- **Commit grouping**: 무관한 변경을 한 commit에 묶지 않는다.
- **Path quoting**: route group `(...)` / dynamic segment `[...]` 포함 경로는 `git add` 시 반드시 `""` 인용.
- **Co-Authored-By 등 Claude 협력 문구 절대 포함 금지**.

## PR Conventions

- **PR 제목 형식**: `<source> → <target>: <설명>`. 70자 이하.
- **Test plan checklist**는 항상 채울 것.
- **Claude 협력 문구 절대 포함 금지**.
- **Branch별 PR 파일 강제**: PR 본문 파일은 반드시 `docs/pr/<branch-name>.md` 위치에 생성. branch name 의 `/` 는 `-` 로 치환. repo root 에는 절대 PR 본문 `.md` 를 만들지 않는다.
- **HARD: `gh pr create` body 전달 시 `--body "$(cat ...)"` 또는 HEREDOC 절대 사용 금지.** 반드시 `--body-file <path>` 옵션 사용. (토큰 낭비 방지)

## Documentation Requirements

- Add brief docstrings in Korean for newly created functions.
- Concisely document what changes you have done in the `docs/CHANGES.md` file.
- Automatically increment the 3rd version number (patch version) in `package.json` whenever there is a change. Only update 1st/2nd if explicitly requested.
- Planning-only 문서 작업(`docs/plans/**/*.md`, 조사 메모 등)에서는 `package.json` version과 `CHANGES.md`를 변경하지 않는다.
- Plan 파일은 `docs/plans/active/<slug>.md` (진행 중) 또는 `docs/plans/archive/<slug>.md` (완료/보류) 위치에만 생성한다. `PLAN_` prefix 사용 금지 — 폴더가 의미를 담당.
- `docs/plans/`, `docs/pr/`, `docs/TODO.md`, `docs/USER_TASKS.md` 는 gitignored 라 사용자가 명시적으로 요구하지 않는 한 commit 하지 않는다.
- If a task requires a blueprint edit from the user, don't try to forcefully solve it by code; outright tell the user what to do with detailed instructions.
