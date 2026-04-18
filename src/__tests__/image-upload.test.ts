import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    toWebPBlob,
    uploadImage,
    getStoragePath,
    getSidecarPath,
} from "@/lib/image-upload";

// Mock Supabase Client (getAccessToken에서 세션 토큰 조회용)
vi.mock("@/lib/supabase", () => {
    return {
        browserClient: {
            auth: {
                getSession: vi.fn(() =>
                    Promise.resolve({
                        data: { session: { access_token: "mock-token" } },
                    })
                ),
            },
        },
    };
});

// Mock fetch (API route 호출)
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("이미지 업로드 및 변환 (Image Upload & Conversion)", () => {
    let originalURL: typeof URL;
    let originalImage: typeof Image;

    beforeEach(() => {
        originalURL = global.URL;
        originalImage = global.Image;

        global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
        global.URL.revokeObjectURL = vi.fn();

        global.Image = class MockImage {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            _src = "";
            naturalWidth = 100;
            naturalHeight = 100;

            get src() {
                return this._src;
            }
            set src(val: string) {
                this._src = val;
                if (this.onload) {
                    const onloadRef = this.onload;
                    setTimeout(() => onloadRef(), 0);
                }
            }
        } as any;

        vi.spyOn(document, "createElement").mockImplementation((tagName) => {
            if (tagName === "canvas") {
                return {
                    width: 0,
                    height: 0,
                    getContext: vi.fn(() => ({
                        drawImage: vi.fn(),
                    })),
                    toBlob: vi.fn((callback) => {
                        callback(
                            new Blob(["mock webp content"], {
                                type: "image/webp",
                            })
                        );
                    }),
                } as unknown as HTMLCanvasElement;
            }
            return document.createElement(tagName) as any;
        });
    });

    afterEach(() => {
        global.URL = originalURL;
        global.Image = originalImage;
        vi.clearAllMocks();
    });

    describe("getStoragePath", () => {
        it("folderPath가 없으면 misc/YYYY/MM 경로를 접두어로 생성", () => {
            const path = getStoragePath();
            expect(path).toMatch(
                /^misc\/[0-9]{4}\/[0-9]{2}\/[a-f0-9-]+\.webp$/
            );
        });

        it("folderPath가 있으면 지정된 경로를 접두어로 생성", () => {
            const path = getStoragePath("blog/my-post");
            expect(path).toMatch(/^blog\/my-post\/[a-f0-9-]+\.webp$/);
        });
    });

    describe("getSidecarPath", () => {
        it("thumb sidecar path 생성", () => {
            expect(getSidecarPath("blog/post/abc.webp", "thumb")).toBe(
                "blog/post/abc.thumb.webp"
            );
        });

        it("gif도 poster sidecar path 생성", () => {
            expect(getSidecarPath("blog/post/abc.gif", "poster")).toBe(
                "blog/post/abc.poster.webp"
            );
        });
    });

    describe("toWebPBlob", () => {
        it("일반 이미지(Blob/File)를 WebP Blob으로 변환", async () => {
            const mockFile = new File(["dummy png block"], "test.png", {
                type: "image/png",
            });

            const webpBlob = await toWebPBlob(mockFile);

            expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockFile);
            expect(webpBlob.type).toBe("image/webp");
            expect(await webpBlob.text()).toBe("mock webp content");
        });
    });

    describe("uploadImage", () => {
        it("WebP가 아닌 이미지가 전달되면 WebP로 변환한 후 R2에 업로드", async () => {
            const mockFile = new File(["dummy jpg"], "original.jpg", {
                type: "image/jpeg",
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        url: "https://pub-xxx.r2.dev/misc/2026/04/mock.webp",
                    }),
            });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        url: "https://pub-xxx.r2.dev/misc/2026/04/mock.thumb.webp",
                    }),
            });

            const url = await uploadImage(mockFile);

            expect(url).toBe("https://pub-xxx.r2.dev/misc/2026/04/mock.webp");
            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(mockFetch).toHaveBeenNthCalledWith(
                1,
                "/api/upload-image",
                expect.objectContaining({
                    method: "POST",
                    headers: { Authorization: "Bearer mock-token" },
                })
            );
            const secondBody = mockFetch.mock.calls[1]?.[1]?.body as FormData;
            expect(String(secondBody.get("path"))).toMatch(/\.thumb\.webp$/);
        });

        it("이미 WebP 형식인 파일도 thumb sidecar를 함께 업로드", async () => {
            const mockWebpFile = new File(["original webp"], "fast.webp", {
                type: "image/webp",
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        url: "https://pub-xxx.r2.dev/misc/2026/04/fast.webp",
                    }),
            });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        url: "https://pub-xxx.r2.dev/misc/2026/04/fast.thumb.webp",
                    }),
            });

            const url = await uploadImage(mockWebpFile);

            expect(url).toBe("https://pub-xxx.r2.dev/misc/2026/04/fast.webp");
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it("gif는 thumb와 poster sidecar를 함께 업로드", async () => {
            const mockGifFile = new File(["gif bytes"], "anim.gif", {
                type: "image/gif",
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        url: "https://pub-xxx.r2.dev/misc/2026/04/anim.gif",
                    }),
            });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        url: "https://pub-xxx.r2.dev/misc/2026/04/anim.thumb.webp",
                    }),
            });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        url: "https://pub-xxx.r2.dev/misc/2026/04/anim.poster.webp",
                    }),
            });

            const url = await uploadImage(mockGifFile);

            expect(url).toBe("https://pub-xxx.r2.dev/misc/2026/04/anim.gif");
            expect(mockFetch).toHaveBeenCalledTimes(3);
            const secondBody = mockFetch.mock.calls[1]?.[1]?.body as FormData;
            const thirdBody = mockFetch.mock.calls[2]?.[1]?.body as FormData;
            expect(String(secondBody.get("path"))).toMatch(/\.thumb\.webp$/);
            expect(String(thirdBody.get("path"))).toMatch(/\.poster\.webp$/);
        });

        it("API 오류 발생 시 예외를 던짐", async () => {
            const mockErrorFile = new File(["error"], "err.webp", {
                type: "image/webp",
            });

            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: () =>
                    Promise.resolve({ error: "Storage Quota Exceeded" }),
            });

            await expect(uploadImage(mockErrorFile)).rejects.toThrow(
                "Storage Quota Exceeded"
            );
        });
    });
});
