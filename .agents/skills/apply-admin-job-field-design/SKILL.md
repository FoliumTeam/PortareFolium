---
name: apply-admin-job-field-design
description: Apply PortareFolium's card-based Admin design to a job-field-aware configuration or content panel. Use when creating or refactoring Admin Config, About, Resume, Portfolio, or similar controls that must keep common defaults separate from per-job-field overrides, inheritance, and reset behavior.
---

# Apply Job-Field Admin Design

## Workflow

1. Inspect the current panel, related server action, types, and public data consumers.
2. Build the job-field list from DB bootstrap data. Do not hardcode IDs such as `web` or `game`.
3. Clearly separate shared defaults from the selected job field's override. Do not stack editors for every job field on one screen.
4. When no override exists, show the shared-value state and an explicit creation action. Clone shared values on creation and remove only the override on reset.
5. Preserve the existing fallback structure and public-route contract in the save payload.

## Screen Structure

- Header: compact English eyebrow, Korean title, and one-line description.
- Shared information: a surface card with icon, title, description, and content.
- Job-field selection: clickable cards from `jobFields`, showing emoji, name, public path, and either `Independent content` or `Using shared values`.
- Editing area: edit either shared defaults or one selected job field. Provide `aria-pressed` and clear `aria-label` values for selection.
- Value groups: cluster related inputs into smaller surface-subtle cards. Use an accent background with white text for primary actions.

## Data Rules

- Shared values: fallback for every job field without an override.
- Overrides: use the existing job-field-ID keyed data structure. Do not add a separate table or duplicate persistence model.
- Creation: copy every value also consumed by public pages, including descriptions, value pillars, experience, and competencies.
- Reset: after confirmation, remove only the selected job field key. Preserve shared values and all other job-field overrides.
- Empty job fields: distinguish shared fallback from an intentionally blank override in the UI copy.

## Implementation References

- Inspect the card hierarchy, spacing, and input density in [`src/components/admin/panels/SiteConfigPanel.tsx`](../../../src/components/admin/panels/SiteConfigPanel.tsx).
- Use [`src/components/admin/panels/AboutPanel.tsx`](../../../src/components/admin/panels/AboutPanel.tsx) as the reference for selection, inheritance, and reset flows.
- Inspect both the public route's merged fields and the Admin save payload. Do not change public fallback behavior only through an Admin UI change.
- Build field-specific UI from the list so renamed or newly added job fields continue to work.

## Verification

1. Run `pnpm exec prettier --write <changed-files>`.
2. Run `pnpm exec tsc --noEmit`.
3. Run the relevant Vitest suite and `pnpm build`.
4. When a development server is already running, verify affected public routes such as `/<job-field>/about` for job-field-specific content and browser errors.
5. Only when Admin authentication is available, verify selection, creation, reset, and save in the real panel. Do not guess or enter credentials.
