// Astro 5 설정
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Astro 5 + MDX + React 조합에서 발생하는 SSR "Invalid hook call" 경고 억제.
 * astro:jsx 렌더러와 @astrojs/react 렌더러 충돌로 인해 SSR 시 발생하지만 기능에 영향 없음.
 * 관련: https://github.com/withastro/astro/issues/12802
 */
function suppressReactHookWarning() {
    return {
        name: "suppress-react-hook-warning",
        configResolved() {
            const originalConsoleError = console.error;
            console.error = (...args) => {
                if (
                    typeof args[0] === "string" &&
                    args[0].includes("Invalid hook call")
                ) {
                    return;
                }
                originalConsoleError.apply(console, args);
            };
        },
    };
}

export default defineConfig({
    output: "static",
    integrations: [mdx(), react()],
    vite: {
        resolve: {
            alias: { "@": path.resolve(__dirname, "src") },
        },
        plugins: [tailwindcss(), suppressReactHookWarning()],
    },
});
