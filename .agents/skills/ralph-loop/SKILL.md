---
name: ralph-loop
description: Engineer and validate bounded evidence-gated Hive run graphs, checkpoints, retries, steering, and recovery while leaving every task launch to the active host. Use only for explicit graph or loop-engineering work.
---

# Hive Loop Engineering

Engineer durable graph state while leaving execution to the active host.

## Workflow

1. Require an explicit target, run identifier, goal, acceptance criteria, retry limits, and
   evidence predicates. Obtain fresh normalized host capability evidence. If required execution
   support is `unsupported` or `unverified`, return `host_capability_unsupported` without a launch
   request or fallback.
2. Initialize and statically validate the graph:

    ```text
    hive loop initialize --target <project-root> --graph <graph.md> --output json
    hive loop validate --target <project-root> --run <run-id> --output json
    ```

    Stop on a cycle, self-edge, unreachable node, orphan criterion, invalid terminal transition,
    or missing evidence predicate.

3. For automatic preparation, use this exact sequence. `$aigent-hive:usage-guard` alone is not a
   dispatch authorization:
    1. Run `$aigent-hive:usage-guard` for the current host session and stop unless it returns `allowed`.
    2. Resolve fresh host capabilities and retain the exact resolution path and
       `evidence_digest`.
    3. Issue one automatic resume authorization for the exact run, role, configured account
       digest, current qualified usage session, and fresh capability file. Never pass or expose a
       raw account identity. Omit `--threshold`, or pass only the installed identical value:

        ```text
        hive run resume --target <project-root> --run <run-id> --capabilities <fresh-resolution.json> --dispatch-intent automatic --account-digest <sha256:...> --role <role-id> [--threshold <installed-identical-value>] --output json
        ```

    4. Accept only the fresh one-time
       `.hive/runtime/dispatch-authorizations/<id>.json` issued by that resume result. Require its
       digest, the exact current usage-session control, and the fresh capability resolution
       path/digest to bind the same run action.
    5. Bind the returned usage-authorization evidence into the next graph revision before
       preparation:

        ```text
        hive loop checkpoint --target <project-root> --request <usage-authorization-checkpoint.json> --output json
        ```

    6. Put that checkpointed graph revision/digest, kind, node, brief digest,
       `usage_evidence_id`, and exact `capability_resolution` path into one prepare request. Never
       copy, forge, or reuse an authorization field.

    Then prepare exactly one ready node, retry, or steering request:

    ```text
    hive loop prepare --target <project-root> --request <request.json> --output json
    ```

    Accept only a host-native dispatch envelope with `prepared_only=true` and `spawned=false`.
    A prepared request is data only; this Skill never launches or retries work.

4. Let the active host own the launch. After it returns, independently verify each required
   criterion and evidence locator. Record only verified state:

    ```text
    hive loop checkpoint --target <project-root> --request <request.json> --output json
    ```

5. Apply explicit steering as a new revision with its reason, affected edges, and user boundary,
   then validate again:

    ```text
    hive loop steer --target <project-root> --request <request.json> --output json
    ```

6. In a fresh session, recover canonical graph state before preparing more work:

    ```text
    hive loop recover --target <project-root> --run <run-id> --output json
    ```

## Boundaries

- Keep retries inside each node's declared budget and stop repeated failure fingerprints early.
- Require independent verification before any success edge or `complete` terminal state.
- Use only `blocked`, `failed`, or `complete` as terminal outcomes.
- Reuse `$aigent-hive:run-checkpoint`, `$aigent-hive:run-resume`, `$aigent-hive:run-handoff`, and
  `$aigent-hive:package-review` for their narrow data contracts.
- Never edit canonical run files directly, invent host capability, hide an unsupported result,
  or create another execution owner.
