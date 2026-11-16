---
name: amend-directive
description: (amend-directive) Adapt directives from another project into independent target-project rules, or amend explicitly selected user-owned directives. Preserve safety boundaries and unrelated text.
---

# Amend Hive behavior

Use this Skill when a user asks to change how Hive behaves globally, in a project, or while maintaining the Hive source.

When the user asks to copy, bring over, or reuse another project's directives, read
[independent transplantation](references/transplant.md). Adapt the rules to the target project;
do not leave a copied-from preface or depend on the original project for normal use.

1. Identify the requested scope and read the applicable directive ownership markers.
2. Show the exact user-authorized files or owned marker blocks that would change and preserve all other local text.
3. Change the canonical directive source and its generated Hive projection together when the repository defines both.
4. Verify the resulting directive is readable and that no foreign bytes were replaced.

## Immutable boundaries

Never change compiled path ownership, signature verification, credential handling, provider API prohibition, or foreign-byte preservation through a directive amendment. Never edit a signed release cache directly. Ask before an optional third-party Skill or external integration is activated.
