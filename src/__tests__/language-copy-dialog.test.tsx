import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageCopyButton } from "@/components/admin/LanguageCopyButton";
import { LocaleProvider } from "@/components/LocaleProvider";
import {
    getEditingLocale,
    setEditingLocale,
    setContentDirty,
} from "@/lib/admin-content-state";
import { CONTENT_LOCALE_COOKIE, UI_LOCALE_COOKIE } from "@/lib/i18n";

const mocks = vi.hoisted(() => ({ copy: vi.fn() }));
vi.mock("@/app/admin/actions/content-variants", () => ({
    copyContentToLanguage: mocks.copy,
}));
const dirtyOwner = {};
const pendingCopies: (() => void)[] = [];

const copyElement = (
    sourceKey = "saved-project",
    sourceTitle = "원본 Portfolio"
) => (
    <LocaleProvider initialLocale="ko">
        <LanguageCopyButton
            kind="portfolio"
            sourceKey={sourceKey}
            sourceTitle={sourceTitle}
        />
    </LocaleProvider>
);
const openCopy = async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "다른 언어로 복사" }));
    return {
        user,
        dialog: await screen.findByRole("dialog", { name: "다른 언어로 복사" }),
    };
};
const chooseJapanese = async (
    user: ReturnType<typeof userEvent.setup>,
    dialog: HTMLElement
) => {
    await user.click(within(dialog).getByRole("button", { name: "대상 언어" }));
    await user.click(screen.getByRole("menuitemradio", { name: "日本語" }));
};

beforeEach(() => {
    if (typeof ResizeObserver === "undefined")
        vi.stubGlobal(
            "ResizeObserver",
            class {
                observe() {}
                unobserve() {}
                disconnect() {}
            }
        );
    mocks.copy.mockReset();
    mocks.copy.mockResolvedValue({
        success: true,
        lang: "ja",
        published: false,
    });
    sessionStorage.clear();
    setEditingLocale("en");
    document.cookie = `${UI_LOCALE_COOKIE}=ko; Path=/`;
    document.documentElement.lang = "ko";
    setContentDirty(dirtyOwner, false);
});
afterEach(async () => {
    await act(async () => {
        pendingCopies.splice(0).forEach((resolve) => resolve());
    });
    cleanup();
    setContentDirty(dirtyOwner, false);
    sessionStorage.clear();
    document.cookie = `${CONTENT_LOCALE_COOKIE}=; Path=/; Max-Age=0`;
    document.cookie = `${UI_LOCALE_COOKIE}=; Path=/; Max-Age=0`;
    document.documentElement.removeAttribute("lang");
    vi.unstubAllGlobals();
});

describe("현재 콘텐츠의 언어 사본 확인 창", () => {
    it("현재 항목·원본 언어를 표시하고 다른 두 언어로만 복사 후 원본 화면 유지", async () => {
        const user = userEvent.setup();
        const originalURL = window.location.href;
        const { rerender } = render(copyElement());
        await user.click(
            screen.getByRole("button", { name: "다른 언어로 복사" })
        );
        const dialog = await screen.findByRole("dialog", {
            name: "다른 언어로 복사",
        });
        expect(dialog).toHaveTextContent("원본 Portfolio");
        expect(dialog).toHaveTextContent("English");
        expect(dialog).toHaveTextContent("포트폴리오");
        rerender(copyElement("another-project", "다른 항목"));
        expect(dialog).toHaveTextContent("원본 Portfolio");
        expect(dialog).not.toHaveTextContent("다른 항목");
        const target = within(dialog).getByRole("button", {
            name: "대상 언어",
        });
        const confirm = within(dialog).getByRole("button", {
            name: /^복사$/,
        });
        expect(target).toHaveAttribute("data-locale", "");
        expect(confirm).toBeDisabled();
        await user.click(target);
        expect(
            screen.getByRole("menuitemradio", { name: "한국어" })
        ).toBeVisible();
        expect(
            screen.getByRole("menuitemradio", { name: "日本語" })
        ).toBeVisible();
        expect(
            screen.queryByRole("menuitemradio", { name: "English" })
        ).not.toBeInTheDocument();
        await user.click(screen.getByRole("menuitemradio", { name: "日本語" }));
        await user.click(confirm);

        await waitFor(() =>
            expect(mocks.copy).toHaveBeenCalledExactlyOnceWith(
                "portfolio",
                "ja",
                "saved-project",
                { __contentLocale: "en" }
            )
        );
        await waitFor(() =>
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        );
        expect(getEditingLocale()).toBe("en");
        expect(window.location.href).toBe(originalURL);
    });

    it("미저장 변경이 있으면 확인 창과 복사 호출 차단", async () => {
        setContentDirty(dirtyOwner, true);
        render(copyElement());
        const trigger = screen.getByRole("button", {
            name: "다른 언어로 복사",
        });
        expect(trigger).toBeDisabled();
        const user = userEvent.setup();
        await user.tab();
        expect(await screen.findByRole("tooltip")).toHaveTextContent(
            /저장.*변경|변경.*저장/
        );
        await user.click(trigger);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(mocks.copy).not.toHaveBeenCalled();
    });

    it("대상 언어에 기존 내용이 있으면 원본 언어와 확인 창 유지", async () => {
        mocks.copy.mockRejectedValueOnce(
            new Error("대상 언어의 기존 내용 보존을 위해 복사 중단")
        );
        const originalURL = window.location.href;
        const originalCookie = document.cookie;
        render(copyElement());
        const { user, dialog } = await openCopy();
        await chooseJapanese(user, dialog);
        await user.click(
            within(dialog).getByRole("button", { name: /^복사$/ })
        );

        await waitFor(() =>
            expect(within(dialog).getByRole("alert")).toHaveTextContent(
                "기존 내용 보존"
            )
        );
        expect(dialog).toHaveTextContent("원본 Portfolio");
        expect(
            within(dialog).getByRole("button", { name: "대상 언어" })
        ).toHaveAttribute("data-locale", "ja");
        expect(getEditingLocale()).toBe("en");
        expect(document.documentElement).toHaveAttribute("lang", "ko");
        expect(document.cookie).toBe(originalCookie);
        expect(window.location.href).toBe(originalURL);
    });

    it("같은 처리 묶음에서 확인을 두 번 눌러도 복사 한 번만 실행", async () => {
        let resolveCopy!: () => void;
        mocks.copy.mockReturnValueOnce(
            new Promise((resolve) => {
                resolveCopy = () =>
                    resolve({ success: true, lang: "ja", published: false });
            })
        );
        pendingCopies.push(() => resolveCopy());
        render(copyElement());
        const { user, dialog } = await openCopy();
        await chooseJapanese(user, dialog);
        const confirm = within(dialog).getByRole("button", {
            name: /^복사$/,
        });
        act(() => {
            fireEvent.click(confirm);
            fireEvent.click(confirm);
        });

        await waitFor(() => expect(mocks.copy).toHaveBeenCalledOnce());
        expect(confirm).toBeDisabled();
        await act(async () => {
            resolveCopy();
        });
        await waitFor(() =>
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        );
        expect(mocks.copy).toHaveBeenCalledOnce();
    });

    it("창을 연 뒤 원본 언어가 바뀌면 이전 항목으로 복사 실행 차단", async () => {
        render(copyElement());
        const { user, dialog } = await openCopy();
        await chooseJapanese(user, dialog);
        setEditingLocale("ko");
        await user.click(
            within(dialog).getByRole("button", { name: /^복사$/ })
        );

        await waitFor(() =>
            expect(within(dialog).getByRole("alert")).toHaveTextContent(
                "원본 언어"
            )
        );
        expect(mocks.copy).not.toHaveBeenCalled();
        expect(getEditingLocale()).toBe("ko");
    });
});
