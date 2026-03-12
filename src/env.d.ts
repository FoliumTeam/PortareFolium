/// <reference types="astro/client" />

// @emoji-mart/react, @emoji-mart/data 타입 선언
declare module "@emoji-mart/react" {
    import { ComponentType } from "react";
    const Picker: ComponentType<{
        data: unknown;
        onEmojiSelect?: (emoji: { native: string; id: string }) => void;
        locale?: string;
        previewPosition?: string;
        skinTonePosition?: string;
        theme?: string;
    }>;
    export default Picker;
}
declare module "@emoji-mart/data" {
    const data: unknown;
    export default data;
}

/** 포트폴리오 [slug]에서 Mermaid CDN 동적 import 시 TypeScript 인식용 */
declare module "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs" {
    const mermaid: {
        initialize: (config: { startOnLoad?: boolean; theme?: string }) => void;
        render: (id: string, definition: string) => Promise<{ svg: string }>;
    };
    export default mermaid;
}
