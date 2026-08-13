---
name: amend-directive
description: Preview and amend user-owned Hive behavior directives without weakening compiled safety boundaries.
---

# Amend Hive behavior

Use this Skill when a user asks to change how Hive behaves globally, in a project, or while maintaining the Hive source.

1. Identify the requested scope and read the applicable directive ownership markers.
2. Show the exact owned files or marker blocks that would change and preserve all other local text.
3. Change the canonical directive source and its generated Hive projection together when the repository defines both.
4. Verify the resulting directive is readable and that no foreign bytes were replaced.

## Immutable boundaries

Never change compiled path ownership, signature verification, credential handling, provider API prohibition, or foreign-byte preservation through a directive amendment. Never edit a signed release cache directly. Ask before an optional third-party Skill or external integration is activated.
