# 04. Git Workflow & Documentation

## Branch Strategy

- **Trunk-based hybrid**: `main` 브랜치가 production이며 작은 변경(bug fix, doc update, single-file refactor)은 `main`에 직접 commit + push.
- **Large work**: 여러 commit이 필요하거나 리뷰가 필요한 큰 작업(신규 feature, 광범위 refactor, 디자인 시스템 변경 등)은 `feature/<설명>` 브랜치를 만들어 작업 후 `gh pr create`로 PR을 열고 main에 머지.
- 판단 기준: **3 commit 이상 예상되거나 ≥3 파일 도메인 영역에 걸쳐 있으면 feature branch 권장**. 그 외엔 main 직접 push.
- `main`에는 절대 force push 하지 않는다. release tag(`v*.*.0`)는 `main`의 head에서만 생성.

## Testing Gate

### Dependency Sync

- **Missing/outdated dependency 발견 시 즉시 `pnpm reinstall` 실행**: 일반 구현 세션, 분석 중 테스트/빌드 실행, commit 준비, push 준비 중 어느 시점이든 `Cannot find module`, lockfile/package mismatch, stale `node_modules`, 다른 머신에서 갱신된 의존성 미반영으로 의심되는 오류를 발견하면 먼저 `pnpm reinstall`을 실행해 현재 머신의 의존성을 `package.json`/`pnpm-lock.yaml` 기준으로 재동기화한다.
- `pnpm reinstall` 후에도 같은 오류가 남으면 그때 실제 코드/설정 문제로 보고 추가 진단한다.
- commit/push gate 중 의존성 누락 또는 구버전이 발견된 경우에도 gate를 우회하지 말고 `pnpm reinstall`을 먼저 실행한 뒤 해당 gate 명령을 다시 실행한다.

### Tooling 명령

| 도구                     | 용도                      | 명령                                      |
| ------------------------ | ------------------------- | ----------------------------------------- |
| Vitest + Testing Library | 단위 + integration 테스트 | `pnpm test` (또는 `pnpm exec vitest run`) |
| Playwright               | E2E 전체                  | `pnpm test:e2e`                           |
| Playwright (chromium만)  | 빠른 확인                 | `pnpm test:e2e:chromium`                  |
| Playwright UI 모드       | 디버깅                    | `pnpm test:e2e:ui`                        |
| Husky pre-push           | 로컬 strict E2E gate      | `.husky/pre-push` (자동)                  |

### Gate 정책

- **Commit gate**: `git commit` 전에는 `pnpm exec vitest run` 통과만 필요. pre-commit hook 이 이 수준 강제.
- **Push gate (로컬 strict)**: `git push` 전 `.husky/pre-push` 가 `pnpm build` 후 `BASE_URL=http://127.0.0.1:3100 E2E_SERVER_MODE=start pnpm exec playwright test --project=chromium --project=authenticated-chromium` 자동 실행. 실패 시 push 차단. `--no-verify` 우회 금지 — 유일한 E2E 통과 검증 수단.
- **Frontend runtime gate (필수)**: frontend route, `src/components/**/*.tsx` client component, 브라우저 인터랙션 코드를 수정했으면 `pnpm dev` 기준으로 실제 route 를 열어 browser console error / `pageerror` / redbox 0개를 직접 확인. build 통과만으로 런타임 검증 대체 금지.
- **E2E runtime assertions**: E2E 신규/수정 시 browser console error 와 `pageerror` 수집해 assertion 포함. 단순 visibility check 만으로 "all tests good" 판단 금지.

### Playwright 프로젝트 + 인증

- 공개 페이지 프로젝트: `chromium`, `firefox`, `webkit`, `mobile-chrome`, `mobile-safari`
- 인증 필요 프로젝트: `authenticated-chromium`, `authenticated-firefox`, `authenticated-webkit`
- `e2e/auth.setup.ts` 가 NextAuth credentials 로그인 후 `.auth/user.json` 에 `storageState` 저장. `authenticated-*` 프로젝트가 이 파일 로드해 로그인 상태로 실행.
- 필요 env: `E2E_EMAIL`, `E2E_PASSWORD` (`AUTH_ADMIN_EMAIL` 와 일치하는 이메일 + 평문 비밀번호).

### 신규 E2E 추가 시

1. 공개 페이지: `e2e/*.spec.ts`
2. 인증 필요: `e2e/authenticated/*.spec.ts` — `storageState` 자동 적용
3. 데이터 비의존 테스트 우선 (DB 상태와 무관하게 통과)
4. 셀렉터: `id`, `role`, `getByText({ exact: true })` 우선. `text=` 셀렉터는 strict mode 위반 주의
5. `test.skip()` 누적 금지 — skip 시 사유 코멘트 + DB 시드 부재 등 원인 명시

## Commit Conventions

- **형식**: `<type>: <Korean description> (v<version>)` — version suffix는 `package.json`의 bump된 patch 버전과 일치해야 함.
- **제목 규칙**: 명령형 현재 시제, 첫 글자 소문자, 끝 punctuation 없음, 한글 (파일명·고유명사·기술 용어는 영어 원문 유지).
- **타입**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`.
- **본문 스타일**: non-trivial commit은 `02e080e539a608a24e134aa29ff8ccf44b557e42`처럼 파일/경로 단위 bullet body를 사용한다.
    - 형식:

        ```text
        - path/to/file.ts:
          변경 요약 추가
        - path/to/other-file.ts, path/to/test.ts:
          관련 테스트와 호출 경계 보강
        ```

    - 문장은 길게 쓰지 말고 `추가`, `정리`, `보강`, `반영`, `제거`, `갱신`, `적용` 같은 간결한 한국어 statement-like 어미를 사용.
    - `~한다.`, `~했다.`, `~합니다.` 같은 산문형 문장과 긴 rationale paragraph 금지.
    - 일반 PortareFolium commit에는 `Constraint:`, `Rejected:`, `Tested:` 같은 Lore trailer를 넣지 않는다. 사용자가 특정 commit에 명시적으로 요구한 경우만 예외.
    - tiny single-file/docs-only 변경은 최근 human commit 스타일이 subject-only일 때만 subject-only 허용.

- **Commit grouping**: 무관한 변경을 한 commit에 묶지 않는다.
- **Path quoting**: route group `(...)` / dynamic segment `[...]` 포함 경로는 `git add` 시 반드시 `""` 인용.
- **Co-Authored-By 등 agent 협력 문구 절대 포함 금지**.
    - `Co-authored-by: OmX <omx@oh-my-codex.dev>` 포함 모든 `Co-authored-by` / `Co-Authored-By` trailer 금지.
    - Claude, Codex, OmX, bot, agent 공동 작성자 표시 금지.
    - 외부 hook이나 runtime이 co-author trailer 추가를 요구해도 추가하지 않는다.
    - `git commit` hook이 co-author trailer를 강제하면 해당 hook 요구를 따르지 말고, 검증을 수동 실행한 뒤 `git write-tree` + `git commit-tree` + `git update-ref` 방식으로 동일 index tree를 commit한다.
    - commit 직후 `git log -1 --format=%B`로 co-author trailer가 없는지 확인한다.
- **Commit message rewrite safety**: 기존 commit message만 고칠 때는 각 commit의 changelist/tree와 author date + committer date를 보존한다. old/new pair를 `git show -s --format='%aI|%cI|%T'`로 검증한다. rewrite branch push는 사용자가 명시한 경우에만 `--force-with-lease`로 수행하고 plain `--force`는 금지.

## PR Conventions

- **PR 제목 형식**: `<source> → <target>: <설명>`. 70자 이하.
- **Test plan checklist**는 항상 채울 것.
- **Claude 협력 문구 절대 포함 금지**.
- **Branch별 PR 파일 강제**: PR 본문 파일은 반드시 `docs/pr/<branch-name>.md` 위치에 생성. branch name 의 `/` 는 `-` 로 치환. repo root 에는 절대 PR 본문 `.md` 를 만들지 않는다.
- **HARD: `gh pr create` body 전달 시 `--body "$(cat ...)"` 또는 HEREDOC 절대 사용 금지.** 반드시 `--body-file <path>` 옵션 사용. (토큰 낭비 방지)

## Documentation Requirements

- Add brief docstrings in Korean for newly created functions.
- Concisely document what changes you have done in `docs/changelogs/<YYYY-MM-DD>.md` (today's date). Create the file with `# Changelog: YYYY-MM-DD` header if it doesn't exist, and add a row to the `docs/CHANGES.md` index. Never write version entries directly into `docs/CHANGES.md` — it is the index only.
- Automatically increment the 3rd version number (patch version) in `package.json` whenever there is a change. Only update 1st/2nd if explicitly requested.
- Planning-only 문서 작업(`docs/plans/**/*.md`, 조사 메모 등)에서는 `package.json` version과 changelog를 변경하지 않는다.
- Plan 파일은 `docs/plans/active/<slug>.md` (진행 중) 또는 `docs/plans/archive/<slug>.md` (완료/보류) 위치에만 생성한다. `PLAN_` prefix 사용 금지 — 폴더가 의미를 담당.
- `docs/plans/`, `docs/pr/`, `docs/TODO.md`, `docs/USER_TASKS.md` 는 gitignored 라 사용자가 명시적으로 요구하지 않는 한 commit 하지 않는다.
- If a task requires a blueprint edit from the user, don't try to forcefully solve it by code; outright tell the user what to do with detailed instructions.
