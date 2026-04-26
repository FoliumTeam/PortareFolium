# custom-release

Bump the project to the next minor version and publish a release tag **via a pull request** (direct pushes to `main` are blocked by policy). The `.github/workflows/release.yml` workflow picks up the tag and creates a GitHub Release that notifies fork owners watching the repo.

Run the steps **in order**, skipping any that have nothing to do.

## Step 1: Determine the target version

1. Read the current `version` field from `package.json`.
2. Compute the target version:
    - If the current patch is **not 0** (e.g., `0.11.37`) → bump to the next minor with patch reset (`0.12.0`).
    - If the current patch is **already 0** (e.g., `0.12.0`) → keep the current version. No bump needed; just tag and push if the tag doesn't already exist.
3. Verify the tag does not already exist remotely:
    ```bash
    git fetch --tags
    git rev-parse "v<target>" 2>/dev/null && echo "Tag exists — abort"
    ```
    If the tag already exists, stop and report — never overwrite an existing release tag.

## Step 2: Confirm the current branch is `main` and clean

1. Run `git branch --show-current`. If not on `main`, abort and report.
2. Run `git status --porcelain`. If the working tree has unstaged changes unrelated to a version bump, abort and tell the user to commit/stash first. Untracked files are OK.
3. Run `git fetch origin main && git status -uno` to ensure local `main` is in sync with remote (no diverged commits).

## Step 3: Create a release branch and bump version (only if Step 1 said to bump)

1. Create and switch to a release branch:
    ```bash
    git checkout -b release/v<target>
    ```
2. Update `package.json` `version` to the target version.
3. Add a release marker entry to the **top** of `docs/changelogs/<YYYY-MM-DD>.md` (today's date). Create the file if it doesn't exist, and add a row to the `docs/CHANGES.md` index if today isn't listed:
    - Format: `## v<target>`
    - Subheading: `### release: minor 버전 release` (or summarize highlights from the patches since the last release if obvious)
    - Keep it to 1–3 bullet points referencing the major changes; do **not** duplicate every patch entry — the patch entries in each date file remain as the detailed log.
4. Stage and commit:
    ```bash
    git add package.json docs/CHANGES.md docs/changelogs/<YYYY-MM-DD>.md
    git commit -m "release: v<target>"
    ```
5. Push the branch with upstream tracking:
    ```bash
    git push -u origin release/v<target>
    ```

## Step 4: Open a pull request and wait for merge

### 4a. Compose the PR description

Before calling `gh pr create`, build the PR body from the actual changes in this release. **Do not use a static template** — the body should reflect the real highlights of what's shipping.

Use this exact section layout (in order):

1. **`## Release v<target>`** — one-line intro: `이 PR은 \`main\`에 머지되면 v<target> 태그가 붙고 GitHub Release 워크플로우가 트리거됩니다.`
2. **`## Highlights`** — 3~6개 bullet. 직전 minor 이후(`docs/changelogs/` 아래 관련 날짜 파일들의 `v<prev-minor>.*` 전체 엔트리)를 훑어 **주제별로 그룹핑해 추상화**. 작성 규칙:
    - **개별 버전/커밋 번호 인용 금지** (예: `(v0.11.82, 89–90)` 같은 레퍼런스 금지) — 상세 내역은 `docs/CHANGES.md`에 있으므로 PR 본문은 독자가 한눈에 "이 minor에서 뭐가 바뀌었나"를 이해하는 요약이어야 함.
    - 한 bullet = **하나의 major 테마**, 한 문장 또는 짧은 두 문장 이내. 내부 nitpick/patch-level 수정(예: 단일 CSS 값 보정, revert)은 별도 bullet로 띄우지 말고 상위 테마에 녹이거나 생략.
    - 작은 인프라/문서/내부 리팩터링은 하나의 "내부 개선" bullet으로 통합.
    - 각 bullet은 **"무엇이 달라졌는지"** + **"사용자/개발자 관점에서의 효과"**를 드러낼 것. 파일 경로/함수명 나열 금지.
3. **`## Changelog`** — 아래 두 줄만 넣는다:
    - `- Version: \`<prev>\` → \`<target>\``
    - `- 세부 내역: [\`docs/CHANGES.md\`](./docs/CHANGES.md) 인덱스 및 \`docs/changelogs/\` 아래 날짜별 파일의 패치 로그 참고`
4. **`## Test plan`** — checkbox 리스트. 이번 릴리스에 포함된 기능/수정 영역을 실제로 확인하는 수동 체크 항목 (예: Gantt Chart 변경이 있었다면 `- [ ] GanttChartPanel에서 새 모달로 차트 생성/편집 동작`). 변경이 순수 인프라/문서면 `- [ ] CI 전부 green` 한 줄로 충분.
5. **`## Release checklist`** — 고정된 절차 확인:
    - `- [ ] CI green`
    - `- [ ] Merge this PR (squash 또는 merge commit — rebase 금지, 릴리스 커밋이 히스토리에서 식별 가능해야 함)`
    - `- [ ] Merge 직후 \`custom-release\` skill의 Step 5 (tagging)로 이어서 진행`

Keep the whole body in Korean (프로젝트 기본 언어 정책) except for code identifiers and section headers.

### 4b. Create the PR

**HARD: `--body "$(cat ...)"` 또는 HEREDOC 절대 금지.** Bash 도구가 파일 내용을 conversation context로 다시 읽어들여 토큰 낭비. 반드시 본문을 임시 파일로 저장한 뒤 `--body-file` 옵션 사용.

```bash
# Step 4a에서 작성한 본문을 Write 도구로 임시 파일에 저장
# (예: .omc/release-notes-v<target>.md)

gh pr create --base main --head release/v<target> \
  --title "release: v<target>" \
  --body-file .omc/release-notes-v<target>.md
```

PR 생성 후 임시 파일은 그대로 두거나 정리. 동일 규칙은 `gh pr edit --body-file`, `gh issue create --body-file` 등 모든 gh 명령에 적용.

PR URL을 사용자에게 보고하고 **여기서 멈춘다**. 자동 머지 금지 — 사용자가 PR이 `main`에 머지됐음을 확인해 줄 때까지 대기.

## Step 5: After PR merge — tag the release

Resume **only after** the user confirms the release PR has been merged.

1. Switch back to `main` and pull the merge commit:
    ```bash
    git checkout main
    git pull origin main
    ```
2. Verify the version in `package.json` on `main` matches `<target>`. If not, something went wrong with the merge — stop and report.
3. Create an **annotated** tag pointing at the current `HEAD` of `main`:
    ```bash
    git tag -a "v<target>" -m "Release v<target>"
    ```
4. Push the tag (tag pushes are allowed; only branch pushes to `main` are blocked):
    ```bash
    git push origin "v<target>"
    ```
    If the tag push is also blocked by policy, stop and ask the user to push the tag manually.

## Step 6: Verify the workflow run

1. Wait briefly, then check `gh run list --workflow=release.yml --limit 1` to confirm the workflow started.
2. Once it finishes, confirm the release exists with `gh release view "v<target>"`.
3. Report the release URL to the user.

## Output

Report:

- Previous version → target version (or "already on release version, no bump")
- Release branch + PR URL (Step 4)
- Tag pushed (Step 5)
- Workflow run status (Step 6)
- Release URL (Step 6)

$ARGUMENTS
