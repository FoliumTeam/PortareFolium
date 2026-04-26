import {
    CopyObjectCommand,
    DeleteObjectsCommand,
    ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("@/auth", () => ({
    auth: vi.fn(async () => ({ user: { role: "admin" } })),
}));

vi.mock("@/lib/admin-auth", () => ({
    isAdminSession: vi.fn(() => true),
}));

vi.mock("@/lib/server-admin", () => ({
    requireAdminSession: vi.fn(async () => ({
        user: { id: "admin", isAdmin: true },
    })),
}));

vi.mock("@/lib/r2", () => ({
    r2Client: { send: sendMock },
    R2_BUCKET: "test-bucket",
}));

vi.mock("@/lib/refuge/mode", () => ({
    isSqliteRefugeMode: vi.fn(() => true),
}));

async function postStorageOps(body: Record<string, unknown>) {
    const { POST } = await import("@/app/api/storage-ops/route");
    return POST({ headers: new Headers(), json: async () => body } as never);
}

describe("/api/storage-ops", () => {
    beforeEach(() => {
        sendMock.mockReset();
        sendMock.mockResolvedValue({});
    });

    it("allows R2 list operations while sqlite refuge mode is active", async () => {
        sendMock.mockResolvedValueOnce({
            Contents: [{ Key: "blog/post/image.webp" }],
        });

        const response = await postStorageOps({
            action: "list",
            prefix: "blog/post",
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            files: ["blog/post/image.webp"],
        });
        expect(sendMock).toHaveBeenCalledWith(expect.any(ListObjectsV2Command));
    });

    it("allows R2 folder moves while sqlite refuge mode is active", async () => {
        sendMock
            .mockResolvedValueOnce({
                Contents: [{ Key: "blog/old/image.webp" }],
            })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({});

        const response = await postStorageOps({
            action: "move",
            oldPrefix: "blog/old",
            newPrefix: "blog/new",
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ ok: true });
        expect(sendMock).toHaveBeenNthCalledWith(
            1,
            expect.any(ListObjectsV2Command)
        );
        expect(sendMock).toHaveBeenNthCalledWith(
            2,
            expect.any(CopyObjectCommand)
        );
        expect(sendMock).toHaveBeenNthCalledWith(
            3,
            expect.any(DeleteObjectsCommand)
        );
    });

    it("allows R2 folder deletes while sqlite refuge mode is active", async () => {
        sendMock.mockResolvedValueOnce({
            Contents: [{ Key: "portfolio/item/image.webp" }],
        });
        sendMock.mockResolvedValueOnce({});

        const response = await postStorageOps({
            action: "delete",
            prefix: "portfolio/item",
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ ok: true });
        expect(sendMock).toHaveBeenNthCalledWith(
            1,
            expect.any(ListObjectsV2Command)
        );
        expect(sendMock).toHaveBeenNthCalledWith(
            2,
            expect.any(DeleteObjectsCommand)
        );
    });
});
