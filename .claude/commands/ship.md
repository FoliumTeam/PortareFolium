# ship

Commit the current unstaged changes following these rules strictly:

1. **No Co-Authored-By**: Never include a Co-Authored-By line in the commit message.

2. **Commit message format**: Read the last two commits by the user (not by another collaborator, Claude or any bot) via `git log` and match their style exactly. The canonical project format is:

    ```
    <type>: <Korean description> (v<version>)
    ```

    The `(v<version>)` suffix is **mandatory** for PortareFolium and must match the bumped `package.json` version (see rule 3).

    **Commit body format (mandatory for any non-trivial commit):** Match the concise Korean file-scoped bullet style of the canonical example commit `02e080e539a608a24e134aa29ff8ccf44b557e42`.

    ```text
    <type>: <Korean description> (v<version>)

    - path/to/file.ts:
      변경 요약 추가
    - path/to/other-file.ts, path/to/test.ts:
      관련 테스트와 호출 경계 보강
    ```

    Body rules:
    - Use file/path-scoped bullets. Group related files in one bullet when they belong to the same concern.
    - Use concise Korean statement-like noun/verb-noun endings such as `추가`, `정리`, `보강`, `반영`, `제거`, `갱신`, `적용`.
    - Do **not** write prose sentences like `~한다.`, `~했다.`, `~합니다.`, or long rationale paragraphs.
    - Do **not** include Lore trailers (`Constraint:`, `Rejected:`, `Tested:`, etc.) in normal PortareFolium commits unless the user explicitly asks for them for that commit.
    - For a tiny single-file/docs-only change, a subject-only commit is allowed only when the last two human commits also use subject-only style.
    - Before committing, run `git log -2 --format=full` and compare the drafted message against this body style. If it does not look like `02e080e...`, rewrite it before `git commit`.

    **Commit type table** (Conventional Commits spec — pick the most accurate type; if multiple apply, pick the dominant one based on the _intent_ of the change, not the file count):

    | 타입       | 설명                                           | 사용 예                                                       |
    | ---------- | ---------------------------------------------- | ------------------------------------------------------------- |
    | `feat`     | 새로운 기능 추가                               | UI 컴포넌트 신규, API endpoint 추가, 신규 admin 패널          |
    | `fix`      | 버그 수정                                      | rendering bug, regression, broken navigation                  |
    | `docs`     | 문서만 변경 (코드 변경 없음)                   | README, AGENTS.md, CHANGES.md, JSDoc, MDX 콘텐츠              |
    | `style`    | 코드 의미에 영향 없는 변경                     | 포맷팅, 세미콜론, prettier auto-fix only                      |
    | `refactor` | 기능 추가/버그 수정 아닌 코드 구조 변경        | 함수 분리, 변수명 변경, 타입 정리                             |
    | `perf`     | 성능 개선                                      | bundle size 감소, query 최적화, render 회수 감소              |
    | `test`     | 테스트 추가/수정 (테스트만 변경)               | unit, E2E, fixture 추가/변경                                  |
    | `chore`    | 빌드·설정·도구 등 보조 작업 (코드 동작 무영향) | dependency 업데이트, CI workflow, .claude/skills, lint config |
    | `revert`   | 이전 커밋 되돌리기                             | `git revert` 결과                                             |

    **타입 선택 가이드**:
    - 코드 변경 없이 문서만 → `docs`. **단**, AGENTS.md/skills 같은 _agent 동작에 영향을 주는_ 메타-문서는 `chore`로 분류 가능 (project tooling에 더 가깝다고 판단되면).
    - bug 수정 + 테스트 추가가 같은 PR이면 → `fix` (테스트는 부수적).
    - refactor 중 발견한 사소한 bug를 함께 고쳤다면 → `fix` (의도가 최종적으로 bug 수정이었으므로).
    - 모호하면 사용자에게 확인.

    **Title rules:**
    - 명령형 현재 시제 (e.g., "추가", "수정" — not "추가했음" or "수정 중").
    - 첫 글자 소문자 (`feat:` 뒤 첫 단어).
    - 끝에 마침표/느낌표 등 punctuation 없음.
    - 한글로 작성. 단, 파일명·고유명사·기술 용어는 영어 원문 유지 (예: `feat: ContentWrapper에 max-w-7xl variant 추가 (v0.11.40)`).

    **Amend/rewrite safety:** If the task is only to amend existing commit messages, preserve each commit's exact changelist/tree and original author + committer datetime. Recreate commits with the same tree and dates, then verify old/new pairs with `git show -s --format='%aI|%cI|%T'`. Push rewritten history only when explicitly requested, and use `--force-with-lease`, never plain `--force`.

2a. **Commit grouping**: 여러 무관한 변경을 하나의 commit에 묶지 말 것. 기능별·관심사별로 분리해 commit. 한 번에 4개 이상의 무관한 파일이 staged 상태면, 분리 가능 여부를 검토하고 필요하면 user에게 확인.

    **여러 독립 변경이 동시에 있을 때**:
    - 각 변경을 별도 commit으로 순차 처리
    - commit마다 해당 변경에 필요한 파일만 stage
    - `package.json` version, `docs/changelogs/<today>.md`, `PR_<branch-name>.md`는 **각 commit 범위에 맞게 따로** 반영
    - 첫 번째 commit을 만든 뒤 남은 변경이 있으면, 같은 절차를 반복해 다음 commit 생성
    - 서로 다른 변경을 하나의 version bump나 하나의 CHANGES 항목으로 합치지 말 것

2b. **Path quoting**: Next.js route group `(frontend)` 와 dynamic segment `[slug]` 는 shell metacharacter이므로 `git add` 시 반드시 큰따옴표로 감쌀 것:

    ```bash
    git add "src/app/(frontend)/blog/[slug]/page.tsx"
    git add "src/app/(frontend)/portfolio/[slug]/page.tsx"
    ```

    Unquoted path는 shell glob expansion 실패 + 추가 retry로 토큰 낭비.

3. **Version bump**: Increment the patch version in `package.json` to match the commit message version only IF there are any code changes. If the commit is purely about docs or deleting files, then the version change must not occur. If the git unstaged changes already includes a `package.json` with its version updated, then the version change must not occur.

4. **Update branch-specific PR file**: If the current branch is anything other than the `main` branch, update `PR_<branch-name>.md` in the project root (replace `/` with `-`) with a concise entry describing what changed. Never create or update plain `PR.md`. If a legacy `PR.md` exists, migrate any needed content into the branch-specific file and delete `PR.md`.

5. **Update today's changelog**: Add a concise entry to `docs/changelogs/<YYYY-MM-DD>.md` (today's date) describing what changed. Use `## v<version>` header (no date — filename encodes it). Create the file with `# Changelog: YYYY-MM-DD` header if it doesn't exist yet, and add a row to the `docs/CHANGES.md` index if today's date isn't listed.

6. **Commit only, do NOT push**: Stage relevant files, commit, and stop. Do not run `git push` unless explicitly prompted by the user.

7. **Testing gate**:
    - **Commit-time (unit)**: If there are any code changes, verify **unit tests** pass (`pnpm exec vitest run`) before committing. Pre-commit hook already enforces this via husky + lint-staged. Docs-only 또는 파일 삭제만 있는 commit에서는 test 생략.
    - **Push-time (E2E, 로컬 strict)**: `git push` 시 `.husky/pre-push`가 `pnpm exec playwright test --project=chromium --project=authenticated-chromium` 를 자동 실행. E2E 실패 시 push 차단. CI E2E workflow는 v0.12.50에서 제거됨 (R2 `pub-*.r2.dev` 가 GitHub Actions IP를 abuse filter로 차단). `--no-verify`로 commit/push hook 우회 금지.

$ARGUMENTS
