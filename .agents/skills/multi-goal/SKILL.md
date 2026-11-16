---
name: multi-goal
description: (multi-goal) Execute an explicit bounded Hive goal graph with AND, OR, or quorum aggregation, nested budgets, cancellation, evidence, and terminal independent Judge gates.
---

# Hive Multi-Goal Execution

Coordinate a bounded goal graph over canonical Hive orchestration state.

## Workflow

1. Require an exact root goal, uniquely owned criteria, parent-child provenance, finite budgets,
   and one declared `AND`, `OR`, or quorum aggregation rule per parent.
2. Commit decomposition and later topology changes as signed event revisions. A planner or user
   authority is required for decomposition changes.
3. Reserve the parent budget before child allocation. Refund unused child budget exactly once.
4. Use `$aigent-hive:team-execution` for parallel children and
   `$aigent-hive:verified-workflow` for retrying criteria. Preserve evidence through nested
   cancellation and rollback.
5. Apply the terminal lattice without treating `blocked`, `failed`, `cancelled`, or `quarantined`
   as progress. A parent completes only when its aggregation rule and all required verified
   evidence are satisfied.
6. Require reserved goal-level and aggregate-level Judge results with external signatures before
   terminal acceptance.

## Boundaries

- Never let partial success silently satisfy an `AND` parent.
- Never exceed parent budget or reuse a refunded allocation.
- Do not call provider APIs, store credentials, spawn processes, or invoke OMX/OMC.
