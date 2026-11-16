# Bounded policy review

Use only for an existing approved Hive run and real checker evidence. This procedure is separate
from saving a reviewed durable fact through knowledge-capture.

1. Inspect `hive run policy-review --help` before using the installed contract. If unsupported,
   report that limitation without writing a replacement record by hand.
2. Use a bounded typed policy Evaluation already registered by exact digest in this run's
   `STATUS.md` evidence. The operation ID and target digest must match this run and target.
   Never fabricate checker success, copy a transcript, collect raw tool output, or scan other runs.
3. Choose only a registered rule and the evidence-supported proposed failure class. When the
   cause is uncertain, use `insufficient-evidence`. Missing rules are not the default explanation;
   existing-rule noncompliance, harmful rules, and tool/environment failures are distinct.
4. Within existing authority for run-artifact writes, preview the exact candidate, then add only
   that approved scope:

   ```text
   hive run policy-review preview --target <project> --run <id> --evaluation <run-relative-json> --rule <registered-rule> --class <failure-class> --output json
   hive run policy-review add --target <project> --run <id> --evaluation <same-json> --rule <same-rule> --class <same-class> --confirm <preview_digest> --output json
   ```

   If the result or approval is stale, inspect and preview again. Repeated evidence must preserve
   the existing candidate. An allowing evaluation can be added as counterevidence to that candidate.
   A new piece of evidence resets its review to pending. Never label the cause as proven.
5. Present the bounded proposal and counterevidence for human review. Use `accept`, `revise`,
   `reject`, or `cancel` only for the user's corresponding explicit review decision. Bind
   `--candidate <id> --confirm <book_digest>` from current `list` output; `revise` also needs
   the chosen `--class`. Acceptance authorizes no policy, AGENTS.md, Skill, or knowledge mutation.
6. Apply an accepted change only in a separately authorized task with its own current validation
   and recovery evidence. Do not create that task or activate another Skill automatically.

## Optional native notice

- Only for already-authorized project hook configuration, preview and apply
  `hive policy hooks ... --review-run <id>` on Codex or Claude. The run must have a recorded host
  session binding. Use the exact preview digest; do not manually alter host settings.
- The Stop hook returns only a bounded review warning for that run's matching host session.
  It never records evidence, changes candidates, continues a task, or declares completion.
- Antigravity has no supported non-continuing Stop notice in this adapter. Keep normal Stop
  behavior and inspect `hive run policy-review list --target <project> --run <id> --output json`
  explicitly. Do not return `continue` merely to display a notice.
- A missing notice is not evidence that no review is pending. Host load/trust, exact session
  binding, cancellation, and current run records affect delivery; use explicit status/list checks.
