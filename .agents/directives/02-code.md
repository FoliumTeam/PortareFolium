# 02. Coding Standards & Testing

## Coding Rules

- **Error Handling**: Use early returns. Log format: `[FileName::FunctionName] Error Message`.
- **Dead Code**: If your changes make imports/variables/functions unused, remove them. Mention pre-existing dead code but do not delete it unless asked. No "deprecated" markers or "logic moved" comments. Delete unused code immediately.
- **File Separation**: Find suitable existing files or create new ones if logic doesn't fit.
- **Technical Terms**: UI/UX 및 개발 용어의 한글 음차 표기(예: "푸터", "헤더", "모달", "사이드바")를 사용하지 않는다. 해당 단어가 한국어에서 일상적으로 통용되지 않는 한(예: "파일", "버튼"은 허용) 영어 원문을 그대로 사용한다. 이 규칙은 주석, 변수명, aria-label, UI 텍스트, 문서 등 코드베이스 전체에 적용된다.
- **TypeScript**: `strict` 활성화. `any` 사용 금지. `interface`보다 `type` alias 선호 (일관성). 경로 별칭 `@/*` 사용 (`@/components`, `@/lib` 등).
- **React/Next.js**: `const` 함수형 컴포넌트만 사용. Server Component 기본, 클라이언트 인터랙션 필요 시 파일 최상단에 `"use client"` 명시. Next.js 16: dynamic route의 `params`는 Promise이므로 `await` 필수.

## Lean Testing Policy

- **Minimalism in Testing**: Do not over-engineer tests. Only write unit tests for complex business logic, helpers, and utilities.
- **UI Testing**: Write UI or E2E tests ONLY for core user flows.
- **Test Self-Correction**: If a test fails, evaluate if the test itself is incorrect, overly strict, or poorly written. Fix or delete bad tests rather than endlessly modifying working application code to satisfy a broken test.
- `test.skip()`이 늘어나면 원인을 기록 (DB 시드 부재 등). 조용히 skip만 누적시키지 말 것.

## File Naming

- **Components** (`src/components/**/*.tsx`): **PascalCase** (`BlogPage.tsx`, `ContentWrapper.tsx`, `GithubToc.tsx`). admin sub-folder도 동일.
- **React hooks** (`src/lib/hooks/*.ts`): **camelCase**, prefix `use` (`useAutoSave.ts`, `useKeyboardSave.ts`).
- **Library / utility modules** (`src/lib/*.ts`): **kebab-case** 또는 단일 단어 lowercase (`mdx-directive-converter.ts`, `auto-migrate.ts`, `queries.ts`).
- **Type definitions** (`src/types/*.ts`): **lowercase** (`portfolio.ts`, `resume.ts`).
- **App Router files**: Next.js 규칙 그대로 (`page.tsx`, `layout.tsx`, `not-found.tsx`).
- **Tests** (`src/__tests__/*.test.ts`, `e2e/*.spec.ts`): **kebab-case**.
- **Server Actions** (`src/app/admin/actions/*.ts`): **kebab-case**.
- 신규 파일을 만들 때 반드시 위 카테고리에 맞는 케이스를 선택. 기존 파일과 같은 디렉토리/역할이면 그 컨벤션을 따른다.

## Comment Formatting Constraints

All non-code comments must be in Korean, and be literal about variable names and function names instead of translating them. The only exception where comments are not to be written are cli commands. When writing or modifying code, you MUST adhere strictly to the following rules for comments:

1. **Format Restrictions:**
    - Use ONLY single-line `//` syntax for all comments.
    - Absolutely NO docstrings or multi-line comments (Do not use `/** ... */`, `/*! ... */`, `///`, or `/* ... */`).
2. **Brevity & Tone:**
    - Keep comments exceedingly plain, minimal, and straight to the point.
    - Do NOT over-explain. Only comment on the core logic.
3. **Korean Language Rules:**
    - Write comments in Korean, but NEVER use full, polite, or formal sentence structures ending in verbs (e.g., do NOT use "~합니다", "~해요", "~이다", "~함").
    - Instead, all comments must end minimally with a noun or noun phrase (e.g., "~ 실행", "~ 추가", "~ 파싱").
    - Any word that are not commonly used in Korean should be written in English. For example, "attributes" must NOT be "어트리뷰트" and "modifiers" must NOT be "모디파이어". A word like "file" is commonly used as "파일" in Korean, so this is allowed.
    - Any Korean word usage like "발행", "미발행", "초안" must be changed to English: "Published", "Unpublished", and "Draft".
4. **Punctuation:**
    - Do NOT use any end punctuation. No periods (`.`), exclamation marks (`!`), or anything else at the end of the comment line.
