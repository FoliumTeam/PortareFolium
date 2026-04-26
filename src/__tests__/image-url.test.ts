import { describe, expect, it } from "vitest";
import { isGifUrl } from "@/lib/image-url";

describe("isGifUrl", () => {
    it("detects gif URLs even with query strings", () => {
        expect(isGifUrl("https://cdn.example.test/a/b/c.gif")).toBe(true);
        expect(isGifUrl("/blog/post/asset.GIF?cache=1")).toBe(true);
    });

    it("does not treat non-gif image URLs as gif", () => {
        expect(isGifUrl("https://cdn.example.test/a/b/c.webp")).toBe(false);
        expect(isGifUrl(null)).toBe(false);
    });
});
