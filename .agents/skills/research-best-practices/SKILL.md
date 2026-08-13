---
name: research-best-practices
description: Research current engineering best practices through a bounded read-only evidence pass that prioritizes official and upstream sources. Use for explicit best-practice, convention, or implementation-guidance research.
---

# Best Practice Research

Produce a current, citation-ready research handoff without editing the project.

## Workflow

1. Bound the question, target environment, relevant versions, decision criteria, and research
   date. State unresolved assumptions before searching.
2. Inspect repository facts read-only and label them separately from external guidance.
3. Use the smallest sufficient evidence set:
    - official specification or product documentation first;
    - upstream source, release notes, or maintainer documentation second;
    - a primary research paper or standards body when relevant.

    Prefer two independent primary sources when available. If only one authority exists, disclose
    that limitation instead of padding the set with weak summaries.

4. For each material claim, record the source title, direct locator, publication or update date,
   access date, applicable version, and a concise citation. Separate verified fact, repository
   observation, recommendation, and inference.
5. Reconcile conflicts by version, platform, maintenance status, and source authority. Mark stale
   or inapplicable advice and retain meaningful disagreement.
6. Return a bounded handoff containing findings, applicability, tradeoffs, conflicts, unknowns,
   and the recommended next action. When implementation is already authorized, finish this
   handoff before loading the implementation owner; never mix edits into this research pass.

## Boundaries

- Keep every local and external action read-only.
- Do not treat popularity, an uncited summary, or this repository's current behavior as a best
  practice by itself.
- Do not claim currency without fresh dates and versions.
- Cite sources near the supported claims and distinguish missing evidence from negative evidence.
