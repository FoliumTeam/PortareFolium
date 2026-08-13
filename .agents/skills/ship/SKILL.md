---
name: ship
description: Prepare one or more focused, verified commits using the current repository rules. Split every independently reviewable and revertible concern, including when the user asks to ship all changes. Use when the user asks to commit, ship, stage and commit, or split a change set. Push only when explicitly authorized.
---

# Ship changes

Use this Skill when the user asks to commit, ship, stage and commit, or split a change set.

1. Read the repository's `AGENTS.md` and every referenced Git or commit guide.
2. Inspect `git status`, the complete staged and unstaged diff, untracked files, and recent human-authored commit style before staging.
3. Interpret a scope such as “all files” or “all changes” as permission to process every in-scope concern, never as permission to create one aggregate commit.
4. Define a concern by independently reviewable and revertible intent, never by file proximity, shared task origin, or staging convenience.
5. Before staging, write a concern map with one entry per proposed commit: intent, exact files or hunks, nearest verification, and proposed message. Treat documentation, product behavior, tests, generated projections, release metadata, and unrelated maintenance as separate concerns unless they are mechanically inseparable.
6. For files containing more than one concern, use patch staging or sequence the edits. Do not add an entire file merely because one hunk belongs to the current concern.
7. Process one concern at a time: stage only its paths or hunks, inspect the staged diff, run its mapped verification, and commit using the repository's style. Do not start an unrelated concern while a completed one remains uncommitted.
8. After each commit, re-inspect the remaining worktree and refresh the concern map. Continue until every authorized concern is either committed or explicitly left untouched because its ownership or scope is unclear.
9. Push only when the user explicitly authorizes it. Never rewrite history, bypass hooks, or stage unrelated changes.

## Commit messages

- Match the last two human-authored commits when the repository has an established style. Otherwise use a concise Conventional Commit subject such as `<type>: <description>` with no ending punctuation.
- Use a concise file- or path-scoped body for a non-trivial commit when the repository style permits it. Do not use a body to combine separate concerns.
- Never add a `Co-Authored-By` trailer for an AI, bot, agent, Codex, Claude, or Gemini identity. Do not bypass a commit hook to remove or avoid a trailer; report the hook conflict instead.

## Boundaries

- Do not embed a repository's branch names, release policy, or version rules in this Skill.
- Do not create a commit merely because files are staged.
- Do not amend, rebase, split historical commits, or force-push unless the user explicitly requests that history change.
- Do not use provider credentials, invoke a provider API, or edit foreign files.
