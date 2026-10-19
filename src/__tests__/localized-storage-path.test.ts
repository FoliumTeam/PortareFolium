import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setEditingLocale } from "@/lib/admin-content-state";
import {
    CONTENT_LOCALE_COOKIE,
    UI_LOCALE_COOKIE,
    type Locale,
} from "@/lib/i18n";
import {
    deleteStorageFolder,
    getSidecarPath,
    getStoragePath,
    listStorageFiles,
    localizeStorageFolder,
    moveStorageFolder,
    replaceImageUrls,
} from "@/lib/image-upload";

const uuid = "12345678-1234-4234-8234-123456789abc";
const fetchMock = vi.fn();

beforeEach(() => {
    sessionStorage.clear();
    document.cookie = `${CONTENT_LOCALE_COOKIE}=; Path=/; Max-Age=0`;
    vi.spyOn(crypto, "randomUUID").mockReturnValue(uuid);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ files: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
    document.cookie = `${CONTENT_LOCALE_COOKIE}=; Path=/; Max-Age=0`;
    document.cookie = `${UI_LOCALE_COOKIE}=; Path=/; Max-Age=0`;
});

describe("언어별 신규 이미지 저장 경로", () => {
    it.each([
        ["ko", "portfolio/project", "portfolio/project"],
        ["en", "portfolio/project", "portfolio/_i18n/en/project"],
        ["ja", "portfolio/project", "portfolio/_i18n/ja/project"],
        ["en", "blog/post", "blog/_i18n/en/post"],
        ["ja", "books/book", "books/_i18n/ja/book"],
        ["en", "resume/basics", "resume/_i18n/en/basics"],
        ["ja", "about/profile", "about/_i18n/ja/profile"],
    ] as [Locale, string, string][])(
        "%s의 %s 업로드를 %s로 분리",
        (locale, folder, expected) => {
            setEditingLocale(locale);
            expect(getStoragePath(folder)).toBe(`${expected}/${uuid}.webp`);
        }
    );

    it("이미 언어가 지정된 폴더를 다시 처리해도 중복 경로 생성 방지", () => {
        setEditingLocale("en");
        const folder = "portfolio/_i18n/en/project";
        expect(localizeStorageFolder(localizeStorageFolder(folder))).toBe(
            folder
        );
    });

    it("한국어 원본 폴더와 공통 기타 폴더 경로 보존", () => {
        setEditingLocale("ko");
        expect(localizeStorageFolder("blog/original")).toBe("blog/original");
        setEditingLocale("ja");
        expect(localizeStorageFolder("misc/2026/10")).toBe("misc/2026/10");
    });

    it("화면 언어를 바꿔도 현재 콘텐츠 언어의 업로드 경로 유지", () => {
        setEditingLocale("en");
        document.cookie = `${UI_LOCALE_COOKIE}=ja; Path=/`;
        expect(localizeStorageFolder("portfolio/project")).toBe(
            "portfolio/_i18n/en/project"
        );
    });

    it("GIF 원본과 thumb을 같은 번역 폴더에 배치", () => {
        setEditingLocale("ja");
        const path = getStoragePath("blog/post", "gif");
        expect(path).toBe(`blog/_i18n/ja/post/${uuid}.gif`);
        expect(getSidecarPath(path, "thumb")).toBe(
            `blog/_i18n/ja/post/${uuid}.thumb.webp`
        );
    });

    it("브라우저 없는 환경에서는 기존 한국어 저장 경로 사용", () => {
        vi.stubGlobal("document", undefined);
        expect(localizeStorageFolder("portfolio/project")).toBe(
            "portfolio/project"
        );
    });
});

describe("폴더 이름 변경의 언어 경계", () => {
    it.each(["en", "ja"] as const)(
        "%s에서 본인 이미지 URL만 치환하고 복사한 한국어 원본 보존",
        (locale) => {
            setEditingLocale(locale);
            const urls = [
                "https://images.example.test/portfolio/old/ko.webp",
                "https://images.example.test/portfolio/_i18n/en/old/en.webp",
                "https://images.example.test/portfolio/_i18n/ja/old/ja.thumb.webp",
            ];
            const expected = urls.map((url) =>
                url.replace(
                    `/portfolio/_i18n/${locale}/old/`,
                    `/portfolio/_i18n/${locale}/new/`
                )
            );
            expect(
                replaceImageUrls(
                    urls.join("\n"),
                    "portfolio/old",
                    "portfolio/new"
                )
            ).toBe(expected.join("\n"));
        }
    );

    it("한국어 폴더 변경 시 다른 언어의 독립 URL 보존", () => {
        setEditingLocale("ko");
        const content =
            "![원본](https://images.example.test/blog/old/a.webp)\n![English](https://images.example.test/blog/_i18n/en/old/a.webp)";
        expect(replaceImageUrls(content, "blog/old", "blog/new")).toBe(
            "![원본](https://images.example.test/blog/new/a.webp)\n![English](https://images.example.test/blog/_i18n/en/old/a.webp)"
        );
    });
});

describe("가짜 저장소 요청의 언어 경계", () => {
    it("영어 이미지 목록 요청에서 한국어 폴더 접근 제외", async () => {
        setEditingLocale("en");
        await listStorageFiles("portfolio/project");
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
            action: "list",
            prefix: "portfolio/_i18n/en/project",
        });
    });

    it("일본어 폴더 삭제 요청에서 한국어 원본 폴더 접근 제외", async () => {
        setEditingLocale("ja");
        await deleteStorageFolder("portfolio/project");
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
            action: "delete",
            prefix: "portfolio/_i18n/ja/project",
        });
    });

    it("번역 폴더 이동의 출발지와 도착지를 같은 언어로 제한", async () => {
        setEditingLocale("en");
        await moveStorageFolder("blog/old", "blog/new");
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
            action: "move",
            oldPrefix: "blog/_i18n/en/old",
            newPrefix: "blog/_i18n/en/new",
        });
    });

    it("한국어 원본 폴더 삭제 요청의 기존 경로 유지", async () => {
        setEditingLocale("ko");
        await deleteStorageFolder("portfolio/project");
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
            action: "delete",
            prefix: "portfolio/project",
        });
    });
});
