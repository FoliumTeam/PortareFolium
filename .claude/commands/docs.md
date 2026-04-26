# docs

Update project documentation to reflect recent code changes. Run the following steps **in order**, skipping any step that has nothing to do.

## Step 1: Update today's changelog

1. Run `git log --oneline -20` and `git diff HEAD~5 --stat` to identify recent changes not yet documented.
2. Determine today's date (YYYY-MM-DD). Check `docs/changelogs/<today>.md` for the latest documented version. If the file doesn't exist yet, create it with the header `# Changelog: YYYY-MM-DD`.
3. If there are undocumented commits, prepend a new version entry to `docs/changelogs/<today>.md` following the existing style:
    - Increment the patch version from the latest entry across all changelogs (e.g., `v0.11.7` -> `v0.11.8`)
    - Use the format: `## v<version>` with `### <Type>: <Korean summary>` (no date in header — filename encodes the date)
    - List changed files with brief descriptions
4. If today's date is not yet in the `docs/CHANGES.md` index, add a row for it (newest-first order).
5. If the changelog is already up to date, say so and move on.

**Structure**: Changelogs are split by date under `docs/changelogs/YYYY-MM-DD.md`. `docs/CHANGES.md` is the index only — never write version entries directly into it.

## Step 2: Write PR\_<branch>.md (non-main branches only)

1. Check the current branch with `git branch --show-current`.
2. If the branch is `main`, skip this step entirely.
3. Otherwise, run `git log main..HEAD --oneline` and `git diff main...HEAD --stat` to see all branch changes.
4. Create or update `PR_<branch-name>.md` (replace `/` with `-` in branch name) in the project root with:
    - **Title**: A concise PR title (under 70 characters)
    - **Summary**: 1-3 bullet points describing what changed and why
    - **Changed Files**: Grouped by category (feat/fix/refactor/docs/test)
    - **Test Plan**: Checklist of verification steps
5. Never create or update plain `PR.md`. If a legacy `PR.md` exists, migrate any needed content into the current branch file and delete `PR.md`.
6. Match the tone and format of the existing branch-specific PR file if one exists. If not, follow the nearest existing `PR_<branch>.md` example in the repo.

## Step 3: Update AGENTS.md project structure

1. Run `git diff HEAD~5 --stat` (or `git diff main...HEAD --stat` if on a non-main branch) to identify structural changes.
2. Read the `## Project Structure` section of `AGENTS.md`.
3. Only update if there are **structural** changes such as:
    - New components, pages, or lib modules added or removed
    - New directories created
    - Convention changes (new patterns, renamed concepts, removed systems)
    - Stack changes (new dependencies, framework upgrades)
4. Do NOT update for:
    - Bug fixes within existing files
    - Content changes (copy, translations)
    - Minor refactors that don't change the file tree or conventions
5. If updating, make **surgical edits** — touch only the lines that changed. Keep descriptions brief ("which is where", not full details).
6. If no structural changes exist, say so and move on.

## Output

After all steps, report a brief summary of what was updated (or that everything was already current).

$ARGUMENTS
