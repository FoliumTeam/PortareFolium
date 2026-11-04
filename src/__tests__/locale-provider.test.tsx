import { useState } from "react";
import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, useUILocale } from "@/components/LocaleProvider";
import { UI_LOCALE_COOKIE } from "@/lib/i18n";
import type { UIMessages } from "@/lib/ui-messages";

const mocks = vi.hoisted(() => ({ loadUIMessages: vi.fn() }));
vi.mock("@/lib/ui-messages", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/ui-messages")>()),
    loadUIMessages: mocks.loadUIMessages,
}));

const LocaleProbe = () => {
    const { locale, messages, changing, error, changeLocale } = useUILocale();
    const [draft, setDraft] = useState("원본 입력");
    const [result, setResult] = useState("");
    return (
        <>
            <output data-testid="locale">{locale}</output>
            <output data-testid="message">{messages.label}</output>
            <output data-testid="changing">{String(changing)}</output>
            <output data-testid="error">{error}</output>
            <output data-testid="result">{result}</output>
            <label>
                작성 내용
                <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                />
            </label>
            <button
                onClick={async () =>
                    setResult(
                        String(await changeLocale("ja", { apply: false }))
                    )
                }
            >
                새 문서에서 선택
            </button>
            <button
                onClick={async () =>
                    setResult(
                        String(await changeLocale("ja", { persist: false }))
                    )
                }
            >
                자동 감지
            </button>
            <button
                onClick={async () =>
                    setResult(String(await changeLocale("ja")))
                }
            >
                직접 선택
            </button>
        </>
    );
};

const renderProvider = () =>
    render(
        <LocaleProvider
            initialLocale="en"
            initialMessages={{ label: "English label" }}
        >
            <LocaleProbe />
        </LocaleProvider>
    );

beforeEach(() => {
    mocks.loadUIMessages.mockReset();
    mocks.loadUIMessages.mockResolvedValue({ label: "日本語の文言" });
    document.cookie = `${UI_LOCALE_COOKIE}=en; Path=/`;
    document.documentElement.lang = "en";
});

afterEach(() => {
    document.cookie = `${UI_LOCALE_COOKIE}=; Path=/; Max-Age=0`;
    document.documentElement.removeAttribute("lang");
});

describe("자동 언어 감지와 직접 선택 저장의 구분", () => {
    it("공개 화면의 전체 이동 준비는 쿠키만 바꾸고 현재 문서 언어·문구 보존", async () => {
        renderProvider();
        fireEvent.click(
            screen.getByRole("button", { name: "새 문서에서 선택" })
        );
        await waitFor(() =>
            expect(screen.getByTestId("result")).toHaveTextContent("true")
        );
        expect(document.cookie).toContain(`${UI_LOCALE_COOKIE}=ja`);
        expect(document.documentElement).toHaveAttribute("lang", "en");
        expect(screen.getByTestId("locale")).toHaveTextContent("en");
        expect(screen.getByTestId("message")).toHaveTextContent(
            "English label"
        );
    });
    it("자동 감지로 화면과 문서 언어를 바꿔도 선택 쿠키 생성 제외", async () => {
        document.cookie = `${UI_LOCALE_COOKIE}=; Path=/; Max-Age=0`;
        renderProvider();
        fireEvent.click(screen.getByRole("button", { name: "자동 감지" }));

        await waitFor(() =>
            expect(screen.getByTestId("result")).toHaveTextContent("true")
        );
        expect(screen.getByTestId("locale")).toHaveTextContent("ja");
        expect(screen.getByTestId("message")).toHaveTextContent("日本語の文言");
        expect(document.documentElement).toHaveAttribute("lang", "ja");
        expect(document.cookie).not.toContain(`${UI_LOCALE_COOKIE}=`);
    });

    it("직접 언어 선택 시 재방문에 사용할 선택 쿠키 저장", async () => {
        renderProvider();
        fireEvent.click(screen.getByRole("button", { name: "직접 선택" }));

        await waitFor(() =>
            expect(screen.getByTestId("result")).toHaveTextContent("true")
        );
        expect(document.cookie).toContain(`${UI_LOCALE_COOKIE}=ja`);
        expect(document.documentElement).toHaveAttribute("lang", "ja");
    });

    it("자동 감지는 기존 직접 선택 쿠키도 덮어쓰기 제외", async () => {
        renderProvider();
        const originalCookie = document.cookie;
        fireEvent.click(screen.getByRole("button", { name: "자동 감지" }));

        await waitFor(() =>
            expect(screen.getByTestId("result")).toHaveTextContent("true")
        );
        expect(document.cookie).toBe(originalCookie);
    });
});

describe("번역 파일 로딩과 미저장 입력 보존", () => {
    it.each(["자동 감지", "직접 선택", "새 문서에서 선택"])(
        "%s 로딩 실패 시 기존 화면·쿠키·미저장 입력 보존",
        async (button) => {
            mocks.loadUIMessages.mockRejectedValueOnce(
                new Error("사전 다운로드 실패")
            );
            renderProvider();
            const input = screen.getByRole("textbox", { name: "작성 내용" });
            fireEvent.change(input, {
                target: { value: "미저장  입력\n원문" },
            });
            const originalCookie = document.cookie;
            fireEvent.click(screen.getByRole("button", { name: button }));

            await waitFor(() =>
                expect(screen.getByTestId("result")).toHaveTextContent("false")
            );
            expect(screen.getByTestId("locale")).toHaveTextContent("en");
            expect(screen.getByTestId("message")).toHaveTextContent(
                "English label"
            );
            expect(screen.getByTestId("error")).not.toBeEmptyDOMElement();
            expect(screen.getByTestId("changing")).toHaveTextContent("false");
            expect(input).toHaveValue("미저장  입력\n원문");
            expect(document.cookie).toBe(originalCookie);
            expect(document.documentElement).toHaveAttribute("lang", "en");
        }
    );

    it("로딩 중 추가로 작성한 입력도 언어 전환 완료 후 보존", async () => {
        let resolve!: (messages: UIMessages) => void;
        mocks.loadUIMessages.mockImplementationOnce(
            () =>
                new Promise<UIMessages>((complete) => {
                    resolve = complete;
                })
        );
        renderProvider();
        const input = screen.getByRole("textbox", { name: "작성 내용" });
        fireEvent.click(screen.getByRole("button", { name: "직접 선택" }));
        expect(screen.getByTestId("changing")).toHaveTextContent("true");
        fireEvent.change(input, { target: { value: "로딩 중 작성한 회사명" } });

        await act(async () => {
            resolve({ label: "日本語の文言" });
        });

        expect(screen.getByTestId("result")).toHaveTextContent("true");
        expect(input).toHaveValue("로딩 중 작성한 회사명");
        expect(screen.getByTestId("locale")).toHaveTextContent("ja");
    });
});
