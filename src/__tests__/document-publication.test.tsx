import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentPublicationControl } from "@/components/admin/DocumentPublicationControl";
import { LocaleProvider } from "@/components/LocaleProvider";
import { LanguageSelector } from "@/components/LanguageSelector";
import { getEditingLocale, setEditingLocale } from "@/lib/admin-content-state";
import { CONTENT_LOCALE_COOKIE, UI_LOCALE_COOKIE } from "@/lib/i18n";

const mocks = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn() }));
vi.mock("@/app/admin/actions/content-variants", () => ({
    getDocumentPublication: mocks.read,
    setDocumentPublication: mocks.save,
}));

beforeEach(() => {
    mocks.read.mockReset();
    mocks.save.mockReset();
    mocks.read.mockResolvedValue(false);
    mocks.save.mockResolvedValue(undefined);
    sessionStorage.clear();
    setEditingLocale("ja");
    document.cookie = `${UI_LOCALE_COOKIE}=ko; Path=/`;
    document.documentElement.lang = "ko";
});

afterEach(() => {
    cleanup();
    sessionStorage.clear();
    document.cookie = `${CONTENT_LOCALE_COOKIE}=; Path=/; Max-Age=0`;
    document.cookie = `${UI_LOCALE_COOKIE}=; Path=/; Max-Age=0`;
    document.documentElement.removeAttribute("lang");
});

describe("문서별 공개 상태 조작", () => {
    it("미저장 문서는 조회·변경을 차단하고 저장된 뒤에만 상태 한 번 조회", async () => {
        const element = (saved: boolean) => (
            <LocaleProvider initialLocale="ko">
                <DocumentPublicationControl kind="resume" saved={saved} />
            </LocaleProvider>
        );
        const { rerender } = render(element(false));
        expect(
            screen.getByRole("button", { name: "콘텐츠 저장 후 공개 가능" })
        ).toBeDisabled();
        expect(mocks.read).not.toHaveBeenCalled();
        expect(mocks.save).not.toHaveBeenCalled();

        rerender(element(true));

        await waitFor(() =>
            expect(mocks.read).toHaveBeenCalledExactlyOnceWith("resume", {
                __contentLocale: "ja",
            })
        );
        await waitFor(() =>
            expect(screen.getByRole("button", { name: /^Draft/ })).toBeEnabled()
        );
        expect(mocks.save).not.toHaveBeenCalled();
    });

    it("화면 언어 변경은 재조회 없이 유지하고 공개 요청은 원본 일본어로 고정", async () => {
        const user = userEvent.setup();
        render(
            <LocaleProvider initialLocale="ko">
                <LanguageSelector admin />
                <DocumentPublicationControl kind="about" saved />
            </LocaleProvider>
        );
        await waitFor(() =>
            expect(screen.getByRole("button", { name: /^Draft/ })).toBeEnabled()
        );
        expect(mocks.read).toHaveBeenCalledExactlyOnceWith("about", {
            __contentLocale: "ja",
        });
        await user.click(screen.getByRole("button", { name: "화면 언어" }));
        await user.click(
            screen.getByRole("menuitemradio", { name: "English" })
        );
        await waitFor(() =>
            expect(document.documentElement).toHaveAttribute("lang", "en")
        );
        expect(mocks.read).toHaveBeenCalledOnce();
        expect(getEditingLocale()).toBe("ja");

        await user.click(screen.getByRole("button", { name: /^Draft/ }));

        await waitFor(() =>
            expect(mocks.save).toHaveBeenCalledExactlyOnceWith("about", true, {
                __contentLocale: "ja",
            })
        );
        expect(mocks.read).toHaveBeenCalledOnce();
        expect(getEditingLocale()).toBe("ja");
    });
});
