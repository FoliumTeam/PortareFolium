"use client";

import { useEffect } from "react";

export default function ColoredTableColorSync() {
    useEffect(() => {
        function updateColors() {
            const isDark = document.documentElement.classList.contains("dark");
            const selector =
                ".pt-head-col[data-pt-bg-dark], .pt-body-col[data-pt-bg-dark]";
            document.querySelectorAll(selector).forEach((el) => {
                const htmlEl = el as HTMLElement;
                if (isDark) {
                    const bg = el.getAttribute("data-pt-bg-dark");
                    const text = el.getAttribute("data-pt-text-dark");
                    htmlEl.style.setProperty(
                        "background",
                        bg ?? "",
                        "important"
                    );
                    htmlEl.style.setProperty("color", text ?? "", "important");
                } else {
                    htmlEl.style.removeProperty("background");
                    htmlEl.style.removeProperty("color");
                }
            });
        }

        updateColors();
        const observer = new MutationObserver(updateColors);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        window.addEventListener("themechange", updateColors);
        return () => {
            observer.disconnect();
            window.removeEventListener("themechange", updateColors);
        };
    }, []);

    return null;
}
