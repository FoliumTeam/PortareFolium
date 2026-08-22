import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const globalCss = readFileSync(
    join(process.cwd(), "src", "styles", "global.css"),
    "utf8"
);

describe("input surface contract", () => {
    it("text input, textarea, select에 전역 대비 surface를 적용", () => {
        expect(globalCss).toContain("--input-surface:");
        expect(globalCss).toContain("--color-input-surface:");
        expect(globalCss).toContain(
            "background-color: var(--color-input-surface) !important"
        );
        expect(globalCss).toContain("textarea");
        expect(globalCss).toContain("select");
    });

    it("box형 입력이 아닌 native control은 전역 surface 대상에서 제외", () => {
        for (const type of [
            "checkbox",
            "radio",
            "range",
            "file",
            "hidden",
            "color",
            "image",
            "button",
            "submit",
            "reset",
        ]) {
            expect(globalCss).toContain(`[type=\"${type}\"]`);
        }
    });
});
