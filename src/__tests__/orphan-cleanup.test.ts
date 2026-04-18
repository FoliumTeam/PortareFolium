import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    baseKey,
    extractKeysFromText,
    cleanupTrueOrphans,
} from "@/lib/orphan-cleanup";

vi.mock("@/lib/image-upload", () => ({
    listStorageFiles: vi.fn(),
    deleteStorageKeys: vi.fn(),
}));

vi.mock("@/lib/snapshot-cleanup", () => ({
    loadSnapshotsContent: vi.fn(),
}));

const { listStorageFiles, deleteStorageKeys } =
    await import("@/lib/image-upload");
const { loadSnapshotsContent } = await import("@/lib/snapshot-cleanup");

const mockedList = vi.mocked(listStorageFiles);
const mockedDelete = vi.mocked(deleteStorageKeys);
const mockedSnaps = vi.mocked(loadSnapshotsContent);

beforeEach(() => {
    vi.clearAllMocks();
    mockedSnaps.mockResolvedValue([]);
});

const FOLDER = "blog/my-post";
const baseArgs = {
    folderPath: FOLDER,
    entityType: "post" as const,
    entitySlug: "my-post",
    currentContent: "",
    thumbnail: "",
};

describe("baseKey", () => {
    it("strips .thumb.webp sidecar", () => {
        expect(baseKey("blog/x/abc.thumb.webp")).toBe("blog/x/abc");
    });

    it("strips .poster.webp sidecar", () => {
        expect(baseKey("blog/x/abc.poster.webp")).toBe("blog/x/abc");
    });

    it("strips plain .webp ext", () => {
        expect(baseKey("blog/x/abc.webp")).toBe("blog/x/abc");
    });

    it("strips .gif ext", () => {
        expect(baseKey("blog/x/abc.gif")).toBe("blog/x/abc");
    });

    it("handles legacy hyphenated filename", () => {
        expect(baseKey("portfolio/foo/nexus-downloads-7bbdf773.webp")).toBe(
            "portfolio/foo/nexus-downloads-7bbdf773"
        );
    });

    it("collapses base + thumb + poster to same stem", () => {
        const stem = baseKey("blog/x/abc.webp");
        expect(baseKey("blog/x/abc.thumb.webp")).toBe(stem);
        expect(baseKey("blog/x/abc.poster.webp")).toBe(stem);
    });
});

describe("extractKeysFromText", () => {
    it("extracts R2 keys matching folderPath prefix", () => {
        const text = `image: https://pub-xxx.r2.dev/blog/my-post/abc.webp end`;
        expect(extractKeysFromText(text, "blog/my-post")).toEqual([
            "blog/my-post/abc.webp",
        ]);
    });

    it("returns empty for unrelated paths", () => {
        const text = `https://pub-xxx.r2.dev/portfolio/other/xyz.webp`;
        expect(extractKeysFromText(text, "blog/my-post")).toEqual([]);
    });

    it("handles markdown image syntax", () => {
        const text = `![alt](https://pub-xxx.r2.dev/blog/my-post/img.webp)`;
        expect(extractKeysFromText(text, "blog/my-post")).toEqual([
            "blog/my-post/img.webp",
        ]);
    });

    it("strips at query/fragment delimiters", () => {
        const text = `https://pub-xxx.r2.dev/blog/my-post/img.webp?v=1#frag`;
        expect(extractKeysFromText(text, "blog/my-post")).toEqual([
            "blog/my-post/img.webp",
        ]);
    });

    it("returns empty for empty text", () => {
        expect(extractKeysFromText("", "blog/my-post")).toEqual([]);
    });

    it("extracts imageGroup images array URLs", () => {
        const text = `<ImageGroup layout="slider" images='["https://pub-xxx.r2.dev/blog/my-post/a.webp","https://pub-xxx.r2.dev/blog/my-post/b.thumb.webp"]' />`;
        expect(extractKeysFromText(text, "blog/my-post")).toEqual([
            "blog/my-post/a.webp",
            "blog/my-post/b.thumb.webp",
        ]);
    });
});

describe("cleanupTrueOrphans", () => {
    it("deletes keys not referenced anywhere", async () => {
        mockedList.mockResolvedValue([
            "blog/my-post/a.webp",
            "blog/my-post/b.webp",
            "blog/my-post/c.webp",
        ]);
        await cleanupTrueOrphans({
            ...baseArgs,
            currentContent: "![](https://r2.dev/blog/my-post/a.webp)",
            thumbnail: "https://r2.dev/blog/my-post/b.webp",
        });
        expect(mockedDelete).toHaveBeenCalledWith(["blog/my-post/c.webp"]);
    });

    it("preserves key still referenced by current content", async () => {
        mockedList.mockResolvedValue(["blog/my-post/a.webp"]);
        await cleanupTrueOrphans({
            ...baseArgs,
            currentContent: "![](https://r2.dev/blog/my-post/a.webp)",
        });
        expect(mockedDelete).not.toHaveBeenCalled();
    });

    it("preserves key referenced only by snapshot", async () => {
        mockedList.mockResolvedValue(["blog/my-post/a.webp"]);
        mockedSnaps.mockResolvedValue([
            "old content with ![](https://r2.dev/blog/my-post/a.webp)",
        ]);
        await cleanupTrueOrphans({ ...baseArgs, currentContent: "now empty" });
        expect(mockedDelete).not.toHaveBeenCalled();
    });

    it("preserves sidecars when base is referenced", async () => {
        mockedList.mockResolvedValue([
            "blog/my-post/a.webp",
            "blog/my-post/a.thumb.webp",
            "blog/my-post/a.poster.webp",
        ]);
        await cleanupTrueOrphans({
            ...baseArgs,
            currentContent: "![](https://r2.dev/blog/my-post/a.webp)",
        });
        expect(mockedDelete).not.toHaveBeenCalled();
    });

    it("deletes sidecar of orphaned base", async () => {
        mockedList.mockResolvedValue([
            "blog/my-post/orphan.webp",
            "blog/my-post/orphan.thumb.webp",
            "blog/my-post/orphan.poster.webp",
            "blog/my-post/keep.webp",
        ]);
        await cleanupTrueOrphans({
            ...baseArgs,
            currentContent: "![](https://r2.dev/blog/my-post/keep.webp)",
        });
        expect(mockedDelete).toHaveBeenCalledWith([
            "blog/my-post/orphan.webp",
            "blog/my-post/orphan.thumb.webp",
            "blog/my-post/orphan.poster.webp",
        ]);
    });

    it("preserves gif sidecars when gif base is referenced", async () => {
        mockedList.mockResolvedValue([
            "blog/my-post/anim.gif",
            "blog/my-post/anim.thumb.webp",
            "blog/my-post/anim.poster.webp",
        ]);
        await cleanupTrueOrphans({
            ...baseArgs,
            currentContent: "https://r2.dev/blog/my-post/anim.gif",
        });
        expect(mockedDelete).not.toHaveBeenCalled();
    });

    it("limits scope to candidates filter", async () => {
        mockedList.mockResolvedValue([
            "blog/my-post/a.webp",
            "blog/my-post/b.webp",
        ]);
        await cleanupTrueOrphans({
            ...baseArgs,
            candidates: ["blog/my-post/a"],
        });
        expect(mockedDelete).toHaveBeenCalledWith(["blog/my-post/a.webp"]);
    });

    it("skips when listed empty (transient list failure guard)", async () => {
        mockedList.mockResolvedValue([]);
        await cleanupTrueOrphans(baseArgs);
        expect(mockedDelete).not.toHaveBeenCalled();
    });

    it("skips when list throws", async () => {
        mockedList.mockRejectedValue(new Error("network"));
        await cleanupTrueOrphans(baseArgs);
        expect(mockedDelete).not.toHaveBeenCalled();
    });

    it("skips sanity guard when referenced empty + content non-empty", async () => {
        mockedList.mockResolvedValue(["blog/my-post/a.webp"]);
        await cleanupTrueOrphans({
            ...baseArgs,
            currentContent: "text only no image URLs",
        });
        expect(mockedDelete).not.toHaveBeenCalled();
    });

    it("proceeds when referenced empty + content empty (delete-all path)", async () => {
        mockedList.mockResolvedValue(["blog/my-post/a.webp"]);
        await cleanupTrueOrphans({ ...baseArgs, currentContent: "" });
        expect(mockedDelete).toHaveBeenCalledWith(["blog/my-post/a.webp"]);
    });
});
