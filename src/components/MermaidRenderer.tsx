"use client";

import { useEffect } from "react";
import {
    renderMermaidBlocks,
    rerenderMermaidOnThemeChange,
} from "@/lib/mermaid-render";

export default function MermaidRenderer({
    selector,
    label,
}: {
    selector: string;
    label: string;
}) {
    useEffect(() => {
        renderMermaidBlocks(selector, label);

        function onThemeChange() {
            rerenderMermaidOnThemeChange(label);
        }
        window.addEventListener("themechange", onThemeChange);
        return () => {
            window.removeEventListener("themechange", onThemeChange);
        };
    }, [selector, label]);

    return null;
}
