import { getViteConfig } from "astro/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default getViteConfig({
    // @ts-expect-error — getViteConfig 타입이 vitest의 test 속성을 포함하지 않지만, 런타임에는 정상 작동
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./vitest.setup.ts"],
        include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: [
                "src/**/*.d.ts",
                "src/env.d.ts",
                "src/pages/**/*.astro",
                "src/layouts/**/*.astro",
            ],
        },
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
