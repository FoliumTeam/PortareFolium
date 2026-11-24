// 이력서 PDF 글 처리: escape, Markdown 최소 변환, 첫 문장 추출

const HTML_ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

export const escapeHtml = (value: unknown): string =>
    String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

// CSS 문자열 값 escape (F14): @page content 등에 넣는 사용자 글
export const escapeCssString = (value: unknown): string =>
    String(value ?? "")
        .replace(/[\\"]/g, (c) => `\\${c}`)
        .replace(/[\n\r\f]/g, " ")
        .replace(/</g, "\\3c ");

// Markdown 최소 변환: 줄 단위 "- " 목록, 문단, **굵게**
export const markdownToHtml = (text: unknown, bold = true): string => {
    const inline = (s: string) =>
        escapeHtml(s).replace(
            /\*\*(.+?)\*\*/g,
            bold ? "<strong>$1</strong>" : "$1"
        );
    const out: string[] = [];
    let list: string[] = [];
    const flush = () => {
        if (list.length)
            out.push(
                `<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`
            );
        list = [];
    };
    for (const raw of String(text ?? "").split(/\n/)) {
        const line = raw.trim();
        if (!line) {
            flush();
            continue;
        }
        if (/^[-*]\s+/.test(line)) list.push(line.replace(/^[-*]\s+/, ""));
        else {
            flush();
            out.push(`<p>${inline(line)}</p>`);
        }
    }
    flush();
    return out.join("");
};

// 첫 문장: 마침표(. 。) 뒤 공백·끝까지. 없으면 전체
export const firstSentence = (value: unknown): string => {
    const text = String(value ?? "");
    return (text.match(/^[\s\S]*?[.。](?=\s|$)/)?.[0] ?? text).trim();
};

export const plainUrl = (url: string): string =>
    url.replace(/^https?:\/\//, "").replace(/\/$/, "");
