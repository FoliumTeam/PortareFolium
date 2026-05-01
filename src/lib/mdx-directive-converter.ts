/**
 * JSX ↔ MDX directive 양방향 변환
 *
 * Supabase에는 표준 MDX(JSX) 형식 저장, MDXEditor에는 remark-directive 형식 사용.
 * - JSX: <YouTube id="x" />, <ImageGroup layout="stack" images='["..."]' />
 * - MDX(Editor): ::youtube[]{id="x"}, ::image-group[]{layout="stack" images='["..."]'}
 */

/** JSX → MDX Directives (에디터 로드 시) */
export function jsxToDirective(content: string): string {
    let out = content;

    // $$ ... $$ → ::latex{src="..."} (코드 블록 제외)
    const latexParts = out.split(/(```[\s\S]*?```)/g);
    out = latexParts
        .map((part, i) => {
            if (i % 2 === 1) return part;
            return part.replace(/\$\$([\s\S]*?)\$\$/g, (_, src) => {
                const normalized = src
                    .trim()
                    .split("\n")
                    .map((l: string) => l.trim())
                    .filter(Boolean)
                    .join(" ");
                return `\n\n::latex{src="${normalized.replace(/"/g, '\\"')}"}\n\n`;
            });
        })
        .join("");

    // <YouTube id="xxx" /> → ::youtube[]{id="xxx"}
    out = out.replace(
        /<YouTube\s+id\s*=\s*"([^"]*)"\s*\/>/g,
        (_, id) => `::youtube[]{id="${id}"}`
    );

    // <ImageGroup ... /> → ::image-group[]{layout="..." images='[...]'}
    out = out.replace(/<ImageGroup\s+([\s\S]*?)\s*\/>/g, (_, attrs) => {
        const regex =
            /(\w+)\s*=\s*(?:\{'((?:[^'\\]|\\.)*)'\}|'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
        let layout = "stack";
        let images = "[]";
        let match: RegExpExecArray | null;

        while ((match = regex.exec(attrs)) !== null) {
            const key = match[1];
            const value = (match[2] ?? match[3] ?? match[4] ?? "")
                .replace(/\\'/g, "'")
                .replace(/\\([\[\]])/g, "$1");

            if (key === "layout" && value) layout = value;
            if (key === "images" && value) images = value;
        }

        return `::image-group[]{layout="${layout}" images='${images.replace(/'/g, "\\'")}'}`;
    });

    // <Accordion title="X">...</Accordion> → :::accordion[X]\n...\n:::
    out = out.replace(
        /<Accordion\s+title\s*=\s*(?:\{'((?:[^'\\]|\\.)*)'\}|'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*>([\s\S]*?)<\/Accordion>/g,
        (_, a, b, c, inner) => {
            const title = (a ?? b ?? c ?? "").replace(/\\'/g, "'");
            const safeTitle = title.replace(/[\[\]]/g, "");
            return `\n\n:::accordion[${safeTitle}]\n${inner.trim()}\n:::\n\n`;
        }
    );

    return out;
}

// 코드 블록 밖 영역에서만 transform 적용
export function transformOutsideCodeBlocks(
    content: string,
    transform: (text: string) => string
): string {
    // self-closing JSX tag (<Tag ... />) 도 보호 구간에 포함해 그 안의 $ 가 math 로 잘못 파싱되거나
    // } 가 stray-brace 로 escape 되는 것 차단
    const parts = content.split(
        /(```[\s\S]*?```|<[A-Z]\w*[\s\S]*?\/>|\$\$[\s\S]*?\$\$|\$(?!\$)[^\n$]+?\$)/g
    );
    return parts
        .map((part, i) => (i % 2 === 0 ? transform(part) : part))
        .join("");
}

// directive 라인의 markdown 백슬래시 이스케이프 제거 (\:: 또는 :: 모두 처리)
function stripDirectiveEscapes(text: string): string {
    return text.replace(/^.*\\?::[a-z-].*$/gm, (line) =>
        line.replace(/\\([:\[\]"=~])/g, "$1")
    );
}

/** MDX Directives → JSX (저장 시) */
export function directiveToJsx(content: string): string {
    let out = content;

    // 코드 블록 밖에서만 백슬래시 이스케이프 제거
    out = transformOutsideCodeBlocks(out, stripDirectiveEscapes);

    // ::latex{src="..."} → $$...$$
    out = out.replace(
        /::latex\{src="((?:[^"\\]|\\.)*)"\}/g,
        (_, escaped) => `$$${escaped.replace(/\\"/g, '"')}$$`
    );

    // ::youtube[]{id="xxx"} → <YouTube id="xxx" />
    out = out.replace(
        /::youtube(?:\[\])?\{id="([^"]*)"\}/g,
        (_, id) => `<YouTube id="${id}" />`
    );

    // ::youtube[]{id=xxx} (unquoted id)
    out = out.replace(
        /::youtube(?:\[\])?\{id=([^\s"}]+)\}/g,
        (_, id) => `<YouTube id="${id}" />`
    );

    // ::youtube{#xxx} (shorthand 형식)
    out = out.replace(
        /::youtube\{#([^\s}]+)\}/g,
        (_, id) => `<YouTube id="${id}" />`
    );

    // ::image-group[]{layout="..." images='[...]'} → <ImageGroup ... />
    out = out.replace(/::image-group(?:\[\])?\{([^}]*)\}/g, (_, attrs) => {
        const regex = /(\w+)=(['"])([\s\S]*?)\2(?=\s+\w+=|$)/g;
        let layout = "stack";
        let images = "[]";
        let match: RegExpExecArray | null;

        while ((match = regex.exec(attrs)) !== null) {
            const key = match[1];
            const value = match[3].replace(/\\"/g, '"').replace(/&#x22;/g, '"');

            if (key === "layout" && value) layout = value;
            if (key === "images" && value) images = value;
        }

        return `<ImageGroup layout="${layout}" images='${images.replace(/'/g, "\\'")}' />`;
    });

    // :::accordion[X]\n...\n::: → <Accordion title={'X'}>...</Accordion>
    out = out.replace(
        /:::accordion\[([^\]]*)\]\n([\s\S]*?)\n:::/g,
        (_, title, inner) => {
            const safeTitle = String(title).replace(/'/g, "\\'");
            return `<Accordion title={'${safeTitle}'}>\n\n${inner.trim()}\n\n</Accordion>`;
        }
    );

    return out;
}
