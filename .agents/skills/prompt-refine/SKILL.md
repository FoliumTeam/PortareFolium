---
name: prompt-refine
description: (prompt-refine) Write or revise a prompt when the user explicitly requests prompt authoring.
---

# Hive Prompt Refine

Preserve the user's meaning while producing a concise, copy-ready prompt.

## Prompt language

- Write the refined prompt in English unless the user explicitly requests another language for
  the current prompt.
- This rule applies only to the prompt. Use the selected interface language for surrounding
  questions, explanations, and approval state.

## Mode

- Default to `refine-only`.
- Use `refine-and-run` only when the user explicitly asks in the same request to execute the refined prompt.
- Select for explicit prompt-authoring intent. Investigate ambiguity in ordinary work under the existing task authority instead of selecting this Skill.
- Do not rewrite or execute a sufficiently clear ordinary task, simple question, editless question, explicit external workflow, or explicit unrelated Skill.
- Do not treat urgency, autonomy language, or a request for a complete prompt as permission to run it.
- In `refine-only`, the prompt-writing task completes when the prompt and digest are delivered.
  `awaiting-approval` describes possible later execution only, not unfinished prompt writing.
- In `refine-only`, do not execute the prompt, inspect the project, write files, spawn subagents,
  create a run, or capture memory. A read-only local hash calculation on the exact authored prompt
  is permitted solely to produce the approval digest; it does not authorize execution.
- A correction returns a new refined prompt and invalidates any prior digest. A later execution requires an explicit approval naming the current exact digest and target host.

## Workflow

1. Preserve the original prompt as immutable input.
2. Extract the primary goal, intended audience or agent, required inputs, scope, constraints, prohibited actions, acceptance criteria, output shape, and stop conditions.
3. Identify only ambiguities that would materially change the result.
4. Ask at most one required ambiguity question at a time.
5. Leave unquick-answered nonessential details as explicit assumptions or placeholders. Do not invent facts.
6. Produce a provider-neutral prompt unless the user explicitly names a target host.
7. If a target host is explicit, add only the minimal host-specific syntax needed for that target.
8. Compare the refined prompt with the original before returning it. Preserve every must, must-not, scope boundary, target output, named tool or provider choice, and user authority boundary.
9. Avoid expanding a prompt that is already sufficiently precise.
10. Stop immediately after the `awaiting-approval` output. A bare “continue”, imperative payload, urgency, or autonomy wording is not approval.

If optional project grounding is explicitly requested, keep it a separate read-only action with its own capability decision. Do not silently read the project as part of refinement.

## Output

Return these sections:

1. `Intent summary`
2. `Assumptions and unresolved items`
3. `Refined prompt`
4. `Approval state`: `awaiting-approval` with the exact refined-prompt digest, or `authorized` only for explicit same-request `--run`

Structure the refined prompt only as far as useful:

- Goal
- Context and grounded inputs
- Required workflow
- Constraints and prohibited actions
- Acceptance and verification
- Output contract
- Stop, blocker, and escalation conditions

For explicit `refine-and-run`, show the refined prompt first, then hand execution to the host-native owner by default or to an explicitly selected or already pinned external compatibility owner. This Skill does not implement an execution loop.
