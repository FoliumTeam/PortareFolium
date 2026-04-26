import { describe, expect, it } from "vitest";
import {
    R2PathPolicyError,
    assertSafeR2Key,
    assertSafeR2Prefix,
    getImageExtension,
    resolveImageContentType,
} from "@/lib/r2-path-policy";

describe("assertSafeR2Prefix", () => {
    it("allowlist prefix 통과", () => {
        expect(() => assertSafeR2Prefix("portfolio")).not.toThrow();
        expect(() => assertSafeR2Prefix("portfolio/my-slug")).not.toThrow();
        expect(() => assertSafeR2Prefix("blog/my-post/nested")).not.toThrow();
        expect(() => assertSafeR2Prefix("books/foo")).not.toThrow();
        expect(() => assertSafeR2Prefix("about/profile")).not.toThrow();
        expect(() => assertSafeR2Prefix("misc/2026/04")).not.toThrow();
    });

    it("빈 문자 / 단일 슬래시 거부", () => {
        expect(() => assertSafeR2Prefix("")).toThrow(R2PathPolicyError);
        expect(() => assertSafeR2Prefix("/")).toThrow(R2PathPolicyError);
    });

    it("traversal 거부", () => {
        expect(() => assertSafeR2Prefix("portfolio/..")).toThrow(
            R2PathPolicyError
        );
        expect(() => assertSafeR2Prefix("../portfolio")).toThrow(
            R2PathPolicyError
        );
        expect(() => assertSafeR2Prefix("portfolio/./foo")).toThrow(
            R2PathPolicyError
        );
    });

    it("leading slash / backslash / double slash 거부", () => {
        expect(() => assertSafeR2Prefix("/portfolio/foo")).toThrow(
            R2PathPolicyError
        );
        expect(() => assertSafeR2Prefix("portfolio\\foo")).toThrow(
            R2PathPolicyError
        );
        expect(() => assertSafeR2Prefix("portfolio//foo")).toThrow(
            R2PathPolicyError
        );
    });

    it("non-allowlist root 거부", () => {
        expect(() => assertSafeR2Prefix("evil")).toThrow(R2PathPolicyError);
        expect(() => assertSafeR2Prefix("admin/secret")).toThrow(
            R2PathPolicyError
        );
        expect(() => assertSafeR2Prefix("snapshots")).toThrow(
            R2PathPolicyError
        );
    });

    it("허용 charset 외 문자 거부", () => {
        expect(() => assertSafeR2Prefix("portfolio/한글")).toThrow(
            R2PathPolicyError
        );
        expect(() => assertSafeR2Prefix("portfolio/foo bar")).toThrow(
            R2PathPolicyError
        );
        expect(() => assertSafeR2Prefix("portfolio/foo*bar")).toThrow(
            R2PathPolicyError
        );
    });
});

describe("assertSafeR2Key", () => {
    it("allowlist prefix + 확장자 있는 key 통과", () => {
        expect(() =>
            assertSafeR2Key("portfolio/my-slug/abcd-1234.webp")
        ).not.toThrow();
        expect(() =>
            assertSafeR2Key("blog/post/photo.thumb.webp")
        ).not.toThrow();
        expect(() => assertSafeR2Key("misc/2026/04/uuid.png")).not.toThrow();
    });

    it("확장자 없는 key 거부", () => {
        expect(() => assertSafeR2Key("portfolio/my-slug/file")).toThrow(
            R2PathPolicyError
        );
    });

    it("non-allowlist prefix key 거부", () => {
        expect(() => assertSafeR2Key("evil/file.webp")).toThrow(
            R2PathPolicyError
        );
    });

    it("traversal 거부", () => {
        expect(() => assertSafeR2Key("portfolio/../etc/passwd.txt")).toThrow(
            R2PathPolicyError
        );
    });
});

describe("getImageExtension", () => {
    it("허용 확장자 lowercase 반환", () => {
        expect(getImageExtension("photo.WEBP")).toBe("webp");
        expect(getImageExtension("a.b.png")).toBe("png");
        expect(getImageExtension("image.JPEG")).toBe("jpeg");
    });

    it("비허용 확장자는 null", () => {
        expect(getImageExtension("note.html")).toBeNull();
        expect(getImageExtension("script.svg")).toBeNull();
        expect(getImageExtension("noext")).toBeNull();
        expect(getImageExtension("trailing.")).toBeNull();
    });
});

describe("resolveImageContentType", () => {
    it("확장자 → MIME 매핑", () => {
        expect(resolveImageContentType("a.webp")).toBe("image/webp");
        expect(resolveImageContentType("a.JPG")).toBe("image/jpeg");
        expect(resolveImageContentType("a.gif")).toBe("image/gif");
        expect(resolveImageContentType("a.png")).toBe("image/png");
    });

    it("비허용 확장자는 null", () => {
        expect(resolveImageContentType("a.svg")).toBeNull();
        expect(resolveImageContentType("a.html")).toBeNull();
    });
});
