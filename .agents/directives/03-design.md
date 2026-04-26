# 03. Design System & UI

## Design System First (Strict UI Adherence)

- **No Random CSS**: Do not invent random CSS or inline styles. Do not use your own design sensibilities to create new layouts from scratch.
- **shadcn/ui & Tailwind Tokens**: Always check for and use existing `shadcn/ui` components first. Use ONLY the tokens defined in `tailwind.config.ts` and `global.css`.
- **Visual Consistency**: Any new UI element MUST inherit the existing layout, visual hierarchy, and color schemes (#XXXXXX) of the Admin Dashboard.
- **Proposing Changes**: If a radically new UI is required, do not just build it. First, propose the design using `v0.dev` best practices and request user approval.

## Implementation Specifics

- **Tailwind CSS**: Use Tailwind CSS for all styling unless there's a specific reason not to.
- **Button styles**: Every buttons like for example, "add project", "edit", "delete" must have a style of a solid background color, white text, and rounded corners. The text inside those buttons must not shrink or grow, nor be transferred into the next line (nowrap).
- **Animations**: Use existing global animation utilities (`.animate-fade-in-up`, `.animate-fade-in`, `.stagger-1~5`, `.card-lift`, `accordion-down/up` in `global.css`). Scroll-reveal is intentionally NOT used — do not hide content to induce scrolling.
- **Global CSS Utilities**: Use existing utilities like `no-focus` (removes focus ring), Shiki code block line numbering (CSS counter), exclusive-range breakpoints (`--mobile-only`, `--tablet-only`, `--laptop-only`, `--not-desktop`).

## shadcn/ui + Tailwind v4 token registration

Tailwind v4 uses `@theme` or `@theme inline` blocks. When adding a new shadcn primitive:

1. You MUST ensure its required color tokens (`--color-*`) are registered in `src/styles/global.css` `@theme inline` block. Missing tokens will cause the component to render invisibly.
2. If it uses animations (`animate-in`, `fade-in-0`, `zoom-in-95`), ensure `tw-animate-css` is in `package.json` and `@import "tw-animate-css"` is in `global.css`.
3. When using Radix primitives (e.g., `TooltipTrigger asChild`), do NOT wrap the child in a `<span>` unless absolutely necessary (like disabled states). Pass the interactive element directly.
