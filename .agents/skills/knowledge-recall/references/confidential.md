# Confidential retrieval

Read only for an explicitly approved confidential query.

4. For every confidential collection, including the current collection, require the user's
   approval for this exact query, then issue a short-lived authorization bound to fresh
   capability and usage snapshots. Target identity alone never authorizes confidential data:

   ```text
   hive knowledge authorize-confidential --user-root <user-root> --target <current-project-root> --collection <id-or-alias> --query <query> --capabilities <current-capabilities.json> --usage <current-usage.json> --expires-at <unix-seconds-within-60-seconds> --nonce <unique-current-action-nonce> --confirm-current-action --output json
   hive knowledge retrieve --user-root <user-root> --target <current-project-root> --scope collection:<resolved-id> --query <query> --top-k 5 --byte-budget 16384 --authorization-id <authorization-id> --authorization-token <authorization-token> --capabilities <same-current-capabilities.json> --usage <same-current-usage.json> --output json
   ```

   Use the returned token once, in the same action, with the same query and snapshots. Never log,
   persist, cache, transfer, or reuse it. Reject expiry, replay, target drift, query drift, snapshot
   drift, or a forged token without falling back to broader retrieval.
   For a semantic question, add `--mode semantic` to the authorized retrieve command and consume
   that same single query approval once. A query approval never authorizes vector construction.
