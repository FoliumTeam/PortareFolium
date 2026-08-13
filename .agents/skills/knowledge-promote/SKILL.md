---
name: knowledge-promote
description: Review and promote an eligible project-neutral fact, reusable preference, or portable workflow from project knowledge into user-scope Hive knowledge.
---

# Hive knowledge promotion

Use only when the user identifies or approves an exact project Wiki page or reviewed scan claim.

1. Reject confidential, credential-adjacent, project-exclusive, private-path, unrelated,
   ambiguous, or excluded content.
2. Resolve the user store bound during project setup as `<user-root>`.
3. For an existing Wiki page, classify it as exactly one of `fact`, `preference`, or `workflow`
   and preview:

    `hive knowledge promote --target <project-root> --user-root <user-root> --page-id <id> --category <category> --dry-run --output json`.

4. For a reviewed scan candidate, preview the exact claim and its current source digest:

    `hive knowledge promote --user-root <user-root> --collection <id-or-alias> --review-id <review-id> --dry-run --output json`.

5. Show redaction, provenance, deduplication, contradiction, and replacement decisions. A blocked
   contradiction requires a new reviewed decision; never infer a replacement.
6. Apply only after the user approves that exact preview. For a Wiki page, run:

    `hive knowledge promote --target <project-root> --user-root <user-root> --page-id <id> --category <category> --apply --output json`.

    For a reviewed scan claim, bind apply to the preview digest:

    `hive knowledge promote --user-root <user-root> --collection <id-or-alias> --review-id <review-id> --expected-source-digest <sha256:...> --confirm-global-promotion --apply --output json`.

    Reject stale digests, non-candidates, rejected claims, or missing current-action approval
    without mutation.

7. Confirm user-root canonical Markdown activation and derived SQLite rebuild. Verify the promoted
   fact is available from a fresh unrelated project through automatic bounded retrieval.

Never promote Raw content directly or promote a scan claim automatically. Never copy a project
path, credential, token, cookie, private endpoint, customer datum, or repository-exclusive
implementation detail.
