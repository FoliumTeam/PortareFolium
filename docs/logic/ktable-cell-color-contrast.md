# KTable 셀 색상 대비 로직

KTable 셀 색상은 inline style로 저장하지 않고 `data-tw-color` attribute로 저장한다.

```html
<td data-tw-color="blue-200">
    <p>Cell text</p>
</td>
```

이 구조를 쓰면 저장 데이터는 작고 안전하게 유지하면서, editor와 frontend 양쪽 렌더링은 CSS가 책임질 수 있다.

## 색상 선택값과 실제 렌더링 색상 분리

관리 UI의 색상 선택 목록은 라이트 모드 기준의 `*-200` 값을 그대로 쓴다. 저장 데이터도 항상 동일하다.

```html
<td data-tw-color="blue-200"></td>
```

하지만 실제 렌더링 색상은 모드에 따라 CSS에서 다르게 매핑한다.

- 라이트 모드: `blue-200` → 밝은 pastel blue (`#bfdbfe`)
- 다크 모드: `blue-200` → 어둡지만 저채도인 muted blue (`oklch(0.36 0.055 255)`)

즉, 같은 `data-tw-color="blue-200"`라도 `html.dark` 아래에서는 다크 모드용 색으로 바뀐다. 이 덕분에 저장 포맷과 툴바 옵션은 늘리지 않으면서 다크 모드에서 너무 밝은 셀 배경을 피할 수 있다.

## CSS 변수로 배경/글자색 묶기

각 색상 selector는 직접 `background-color`를 반복하지 않고 셀 전용 CSS 변수를 세팅한다.

```css
.ProseMirror :is(th, td)[data-tw-color="blue-200"],
.post-content.prose
    table[data-ktable="true"]
    :is(th, td)[data-tw-color="blue-200"] {
    --ktable-cell-bg: #bfdbfe;
    --ktable-cell-fg: #0f172a;
}

html.dark .ProseMirror :is(th, td)[data-tw-color="blue-200"],
html.dark
    .post-content.prose
    table[data-ktable="true"]
    :is(th, td)[data-tw-color="blue-200"] {
    --ktable-cell-bg: oklch(0.36 0.055 255);
    --ktable-cell-fg: #f8fafc;
}
```

그리고 공통 규칙 하나가 그 변수를 실제 스타일로 적용한다.

```css
.ProseMirror :is(th, td)[data-tw-color],
.post-content.prose table[data-ktable="true"] :is(th, td)[data-tw-color] {
    background-color: var(--ktable-cell-bg);
    color: var(--ktable-cell-fg) !important;
}
```

## 셀 내부 요소까지 보정해야 하는 이유

frontend prose 스타일에는 다음처럼 문단 색을 다시 지정하는 규칙이 있다.

```css
.post-content.prose p {
    color: var(--color-foreground);
}
```

KTable 셀 내부에는 보통 `p`, `strong`, `span` 같은 자식 요소가 들어간다. 셀 자체에만 `color`를 지정하면, 내부 `p`가 prose 규칙을 다시 받아 셀 배경과 맞지 않는 텍스트 색이 표시될 수 있다.

그래서 colored cell에는 셀 자체와 내부 자식 모두에 같은 contrast 변수를 적용한다.

```css
table[data-ktable="true"] :is(th, td)[data-tw-color],
table[data-ktable="true"] :is(th, td)[data-tw-color] :where(*) {
    color: var(--ktable-cell-fg) !important;
}
```

`:where(*)` 는 셀 내부의 모든 자식을 대상으로 하되 specificity를 추가로 올리지 않는다. `!important`는 prose/typography 계층이 `p`, `strong`, `a` 등의 색을 다시 지정해도 colored cell의 대비가 깨지지 않게 하기 위한 국소적인 override다.

## 결과

- 색상 선택 목록과 저장값은 라이트/다크 모드에서 동일하다.
- 라이트 모드에서는 기존 밝은 custom cell 색상을 유지한다.
- 다크 모드에서는 같은 custom cell 선택값이 더 어둡고 채도가 낮은 muted 색으로 렌더링된다.
- 텍스트 색은 실제 모드별 배경색에 맞춰 CSS 변수로 같이 바뀐다.
- inline style 없이 `data-tw-color`와 CSS만으로 editor/frontend 렌더링을 동일하게 유지한다.
