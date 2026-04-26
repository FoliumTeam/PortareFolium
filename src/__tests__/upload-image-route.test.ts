import { PutObjectCommand } from "@aws-sdk/client-s3";
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
    R2_PUBLIC_URL: "https://r2.example.test",
}));

vi.mock("@/lib/refuge/mode", () => ({
    isSqliteRefugeMode: vi.fn(() => true),
}));

describe("/api/upload-image", () => {
    beforeEach(() => {
        sendMock.mockReset();
        sendMock.mockResolvedValue({});
    });

    it("allows R2 image upload while sqlite refuge mode is active", async () => {
        const { POST } = await import("@/app/api/upload-image/route");
        const formData = new FormData();
        formData.append("file", new File(["image"], "image.webp"));
        formData.append("path", "blog/post/image.webp");

        const response = await POST({
            headers: new Headers(),
            formData: async () => formData,
        } as never);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            url: "https://r2.example.test/blog/post/image.webp",
        });
        expect(sendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });
});
