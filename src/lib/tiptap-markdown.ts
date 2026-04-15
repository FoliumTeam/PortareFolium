import type { Editor } from "@tiptap/react";

// tiptap-markdown serializer가 JSX 속성값 내부 [, ]를 link 문법 충돌 회피로 \[, \]로 escape
// 아래 JSX tag (ColoredTable, FoliumTable, YouTube, Accordion 등 대문자로 시작) 범위만 선별 복원
export function getCleanMarkdown(editor: Editor): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (editor.storage as any).markdown.getMarkdown() as string;
    return unescapeJsxBrackets(raw);
}

// JSX 태그 내부의 \[, \] 만 원상 복원. tag 바깥 markdown link escape는 미건드림
export function unescapeJsxBrackets(markdown: string): string {
    return markdown.replace(/<[A-Z]\w*[\s\S]*?\/?>/g, (tag) =>
        tag.replace(/\\([\[\]])/g, "$1")
    );
}
