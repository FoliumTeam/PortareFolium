import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ContentLanguageSelector } from "@/components/admin/ContentLanguageSelector";
import {
    bindContentAction,
    getEditingLocale,
    setEditingLocale,
    waitForContentActions,
} from "@/lib/admin-content-state";
import { CONTENT_LOCALE_COOKIE, UI_LOCALE_COOKIE } from "@/lib/i18n";
import type { UIMessages } from "@/lib/ui-messages";

const mocks = vi.hoisted(() => ({ loadUIMessages: vi.fn() }));
vi.mock("@/lib/ui-messages", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/ui-messages")>()),
    loadUIMessages: mocks.loadUIMessages,
}));

let resolveMessages!: (messages: UIMessages) => void;
let rejectMessages!: (error: Error) => void;

beforeEach(() => {
    sessionStorage.clear();
    setEditingLocale("ko");
    document.cookie = `${UI_LOCALE_COOKIE}=ko; Path=/`;
    document.documentElement.lang = "ko";
    mocks.loadUIMessages.mockReset();
    mocks.loadUIMessages.mockReturnValue(
        new Promise<UIMessages>((resolve, reject) => {
            resolveMessages = resolve;
            rejectMessages = reject;
        })
    );
});

afterEach(async () => {
    await act(async () => {
        resolveMessages({});
    });
    cleanup();
    sessionStorage.clear();
    document.cookie = `${CONTENT_LOCALE_COOKIE}=; Path=/; Max-Age=0`;
    document.cookie = `${UI_LOCALE_COOKIE}=; Path=/; Max-Age=0`;
    document.documentElement.removeAttribute("lang");
});

const renderSelectors = (onChange = vi.fn()) => {
    render(
        <LocaleProvider initialLocale="ko">
            <LanguageSelector admin />
            <ContentLanguageSelector onChange={onChange} />
        </LocaleProvider>
    );
    return {
        display: screen.getByRole("combobox", { name: "화면 언어" }),
        content: screen.getByRole("combobox", { name: "콘텐츠 언어" }),
        onChange,
    };
};

describe("화면 언어 로딩과 콘텐츠 언어 전환의 순서 보호", () => {
    it("화면 언어 파일 로딩 중 콘텐츠 언어 선택을 비활성화", async () => {
        const { display, content } = renderSelectors();
        fireEvent.change(display, { target: { value: "ja" } });
        expect(content).toBeDisabled();
        expect(document.cookie).toContain(`${UI_LOCALE_COOKIE}=ko`);

        await act(async () => {
            resolveMessages({});
        });

        expect(content).toBeEnabled();
        expect(document.cookie).toContain(`${UI_LOCALE_COOKIE}=ja`);
    });

    it("같은 React 배치의 콘텐츠 전환을 취소하고 화면 언어 저장 후 재선택 허용", async () => {
        const cookiesAtRemount: string[] = [];
        const onChange = vi.fn(() => {
            cookiesAtRemount.push(document.cookie);
        });
        const { display, content } = renderSelectors(onChange);

        await act(async () => {
            fireEvent.change(display, { target: { value: "ja" } });
            fireEvent.change(content, { target: { value: "en" } });
            await Promise.resolve();
        });

        expect(onChange).not.toHaveBeenCalled();
        expect(getEditingLocale()).toBe("ko");
        await act(async () => {
            resolveMessages({});
        });
        expect(onChange).not.toHaveBeenCalled();
        expect(content).toHaveValue("ko");

        fireEvent.change(content, { target: { value: "en" } });
        await waitFor(() =>
            expect(onChange).toHaveBeenCalledExactlyOnceWith("en")
        );
        expect(cookiesAtRemount[0]).toContain(`${UI_LOCALE_COOKIE}=ja`);
        expect(document.documentElement).toHaveAttribute("lang", "ja");
    });

    it("콘텐츠 저장 대기 중 시작한 화면 언어 로딩도 전환 직전 재확인", async () => {
        let resolveSave!: () => void;
        const save = new Promise<void>((resolve) => {
            resolveSave = resolve;
        });
        void bindContentAction(() => save)();
        const { display, content, onChange } = renderSelectors();
        fireEvent.change(content, { target: { value: "en" } });
        fireEvent.change(display, { target: { value: "ja" } });

        await act(async () => {
            resolveSave();
            await waitForContentActions();
        });

        expect(onChange).not.toHaveBeenCalled();
        expect(getEditingLocale()).toBe("ko");
        expect(content).toBeDisabled();
        await act(async () => {
            resolveMessages({});
        });
        expect(content).toBeEnabled();
        expect(content).toHaveValue("ko");
        expect(onChange).not.toHaveBeenCalled();
    });

    it("화면 언어 로딩 실패 후 기존 화면 언어에서 콘텐츠 재선택 허용", async () => {
        const { display, content, onChange } = renderSelectors();
        fireEvent.change(display, { target: { value: "ja" } });
        expect(content).toBeDisabled();

        await act(async () => {
            rejectMessages(new Error("사전 다운로드 실패"));
        });

        expect(content).toBeEnabled();
        expect(screen.getByRole("alert")).toBeVisible();
        fireEvent.change(content, { target: { value: "en" } });
        await waitFor(() =>
            expect(onChange).toHaveBeenCalledExactlyOnceWith("en")
        );
        expect(document.cookie).toContain(`${UI_LOCALE_COOKIE}=ko`);
        expect(document.documentElement).toHaveAttribute("lang", "ko");
    });
});
