import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    toWebPBlob,
    uploadImageToSupabase,
    getStoragePath,
} from "@/lib/image-upload";
import { browserClient } from "@/lib/supabase";

// Mock Supabase Client
vi.mock("@/lib/supabase", () => {
    return {
        browserClient: {
            storage: {
                from: vi.fn(),
            },
        },
    };
});

describe("이미지 업로드 및 변환 (Image Upload & Conversion)", () => {
    let originalURL: typeof URL;
    let originalImage: typeof Image;

    beforeEach(() => {
        // 백업
        originalURL = global.URL;
        originalImage = global.Image;

        // Mock URL 객체
        global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
        global.URL.revokeObjectURL = vi.fn();

        // Mock Image 객체
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

        // Mock Canvas (JSDOM Canvas 한계 극복)
        vi.spyOn(document, "createElement").mockImplementation((tagName) => {
            if (tagName === "canvas") {
                return {
                    width: 0,
                    height: 0,
                    getContext: vi.fn(() => ({
                        drawImage: vi.fn(),
                    })),
                    toBlob: vi.fn((callback, type, quality) => {
                        // WebP 변환 성공 콜백 시뮬레이션
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

    describe("uploadImageToSupabase", () => {
        let mockUpload: ReturnType<typeof vi.fn>;
        let mockGetPublicUrl: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            mockUpload = vi.fn();
            mockGetPublicUrl = vi.fn();
            (browserClient!.storage.from as any).mockReturnValue({
                upload: mockUpload,
                getPublicUrl: mockGetPublicUrl,
            });
        });

        it("WebP가 아닌 이미지가 전달되면 WebP로 변환한 후 업로드", async () => {
            const mockFile = new File(["dummy jpg"], "original.jpg", {
                type: "image/jpeg",
            });

            // Mock Supabase 응답
            mockUpload.mockResolvedValueOnce({
                data: { path: "mock" },
                error: null,
            });
            mockGetPublicUrl.mockReturnValueOnce({
                data: { publicUrl: "https://supabase.com/mock.webp" },
            });

            const url = await uploadImageToSupabase(mockFile);

            expect(url).toBe("https://supabase.com/mock.webp");
            // 변환된 Blob 데이터가 전달되었는지 검증 (toWebPBlob을 거쳤는지)
            expect(mockUpload).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Blob), // WebpBlob
                { contentType: "image/webp", upsert: false }
            );
        });

        it("이미 WebP 형식인 파일은 변환 과정을 생략하고 즉시 업로드", async () => {
            const mockWebpFile = new File(["original webp"], "fast.webp", {
                type: "image/webp",
            });

            mockUpload.mockResolvedValueOnce({
                data: { path: "mock" },
                error: null,
            });
            mockGetPublicUrl.mockReturnValueOnce({
                data: { publicUrl: "https://supabase.com/fast.webp" },
            });

            const url = await uploadImageToSupabase(mockWebpFile);

            expect(url).toBe("https://supabase.com/fast.webp");
            // 파일 원본이 그대로 전달되었는지 검증
            expect(mockUpload).toHaveBeenCalledWith(
                expect.any(String),
                mockWebpFile,
                { contentType: "image/webp", upsert: false }
            );
            expect(global.URL.createObjectURL).not.toHaveBeenCalled(); // 변환 생략됨
        });

        it("Supabase 오류 발생 시 예외를 던짐", async () => {
            const mockErrorFile = new File(["error"], "err.webp", {
                type: "image/webp",
            });

            mockUpload.mockResolvedValueOnce({
                data: null,
                error: new Error("Storage Quota Exceeded"),
            });

            await expect(uploadImageToSupabase(mockErrorFile)).rejects.toThrow(
                "Storage Quota Exceeded"
            );
        });
    });
});
