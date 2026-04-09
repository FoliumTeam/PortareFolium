"use client";

import { useEffect } from "react";

// scroll-reveal 요소 감지 + revealed 클래스 추가
export default function ScrollRevealInit() {
    useEffect(() => {
        const isInViewport = (el: Element) => {
            const rect = el.getBoundingClientRect();
            return rect.top < window.innerHeight + 40 && rect.bottom > -40;
        };

        const processElement = (el: Element) => {
            if (el.classList.contains("revealed")) return;
            if (isInViewport(el)) {
                el.classList.add("revealed");
            } else {
                observer.observe(el);
            }
        };

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("revealed");
                        observer.unobserve(entry.target);
                    }
                }
            },
            { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
        );

        // gate 설정 + 초기 요소 처리 (viewport 내 요소는 즉시 reveal)
        document.documentElement.setAttribute("data-scroll-ready", "");
        document.querySelectorAll(".scroll-reveal").forEach(processElement);

        // 동적 렌더링 요소 감지 (About 페이지 등 client fetch 후 등장하는 요소)
        const mo = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    if (node.classList?.contains("scroll-reveal"))
                        processElement(node);
                    node.querySelectorAll?.(".scroll-reveal").forEach(
                        processElement
                    );
                }
            }
        });
        mo.observe(document.body, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            mo.disconnect();
        };
    }, []);

    return null;
}
