/**
 * Mermaid 코드 블록 클라이언트 렌더링 (blog/portfolio 공용)
 * renderMarkdown 출력: div.mermaid-pending[data-mermaid-definition] (base64)
 * (Shiki가 pre>code를 변환해 기존 selector가 동작하지 않음 → mermaid는 별도 출력)
 */
import type { MermaidConfig } from "mermaid";
import { getMermaidConfig } from "./mermaid-themes";

async function loadMermaid() {
    const mod = await import("mermaid");
    return mod.default;
}

/** Base64 → UTF-8 디코딩 (atob는 Latin-1이라 한글 등 멀티바이트 깨짐) */
function base64ToUtf8(base64: string): string {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
}

function getMermaidInitOptions() {
    const root = document.documentElement;
    const isDark = root.classList.contains("dark");
    const scheme = root.getAttribute("data-color-scheme");
    const { theme, themeVariables } = getMermaidConfig(scheme, isDark);
    return {
        startOnLoad: false,
        theme,
        themeVariables,
    } as MermaidConfig;
}

export async function renderMermaidBlocks(
    containerSelector: string,
    logPrefix = "Mermaid"
): Promise<void> {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const blocks = Array.from(
        container.querySelectorAll<HTMLElement>(
            ".mermaid-pending[data-mermaid-definition]"
        )
    );
    if (blocks.length === 0) return;

    const mermaid = await loadMermaid();
    mermaid.initialize(getMermaidInitOptions());

    for (const div of blocks) {
        const encoded = div.getAttribute("data-mermaid-definition");
        if (!encoded) continue;
        let chartDefinition: string;
        try {
            chartDefinition = base64ToUtf8(encoded).trim();
        } catch {
            continue;
        }
        if (!chartDefinition) continue;
        const id = "mermaid-" + Math.random().toString(36).slice(2, 9);
        const wrap = document.createElement("div");
        wrap.className = "mermaid-rendered my-6 flex justify-center";
        wrap.setAttribute("data-mermaid-id", id);
        wrap.setAttribute("data-mermaid-definition", chartDefinition);
        try {
            const { svg } = await mermaid.render(id, chartDefinition);
            wrap.innerHTML = svg;
        } catch (err) {
            console.warn(`[${logPrefix}] render failed:`, err);
            wrap.innerHTML = `<pre class="text-sm text-(--color-muted) overflow-auto p-4 rounded border border-(--color-border)">${chartDefinition}</pre>`;
        }
        div.replaceWith(wrap);
    }
}

export async function rerenderMermaidOnThemeChange(
    logPrefix = "Mermaid"
): Promise<void> {
    const rendered = document.querySelectorAll(
        ".mermaid-rendered[data-mermaid-definition]"
    );
    if (rendered.length === 0) return;

    const mermaid = await loadMermaid();
    mermaid.initialize(getMermaidInitOptions());

    for (const wrap of rendered) {
        const def = wrap.getAttribute("data-mermaid-definition");
        if (!def) continue;
        const id = "mermaid-" + Math.random().toString(36).slice(2, 9);
        try {
            const { svg } = await mermaid.render(id, def);
            wrap.innerHTML = svg;
        } catch (err) {
            console.warn(`[${logPrefix}] re-render failed:`, err);
        }
    }
}
