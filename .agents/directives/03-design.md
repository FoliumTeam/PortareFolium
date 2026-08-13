# 03. Design System & UI

## Design System First (Strict UI Adherence)

- **No Random CSS**: Do not invent random CSS or inline styles. Do not use your own design sensibilities to create new layouts from scratch.
- **shadcn/ui & Tailwind Tokens**: Always check for and use existing `shadcn/ui` components first. Use ONLY the tokens defined in `tailwind.config.ts` and `global.css`.
- **Visual Consistency**: Any new UI element MUST inherit the existing layout, visual hierarchy, and color schemes (#XXXXXX) of the Admin Dashboard.
- **Proposing Changes**: If a radically new UI is required, do not just build it. First, propose the design using `v0.dev` best practices and request user approval.

## Implementation Specifics

- **Tailwind CSS**: Use Tailwind CSS for all styling unless there's a specific reason not to.
- **Button styles**: Every buttons like for example, "add project", "edit", "delete" must have a style of a solid background color, white text, and rounded corners. The text inside those buttons must not shrink or grow, nor be transferred into the next line (nowrap).
- **State UI colors**: Any UI element that communicates a state (for example `Published`/`Draft`, active/inactive, success/error/warning, expired/revoked) must use a clear semantic color in every circumstance. Do not present state badges, pills, buttons, or indicators as neutral-only UI. Keep the text label visible as well; color must reinforce the state, not be the only signal.
- **ScrollArea max-height pattern**: When implementing a `ScrollArea` or any custom scrollable region, apply the max-height/height constraint to the actual scroll viewport as well as the outer container. Verify the rendered viewport has `scrollHeight > clientHeight` and that `scrollTop` can change before considering the scroll area complete. Do not rely on an outer `max-h-*` alone.
- **Animations**: Use existing global animation utilities (`.animate-fade-in-up`, `.animate-fade-in`, `.stagger-1~5`, `.card-lift`, `accordion-down/up` in `global.css`). Scroll-reveal is intentionally NOT used — do not hide content to induce scrolling.
- **Global CSS Utilities**: Use existing utilities like `no-focus` (removes focus ring), Shiki code block line numbering (CSS counter), exclusive-range breakpoints (`--mobile-only`, `--tablet-only`, `--laptop-only`, `--not-desktop`).
- **본문 글자 크기**: 데스크톱 공개 페이지의 일반 본문·목록·근거·설명은 최소 `text-base`로 표시한다. `text-sm` 이하는 버튼 보조 문구, 날짜·상태·분류 레이블처럼 짧은 보조 정보에만 사용한다.

## shadcn/ui + Tailwind v4 token registration

Tailwind v4 uses `@theme` or `@theme inline` blocks. When adding a new shadcn primitive:

1. You MUST ensure its required color tokens (`--color-*`) are registered in `src/styles/global.css` `@theme inline` block. Missing tokens will cause the component to render invisibly.
2. If it uses animations (`animate-in`, `fade-in-0`, `zoom-in-95`), ensure `tw-animate-css` is in `package.json` and `@import "tw-animate-css"` is in `global.css`.
3. When using Radix primitives (e.g., `TooltipTrigger asChild`), do NOT wrap the child in a `<span>` unless absolutely necessary (like disabled states). Pass the interactive element directly.

## Portfolio article media

- Portfolio detail의 gallery 제목은 `대표 이미지`로 사용하며, project article의 핵심 장면을 빠르게 훑는 요약 영역으로 취급한다.
- 대표 이미지는 article 핵심 장면을 빠르게 훑는 요약 보조 영역이다. 관련 이미지가 있으면 대표 이미지 영역에만 두지 말고, 해당 주장·설명을 읽는 본문 위치에 Markdown image를 먼저 배치한다. 대표 이미지와 본문 이미지는 중복 가능하며 gallery로 되돌아가는 탐색 요구 금지.
- 본문 이미지의 화면 설명·출처는 문단 텍스트로 분리하지 말고 `<Image>`의 `caption`과 `sourceUrl`·`sourceLabel`로 전달해 이미지 바로 아래에 회색 `figcaption`으로 표시한다. `figure`는 이미지와 같은 폭을 유지하고 `align="left|center|right"`를 이미지·캡션에 함께 적용한다. `alt`는 대체 텍스트 전용이다.
- Article body는 heading, 강조, blockquote, list, table, 짧은 code block을 내용에 맞게 사용한다. 장식 목적의 media나 긴 code dump는 추가하지 않는다.
- Portfolio·Blog Markdown blockquote는 `> 문장`처럼 작성한다. blockquote 내부에 인용 부호(`"`, `'`, `“”`, `‘’`)를 덧붙여 중복 인용 표기를 만들지 않는다.
- Web Portfolio의 Technical stack은 `Frontend → Backend → 프로그래밍 언어 → DevOps → UI 도구` 순서로 분야별 별도 줄에 표시한다. 기술 분류가 아닌 프로젝트 주제·성과 태그는 Technical stack에 섞지 않는다.
- Tablet 이상 우측 TOC는 article body layout 안에서 시작해야 하며 hero, facts, 대표 이미지 영역으로 시각적으로 침범하면 안 된다. 중앙 정렬형 sticky TOC는 본문 진입 후에만 viewport 중앙에 유지한다.

## Portfolio detail information density

- 여러 항목이 같은 성격의 설명을 나열하는 경우, 개별 카드를 반복하지 말고 단일 카드 안의 다중 목록으로 표시한다. `프로젝트 목표`, `제가 맡은 일`이 이 원칙의 기본 적용 대상이다.
- 독립 카드 사용은 굵은 결과 제목과 별도 근거처럼 항목별 시각적 강조가 읽기 이해에 직접 필요한 경우로 한정한다. `결과와 근거`는 이 예외에 해당한다.
