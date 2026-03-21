/**
 * JSX ↔ MDX directive 양방향 변환
 *
 * Supabase에는 표준 MDX(JSX) 형식 저장, MDXEditor에는 remark-directive 형식 사용.
 * - JSX: <YouTube id="x" />, <FoliumTable columns="..." rows="..." />
 * - MDX(Editor): ::youtube[]{id="x"}, ::folium-table[]{columns="..." rows="..."}
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

    // <FoliumTable ... /> → ::folium-table[]{columns="..." rows="..."}
    out = out.replace(/<FoliumTable\s+([\s\S]*?)\s*\/>/g, (_, attrs) => {
        // attrs: columns={'["val"]'} rows={'[["r1"]]'}
        // regex to extract key={'val'}
        const regex = /(\w+)\s*=\s*\{'((?:[^'\\]|\\.)*)'\}/g;
        const parts: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = regex.exec(attrs)) !== null) {
            // unescape \' to '
            let val = m[2].replace(/\\'/g, "'");
            // escape " to \"
            val = val.replace(/"/g, '\\"');
            parts.push(`${m[1]}="${val}"`);
        }
        return `::folium-table[]{${parts.join(" ")}}`;
    });

    return out;
}

// 코드 블록 밖 영역에서만 transform 적용
export function transformOutsideCodeBlocks(
    content: string,
    transform: (text: string) => string
): string {
    const parts = content.split(
        /(```[\s\S]*?```|\$\$[\s\S]*?\$\$|\$(?!\$)[^\n$]+?\$)/g
    );
    return parts
        .map((part, i) => (i % 2 === 0 ? transform(part) : part))
        .join("");
}

// directive 라인의 markdown 백슬래시 이스케이프 제거
function stripDirectiveEscapes(text: string): string {
    return text.replace(/^.*\\::[a-z-].*$/gm, (line) =>
        line.replace(/\\([:\[\]"=])/g, "$1")
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

    // ::folium-table[]{attr="val" ...} 또는 ::folium-table{attr="val" ...} → <FoliumTable attr={'val'} ... />
    out = out.replace(/::folium-table(?:\[\])?\{([^}]*)\}/g, (_, attrs) => {
        const parts: string[] = [];
        // lookahead로 attribute 경계 탐색 (bare quote가 값 안에 있어도 안전)
        // MDXEditor 가 double quote를 포함한 값을 작은따옴표(')로 감쌀 수 있으므로 둘 다 지원
        const regex = /(\w+)=(['"])([\s\S]*?)\2(?=\s+\w+=|$)/g;
        let m: RegExpExecArray | null;
        while ((m = regex.exec(attrs)) !== null) {
            let cleanVal = m[3].replace(/\\"/g, '"').replace(/&#x22;/g, '"'); // MDXEditor HTML-encoded double quotes
            cleanVal = cleanVal.replace(/'/g, "\\'");
            parts.push(`${m[1]}={'${cleanVal}'}`);
        }
        return `<FoliumTable ${parts.join(" ")} />`;
    });

    return out;
}
