---
name: team-execution
description: (team-execution) Coordinate an explicit bounded Hive team through signed lanes, immutable mailbox messages, barriers, shared-path leases, cancellation, and terminal Judge evidence.
---

# Hive Team Execution

Coordinate bounded host-native lanes over one canonical Hive event chain.

## Workflow

1. Require a Hive-configured project, exact run ID, lane roles, path scopes, barrier membership,
   quorum, budgets, and verified host capabilities.
2. Canonicalize every shared path for platform case, Unicode, symlinks, and parent-child overlap.
   Acquire leases in stable path order; reject overlaps before dispatch.
3. Commit immutable mailbox messages with sender, recipient, sequence, and digest. Exact duplicates
   are no-ops; conflicting bytes quarantine the lane.
4. Use `$aigent-hive:verified-workflow` within each lane. The active host launches native tasks
   and returns typed receipts; Hive never launches them.
5. Evaluate barriers against their committed membership revision, quorum, timeout, and failed-lane
   rule. Parent cancellation fans out through signed cancel events and quarantines late results.
6. Require a reserved independent Judge and external signature before terminal team acceptance.

## Boundaries

- Keep executor and verifier roles separate.
- Bound mailbox bytes, message counts, lane counts, leases, and retention.
- Do not call provider APIs, store credentials, spawn processes, or invoke OMX/OMC.
