import { afterEach, describe, expect, it } from "vitest";
import { paginateBlocks } from "@/lib/pdf-pagination";

const PAGE_HEIGHT = 297;
const ORIGIN_TOP = 50;

// spacer 삽입 뒤 DOM 순서를 반영하는 고정 좌표 측정
const createLayout = (html: string) => {
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    Object.defineProperty(container, "offsetWidth", { value: 210 });
    container.getBoundingClientRect = () => new DOMRect(0, ORIGIN_TOP, 210, 0);
    for (const element of container.querySelectorAll<HTMLElement>(
        "[data-top]"
    )) {
        element.getBoundingClientRect = () => {
            const shift = Array.from(
                container.querySelectorAll<HTMLElement>("[data-pdf-spacer]")
            ).reduce((total, spacer) => {
                const precedes =
                    spacer.compareDocumentPosition(element) &
                    Node.DOCUMENT_POSITION_FOLLOWING;
                return precedes && !element.contains(spacer)
                    ? total +
                          parseFloat(spacer.style.height) +
                          Number(spacer.parentElement?.dataset.layoutGap ?? 0)
                    : total;
            }, 0);
            return new DOMRect(
                0,
                ORIGIN_TOP + Number(element.dataset.top) + shift,
                100,
                Number(element.dataset.height ?? 0)
            );
        };
    }
    return container;
};

const relativeTop = (element: Element) =>
    element.getBoundingClientRect().top - ORIGIN_TOP;
const pageOf = (element: Element) =>
    Math.floor(relativeTop(element) / PAGE_HEIGHT);

afterEach(() => document.body.replaceChildren());

describe("PDF block pagination", () => {
    it("keeps the section heading with the first grid row using its tallest card", () => {
        const container = createLayout(`
            <section data-pdf-block data-top="250">
                <h2 data-top="250" data-height="20">Section</h2>
                <div>
                    <article id="first" data-pdf-block-item data-top="275" data-height="15"></article>
                    <article id="tall" data-pdf-block-item data-top="275" data-height="75"></article>
                </div>
            </section>
        `);
        expect(paginateBlocks(container)).toEqual([PAGE_HEIGHT]);
        const spacer =
            container.querySelector<HTMLElement>("[data-pdf-spacer]")!;
        const section = container.querySelector("section")!;
        expect(spacer.nextElementSibling).toBe(section);
        expect(spacer.style.height).toBe("47px");
        expect(container.querySelectorAll("[data-pdf-spacer]")).toHaveLength(1);
        expect(pageOf(container.querySelector("h2")!)).toBe(1);
        expect(pageOf(container.querySelector("#first")!)).toBe(1);
        expect(pageOf(container.querySelector("#tall")!)).toBe(1);
    });

    it("moves only a later grid row and processes its shifted siblings once", () => {
        const container = createLayout(`
            <section data-pdf-block data-top="180">
                <h2 data-top="180" data-height="20">Section</h2>
                <div id="grid">
                    <article id="first" data-pdf-block-item data-top="210" data-height="40"></article>
                    <article id="second" data-pdf-block-item data-top="270" data-height="60"></article>
                    <article id="third" data-pdf-block-item data-top="270" data-height="70"></article>
                </div>
            </section>
        `);
        expect(paginateBlocks(container)).toEqual([PAGE_HEIGHT]);
        const spacer =
            container.querySelector<HTMLElement>("[data-pdf-spacer]")!;
        expect(spacer.parentElement?.id).toBe("grid");
        expect(spacer.nextElementSibling?.id).toBe("second");
        expect(spacer.style.gridColumn).toBe("1 / -1");
        expect(container.querySelectorAll("[data-pdf-spacer]")).toHaveLength(1);
        expect(pageOf(container.querySelector("h2")!)).toBe(0);
        expect(pageOf(container.querySelector("#first")!)).toBe(0);
        expect(relativeTop(container.querySelector("#second")!)).toBe(297);
        expect(relativeTop(container.querySelector("#third")!)).toBe(297);
    });

    it("keeps outer headings when the first item has nested marked containers", () => {
        const container = createLayout(`
            <section data-pdf-block data-top="250">
                <h2 data-top="250" data-height="20">Section</h2>
                <div data-pdf-block data-top="270">
                    <article data-pdf-block-item data-top="280" data-height="90"></article>
                </div>
            </section>
        `);
        expect(paginateBlocks(container)).toEqual([PAGE_HEIGHT]);
        const spacer = container.querySelector("[data-pdf-spacer]")!;
        expect(spacer.nextElementSibling?.tagName).toBe("SECTION");
        expect(pageOf(container.querySelector("h2")!)).toBe(
            pageOf(container.querySelector("article")!)
        );
    });

    it("keeps the existing split behavior for a row taller than one page", () => {
        const container = createLayout(`
            <section data-pdf-block data-top="250">
                <h2 data-top="250" data-height="20">Section</h2>
                <div>
                    <article data-pdf-block-item data-top="270" data-height="350"></article>
                    <article data-pdf-block-item data-top="270" data-height="25"></article>
                </div>
            </section>
        `);
        expect(paginateBlocks(container)).toEqual([297, 594]);
        expect(container.querySelector("[data-pdf-spacer]")).toBeNull();
        expect(relativeTop(container.querySelector("article")!)).toBe(270);
    });

    it("keeps standalone leaf blocks intact", () => {
        const container = createLayout(`
            <header data-pdf-block data-top="260" data-height="70"></header>
        `);
        expect(paginateBlocks(container)).toEqual([PAGE_HEIGHT]);
        expect(relativeTop(container.querySelector("header")!)).toBe(297);
        expect(
            container.querySelector<HTMLElement>("[data-pdf-spacer]")!.style
                .gridColumn
        ).toBe("");
    });

    it("avoids forcing a heading and row together when their combined height exceeds a page", () => {
        const container = createLayout(`
            <section data-pdf-block data-top="250">
                <h2 data-top="250" data-height="50">Section</h2>
                <div><article data-pdf-block-item data-top="300" data-height="280"></article></div>
            </section>
        `);
        expect(paginateBlocks(container)).toEqual([297]);
        expect(container.querySelector("[data-pdf-spacer]")).toBeNull();
        expect(relativeTop(container.querySelector("article")!)).toBe(300);
    });

    it("remeasures row bottoms after insertion changes layout gaps", () => {
        const container = createLayout(`
            <section data-pdf-block data-top="50">
                <div data-layout-gap="30">
                    <article data-pdf-block-item data-top="100" data-height="100"></article>
                    <article id="shifted" data-pdf-block-item data-top="275" data-height="285"></article>
                    <article data-pdf-block-item data-top="275" data-height="150"></article>
                </div>
            </section>
        `);
        expect(paginateBlocks(container)).toEqual([297, 594]);
        expect(container.querySelectorAll("[data-pdf-spacer]")).toHaveLength(1);
        expect(
            container.querySelector("#shifted")!.getBoundingClientRect()
                .bottom - ORIGIN_TOP
        ).toBe(612);
    });

    it("recomputes the same geometry without accumulating old spacers", () => {
        const container = createLayout(`
            <section data-pdf-block data-top="250">
                <h2 data-top="250" data-height="20">Section</h2>
                <div><article data-pdf-block-item data-top="275" data-height="75"></article></div>
            </section>
        `);
        expect(paginateBlocks(container)).toEqual([297]);
        expect(paginateBlocks(container)).toEqual([297]);
        expect(relativeTop(container.querySelector("h2")!)).toBe(297);
        expect(container.querySelectorAll("[data-pdf-spacer]")).toHaveLength(1);
    });
});
