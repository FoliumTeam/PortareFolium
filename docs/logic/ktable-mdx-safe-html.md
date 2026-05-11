# KTable MDX-safe HTML 렌더링

## 원인

KTable은 Tiptap table node를 HTML로 serialize해서 MDX content 안에 저장한다. 이때 browser HTML로는 유효하지만 MDX evaluate 단계에서는 JSX로 파싱되는 markup이 섞이면 렌더링이 실패한다.

문제가 된 content는 KTable 내부 이미지가 아래처럼 저장된 형태였다.

```html
<p style="text-align: center;"><img src="https://example.com/a.webp" /></p>
```

MDX에서는 raw HTML이 JSX처럼 처리되므로 다음 두 가지가 동시에 문제가 된다.

- `<img>` 같은 void tag는 `<img />`처럼 self-closing이어야 함
- `style="text-align: center;"` 같은 string style은 React JSX에서 유효하지 않음

row height 기능도 같은 계열의 문제를 만든다. editor DOM에는 `style="height: 48px"`가 자연스럽지만, MDX source에서는 `style={{ height: "48px" }}` 형태여야 React render가 가능하다.

## 해결 방식

`src/lib/mdx-safe-html.ts`의 `normalizeKTableMdxHtml()`이 KTable HTML block만 대상으로 MDX-safe 변환을 수행한다.

- KTable 내부 void tag를 self-closing으로 변환
- `class`, `colspan`, `rowspan` 등 HTML attribute를 JSX-safe casing으로 변환
- paragraph `text-align` string style을 `data-text-align`으로 변환
- row height string style을 JSX style object로 변환
- 허용하지 않는 string style은 제거

이 utility는 두 경로에 모두 적용된다.

1. `src/extensions/KTableExtension.ts` — editor가 새로 저장하는 KTable markdown 정규화
2. `src/lib/markdown.tsx` — 이미 저장된 legacy KTable HTML을 public render 직전에 정규화

## Regression 기준

`src/__tests__/ktable-extension.test.ts`는 다음 사례를 검증한다.

- KTable image HTML이 `<img />` 형태로 정규화되는지
- `style="text-align: center;"`가 `data-text-align="center"`로 변환되는지
- row height가 `style={{ height: "48px" }}`로 변환되는지
- 위 legacy browser HTML이 `renderMarkdown()`에서 오류 없이 렌더링되는지

## 유지보수 규칙

KTable serialization 또는 markdown render path를 수정할 때는 browser HTML 기준이 아니라 MDX JSX 기준으로 확인한다. 특히 table 안에 image, paragraph alignment, row height가 같이 있는 fixture를 반드시 regression test에 포함한다.
