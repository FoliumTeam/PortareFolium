---
name: package-review
description: Validate a clean-context package and prepare authenticated Ed25519 judge-quorum inputs through the signed Hive CLI. Use when independent judging is explicitly required for existing artifacts; do not use for simple questions, judge execution, signing, verdict production, self-approval, or orchestration.
---

# Hive Judge Package

Validate provider-neutral judge artifacts. This Skill does not invoke a judge, create an identity or key, sign an artifact, attest a host session, or decide whether work passes.

## Workflow

1. Keep the simple-question gate first. Do not load this Skill for a self-contained quick-answer.
2. Confirm that deterministic verification has already run and that an independent judge package is explicitly required by the user or risk policy.
3. Run `hive judge package --help`. If unavailable, report the installed release as unsupported. Do not reproduce digest or filtering logic manually.
4. Read only the explicit goal, acceptance criteria, artifact references, fresh verification evidence references, known constraints, and target-relative request path selected for the subject.
5. Prepare a bounded JSON request for one subject and risk tier. Exclude:
    - task-agent chain-of-thought, hidden reasoning, self-score, and self-praise;
    - instructions that imply a preferred result;
    - every prior or concurrent judge result;
    - unreferenced project memory, role prose, runtime transcripts, and foreign runtime state.
6. Run exactly one read-only command:

    ```text
    hive judge package --target <project-root> --request <target-relative-request.json> --output json
    ```

7. Accept only a schema-valid `schemas/judge-package.schema.json` envelope whose reported digest matches the exact returned package. On an unsafe reference, forbidden context field, missing required evidence, or digest mismatch, stop without writing any file.
8. Require the already resolved host or external owner to seal a `judge-assignment.schema.json` artifact before any verdict. It must bind the exact package and criteria, requester, task agent, resolved owner, owner-provenance evidence, and distinct slot/instance/eligibility-evidence tuples. Reject requester or task-agent roster entries.
9. Require detached `judge-attestation.schema.json` artifacts for the assignment and every verdict. An external signer must use a private key that Hive never reads or stores. The signer key must be enrolled for the exact principal and `judge-assignment` or `judge-verdict` purpose in the user/admin-managed trust root.
10. Accept verdicts only through target-relative, bounded, no-follow reads. Each verdict must bind the assignment digest and exact assigned tuple and have a timestamp after assignment creation. Unknown, mismatched, duplicated, early, unsigned, or incorrectly signed tuples never count.
11. For critical work, require a separate `judge-approval.schema.json` artifact and `judge-approval` attestation after every eligible verdict. The requester, task agent, resolved owner, and assigned judges cannot provide that approval.
12. Run the read-only authenticated quorum validator with target-relative artifact paths and an external, agent-write-denied TOML public-key trust root:

```text
hive judge quorum --target <project-root> --request <target-relative-v2-request.json> --trust-root <admin-protected-absolute-path> --output json
```

13. Accept completion authority only when the aggregate result is `PASS`, `authenticated` is true, and the applicable 2/3 or 3/3+human rule passes. A schema-version 1 unsigned request is structural diagnostic evidence only and can never return completion-authorizing PASS.
14. Report only aggregate counts, aggregate status, authentication state, and whether approval is valid. Never report identities, keys, signatures, slots, findings, digests, statements, or one judge's result.

## Boundaries

- Never write an assignment, package, verdict, attestation, approval, trust root, run state, evidence, role, plan, status, handoff, or project file.
- Never call a model or provider API, spawn a subagent, launch a judge, aggregate verdicts, calculate quorum, or authorize completion.
- Never request, read, store, generate, import, export, or use a private signing key.
- Never let the task agent judge or approve its own result.
- Never manufacture requester, task-agent, owner, judge-instance, eligibility, or human-approver provenance. Missing authenticated owner provenance fails closed as `INDETERMINATE`.
- Never expose one judge's output to another judge before all independent results are sealed.
- Never create a plan, Ralph loop, team workflow, retry loop, automatic continuation, or orchestration substitute.
- Never select, replace, install, configure, invoke, or inspect private state for OMX/OMC. New v0.9 judging uses the pinned host-native owner by default. An explicitly selected external compatibility owner or legacy 0.8.x owner may coexist with this canonical Hive data Skill without being migrated or replaced.
