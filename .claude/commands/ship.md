# ship

Commit the current unstaged changes following these rules strictly:

1. **No Co-Authored-By**: Never include a Co-Authored-By line in the commit message.

2. **Commit message format**: Read the last two commits by the user (not by another collaborator, Claude or any bot) via `git log` and match their style exactly. The canonical project format is:

    ```
    <type>: <Korean description> (v<version>)
    ```

    The `(v<version>)` suffix is **mandatory** for PortareFolium and must match the bumped `package.json` version (see rule 3).

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

2a. **Commit grouping**: 여러 무관한 변경을 하나의 commit에 묶지 말 것. 기능별·관심사별로 분리해 commit. 한 번에 4개 이상의 무관한 파일이 staged 상태면, 분리 가능 여부를 검토하고 필요하면 user에게 확인.

2b. **Path quoting**: Next.js route group `(frontend)` 와 dynamic segment `[slug]` 는 shell metacharacter이므로 `git add` 시 반드시 큰따옴표로 감쌀 것:

    ```bash
    git add "src/app/(frontend)/blog/[slug]/page.tsx"
    git add "src/app/(frontend)/portfolio/[slug]/page.tsx"
    ```

    Unquoted path는 shell glob expansion 실패 + 추가 retry로 토큰 낭비.

3. **Version bump**: Increment the patch version in `package.json` to match the commit message version only IF there are any code changes. If the commit is purely about docs or deleting files, then the version change must not occur. If the git unstaged changes already includes a `package.json` with its version updated, then the version change must not occur.

4. **Update PR.md**: If the current branch is anything other than the `main` branch, add a concise entry to `PR.md` describing what changed. Match the existing section style.

5. **Update CHANGES.md**: Add a concise entry to `CHANGES.md` describing what changed. Match the existing section style.

6. **Commit only, do NOT push**: Stage relevant files, commit, and stop. Do not run `git push` unless explicitly prompted by the user.

7. **Testing gate — two-tier**:
    - **Commit-time (this command's scope)**: If there are any code changes, verify **unit tests** pass (`pnpm exec vitest run`) before committing. Pre-commit hook already enforces this via husky + lint-staged. Docs-only 또는 파일 삭제만 있는 commit에서는 test 생략.
    - **Push-time (strict — user 요청 시에만 실행, 기본 scope 아님)**: User가 명시적으로 push를 요청하면, push 이전에 **전체 크로스 브라우저 E2E가 통과**해야 한다. 최소 `pnpm exec playwright test --project=chromium --project=firefox --project=webkit --project=authenticated-chromium --project=authenticated-firefox --project=authenticated-webkit` 0 failure. 3개 엔진(Chromium/Firefox/WebKit) 모두 통과 필수. 한 건이라도 실패하면 push 금지 — fix 먼저. `docs`-only / 파일 삭제만 있는 push는 예외적으로 E2E 생략 허용. `--no-verify`로 hook 우회 금지.
    - 요약: unit은 commit에 충분, E2E는 push에 필수 (strict gate).

$ARGUMENTS
