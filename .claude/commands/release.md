# release

Bump the project to the next minor version and publish a release tag. The `.github/workflows/release.yml` workflow picks up the tag and creates a GitHub Release that notifies fork owners watching the repo.

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

## Step 2: Confirm the current branch is `main`

1. Run `git branch --show-current`. If not on `main`, abort and report.
2. Run `git status --porcelain`. If the working tree has unstaged changes unrelated to a version bump, abort and tell the user to commit/stash first. Untracked files are OK.
3. Run `git fetch origin main && git status -uno` to ensure local `main` is in sync with remote (no diverged commits).

## Step 3: Bump version (only if Step 1 said to bump)

1. Update `package.json` `version` to the target version.
2. Add a release marker entry to the **top** of `docs/CHANGES.md`:
    - Format: `## v<target> (<YYYY-MM-DD>)`
    - Subheading: `### release: minor 버전 release` (or summarize highlights from the patches since the last release if obvious)
    - Keep it to 1–3 bullet points referencing the major changes; do **not** duplicate every patch entry — the patch entries below remain as the detailed log.
3. Stage and commit:
    ```bash
    git add package.json docs/CHANGES.md
    git commit -m "release: v<target>"
    ```
4. Push the commit: `git push origin main`.

## Step 4: Create and push the release tag

1. Create an **annotated** tag pointing at the current `HEAD`:
    ```bash
    git tag -a "v<target>" -m "Release v<target>"
    ```
2. Push the tag: `git push origin "v<target>"`.

## Step 5: Verify the workflow run

1. Wait briefly, then check `gh run list --workflow=release.yml --limit 1` to confirm the workflow started.
2. Once it finishes, confirm the release exists with `gh release view "v<target>"`.
3. Report the release URL to the user.

## Output

Report:

- Previous version → target version (or "already on release version, no bump")
- Tag pushed
- Workflow run status
- Release URL

$ARGUMENTS
