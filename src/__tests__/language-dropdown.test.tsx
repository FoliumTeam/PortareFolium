import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LanguageDropdown } from "@/components/LanguageDropdown";

describe("공통 언어 선택 메뉴", () => {
    it("키보드로 메뉴를 열고 영어 선택을 한 번 전달", async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();
        render(
            <LanguageDropdown
                value="ko"
                label="화면 언어"
                onValueChange={onValueChange}
            />
        );
        const trigger = screen.getByRole("button", { name: "화면 언어" });
        trigger.focus();
        await user.keyboard("{ArrowDown}");
        await waitFor(() =>
            expect(
                screen.getByRole("menuitemradio", { name: "한국어" })
            ).toHaveFocus()
        );
        await user.keyboard("{ArrowDown}{Enter}");

        expect(onValueChange).toHaveBeenCalledExactlyOnceWith("en");
        await waitFor(() => expect(trigger).toHaveFocus());
        await user.keyboard("{ArrowDown}");
        await screen.findByRole("menu");
        await user.keyboard("{Escape}");
        await waitFor(() =>
            expect(screen.queryByRole("menu")).not.toBeInTheDocument()
        );
        expect(trigger).toHaveFocus();
    });

    it("현재 언어를 다시 선택해도 한 번 전달하고 로컬 국기만 표시", async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();
        render(
            <LanguageDropdown
                value="ko"
                label="화면 언어"
                onValueChange={onValueChange}
            />
        );
        const trigger = screen.getByRole("button", { name: "화면 언어" });
        expect(trigger).toHaveAttribute("data-locale", "ko");
        await user.click(trigger);
        const flags = screen.getByRole("menu").querySelectorAll("img");
        expect(flags).toHaveLength(3);
        for (const flag of flags)
            expect(flag.getAttribute("src")).toMatch(/^\/flags\/[^/]+\.svg$/);
        await user.click(screen.getByRole("menuitemradio", { name: "한국어" }));

        expect(onValueChange).toHaveBeenCalledExactlyOnceWith("ko");
    });

    it("비활성 상태에서 메뉴 열기와 선택 처리 차단", async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();
        render(
            <LanguageDropdown
                value="ja"
                label="화면 언어"
                onValueChange={onValueChange}
                disabled
            />
        );
        const trigger = screen.getByRole("button", { name: "화면 언어" });
        expect(trigger).toBeDisabled();
        await user.click(trigger);

        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
        expect(onValueChange).not.toHaveBeenCalled();
    });
});
