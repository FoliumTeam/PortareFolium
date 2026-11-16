# Project harness upgrade

- Apply the availability gate in `00-project-harness.md` first. Without ready local Hive,
  leave the harness unchanged and report the prerequisite only for a requested upgrade.
  Ordinary collaboration never triggers setup or upgrade.
- Use `hive project upgrade --scan` before changing a release-generated directive or Skill.
- Authenticate the exact base recorded by the installed projection state.
- Replace an unmodified local file exactly with incoming bytes.
- For a modified local text file, add disjoint incoming hunks and preserve local overlapping hunks, except an authenticated Hive directive or Hive marker rule that directly contradicts an incoming safety or ownership rule.
- In a Hive directive, replace only a Hive-owned clause that directly contradicts an incoming safety or ownership rule; preserve every other user-authored, foreign, and non-conflicting local byte.
- Preview every directive change with its base, local, incoming, and final digests before apply. A preserved local clause is an explicit result, not an error.
- Never publish textual conflict markers.
- Keep active bytes unchanged when the base is missing, unauthenticated, or schema-incompatible.
- Require backup, plan digest, staged validation, atomic activation, and recover support.
