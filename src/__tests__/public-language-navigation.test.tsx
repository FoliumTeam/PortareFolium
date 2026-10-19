import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicLanguageNavigation } from "@/components/PublicLanguageNavigation";
import { PublicAnchor } from "@/components/PublicLink";

vi.mock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams("lang=ja"),
}));
vi.mock("next/link", () => ({ default: "a" }));

afterEach(() => {
    cleanup();
    history.replaceState(null, "", "/");
});

describe("주소 변경 직후의 공개 링크 언어", () => {
    it("이전 화면 상태가 남아 있어도 현재 주소의 언어로 자동 부착값 교정", async () => {
        history.replaceState(null, "", "/web/resume?lang=ja");
        render(
            <PublicLanguageNavigation>
                <PublicAnchor href="/web/portfolio">목록</PublicAnchor>
            </PublicLanguageNavigation>
        );
        const link = screen.getByRole("link", { name: "목록" });
        await waitFor(() =>
            expect(link).toHaveAttribute("href", "/web/portfolio?lang=ja")
        );
        history.replaceState(null, "", "/web/resume?lang=en");
        fireEvent.contextMenu(link);
        expect(link).toHaveAttribute("href", "/web/portfolio?lang=en");
        history.replaceState(null, "", "/web/resume");
        fireEvent.contextMenu(link);
        expect(link).toHaveAttribute("href", "/web/portfolio");
    });

    it("직접 지정한 대상 언어와 다운로드 링크는 원문 유지", () => {
        history.replaceState(null, "", "/web/resume?lang=en");
        render(
            <PublicLanguageNavigation>
                <PublicAnchor href="/web/portfolio?lang=kr">
                    명시 링크
                </PublicAnchor>
                <PublicAnchor href="/export" download="">
                    파일
                </PublicAnchor>
            </PublicLanguageNavigation>
        );
        const explicit = screen.getByRole("link", { name: "명시 링크" });
        const download = screen.getByRole("link", { name: "파일" });
        fireEvent.contextMenu(explicit);
        fireEvent.contextMenu(download);
        expect(explicit).toHaveAttribute("href", "/web/portfolio?lang=kr");
        expect(download).toHaveAttribute("href", "/export");
    });

    it("MDX 일반 anchor의 자동 부착값도 다음 주소에서 재계산", () => {
        history.replaceState(null, "", "/web/resume?lang=ja");
        render(
            <PublicLanguageNavigation>
                <a href="/web/blog">본문 링크</a>
            </PublicLanguageNavigation>
        );
        const link = screen.getByRole("link", { name: "본문 링크" });
        fireEvent.contextMenu(link);
        expect(link).toHaveAttribute("href", "/web/blog?lang=ja");
        history.replaceState(null, "", "/web/resume?lang=en");
        fireEvent.contextMenu(link);
        expect(link).toHaveAttribute("href", "/web/blog?lang=en");
    });
});
