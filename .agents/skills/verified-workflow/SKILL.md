---
name: verified-workflow
description: (verified-workflow) Coordinate a Hive run needing dependency gates, bounded retries, and independent verification beyond ordinary continuation.
---

# Hive Verified Workflow

Use only when the active run needs dependency edges, intermediate evidence, bounded retry,
independent verification, steering, or exact recovery. The active host owns every model, task, and
Judge launch. Hive owns only canonical state, prepared envelopes, receipts, and verification.

## Scope and policy

In an installed consumer project, load `.agents/directives/00-project-harness.md` for continuation
and closure. In a Hive source workspace identified by `hive-source.json`, load
`.agents/directives/01-behavior.md` and `.agents/directives/04-documentation-state.md` instead.
Follow their reviewed runner-binding procedure; do not initialize consumer state at the source
root. If no supported binding exists, report the workflow as not active and continue authorized
source work under the source plan. Do not infer host support or installation consent.

## Workflow

1. Require an exact target, run ID, finite criteria, retry and usage budgets, verifier roles, and
   fresh host capability evidence. If a required capability is `unsupported` or `unverified`,
   return `host_capability_unsupported` for the affected dispatch without a fallback. Preserve the
   outer task and apply its policy to independent work and safe recovery.
2. Define the dependency graph with criterion ownership, evidence predicates, retry policy, and
   independent verifier for every node. Initialize and validate it:

   ```text
   hive loop initialize --target <project-root> --graph <graph.md> --output json
   hive loop validate --target <project-root> --run <run-id> --output json
   ```

   Reject graph execution on a cycle, self-edge, unreachable node, orphan criterion, missing
   evidence predicate, or invalid terminal transition. Repair and revalidate before dispatch.
   Only after both commands succeed may the workflow be reported as active. Record the exact
   target, run ID, graph revision/digest, receipts, and mapping to the user's criteria. Selecting
   or reading this Skill, or passing an unrelated acceptance test, is not activation evidence.
3. Before every automatic dispatch, run `$aigent-hive:usage-guard`. A limited or unknown result
   leaves the node pending and never authorizes success.
4. Commit `reserved` then `prepared` through `hive orchestration plan`, or prepare one validated
   loop node through `hive loop prepare`. Bind the exact graph revision, capability evidence,
   usage authorization, role, node, attempt, and brief digest. Accept only
   `prepared_only=true` and `spawned=false`.
5. Give that envelope to the active host. Hive never launches a model, subagent, Judge, or process.
   Record only exact claim, launch, heartbeat, lookup, cancellation, and result receipts. Lost
   acknowledgement is `dispatch-uncertain`; never reclaim without qualified non-launch proof.
6. Verify each criterion independently. Use a deterministic verifier by default. A Judge node or
   elevated risk uses `$aigent-hive:adversarial-judge` and the authenticated quorum contract; an
   implementation agent never accepts its own result.
7. Retry only inside the node's declared budget. Repeated failure fingerprints, exhausted budget,
   quarantine, or missing attestation stop that node's automatic attempts, not the outer task.
   Preserve evidence and limits; inspect authorized recovery and independent work under the loaded
   policy. Never create a replacement run to reset a budget. User cancellation takes priority.
8. Apply the closure procedure from the policy selected above, using this task's actual bound run
   and current evidence. Do not substitute a progress report for that procedure.
9. Record topology changes only through `hive loop steer` with the reason, affected edges, user
   boundary, and new immutable revision. Recover a new session only through `hive loop recover` or
   `hive orchestration recover`.

## Natural continuation routing

Natural continuation selects this workflow only when at least two of the following signals are
present: three-step dependency, intermediate evidence gate, bounded retry, independent verifier,
topology steering, or exact recovery. Task length and a bare `continue` request do not select it.

User override:

- `간단한 continuation`: normal Goal·closure path
- `검증형 workflow`: this Skill
- `retry 없음`: no retry policy

## Boundaries

- Hive must not launch model or subagent processes or call provider APIs. The host may run
  authorized CLI checks, builds, tests, and native tasks; this restriction does not prohibit them.
- Do not access provider credentials or invoke OMX/OMC.
- Do not create a second scheduler, mutate a host Goal, or infer host capability.
- Do not use a Judge for scheduler ticks, heartbeats, ordinary retries, or an implementation
  agent's self-review.
- Do not edit canonical run files directly. Use the signed Hive CLI and immutable revisions.
