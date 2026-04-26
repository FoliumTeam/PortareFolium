import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginForm from "@/components/admin/LoginForm";

vi.mock("next-auth/react", () => ({
    signIn: vi.fn(),
    useSession: () => ({ status: "unauthenticated", data: null }),
}));

describe("login form env guide", () => {
    beforeEach(() => {
        Object.assign(globalThis, {
            navigator: {
                clipboard: {
                    writeText: vi.fn().mockResolvedValue(undefined),
                },
            },
        });
    });

    it("누락 env 안내와 full width 복사 버튼을 표시", async () => {
        render(
            <LoginForm
                siteName="PortareFolium"
                showDetailedSetupGuide
                setupState={{
                    missingEnvKeys: [
                        "AUTH_ADMIN_EMAIL",
                        "AUTH_ADMIN_PASSWORD_HASH",
                        "AUTH_SECRET",
                    ],
                }}
            />
        );

        expect(
            screen.getByText(/관리자 로그인 설정 필요/i)
        ).toBeInTheDocument();
        expect(
            screen.getByText(/용도:\s*관리자 로그인에 사용할 이메일/i)
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                /용도:\s*관리자 비밀번호를 평문 대신 저장하는 scrypt hash/i
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText(/용도:\s*로그인 세션과 쿠키 암호화에 쓰는 secret/i)
        ).toBeInTheDocument();
        expect(
            screen.getByText(/`AUTH_ADMIN_PASSWORD_HASH` 생성 명령/i)
        ).toBeInTheDocument();
        expect(
            screen.getByText(/`AUTH_SECRET` 생성 명령/i)
        ).toBeInTheDocument();

        const copyButtons = screen.getAllByRole("button", { name: "복사" });
        expect(copyButtons).toHaveLength(2);

        for (const button of copyButtons) {
            expect(button.className).toContain("w-full");
        }

        fireEvent.click(copyButtons[0]);

        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: /복사됨/i })
            ).toBeDisabled();
        });
    });

    it("production 안내에서는 생성 명령을 숨김", () => {
        render(
            <LoginForm
                siteName="PortareFolium"
                showDetailedSetupGuide={false}
                setupState={{
                    missingEnvKeys: [
                        "AUTH_ADMIN_EMAIL",
                        "AUTH_ADMIN_PASSWORD_HASH",
                        "AUTH_SECRET",
                    ],
                }}
            />
        );

        expect(
            screen.queryByText(/`AUTH_ADMIN_PASSWORD_HASH` 생성 명령/i)
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText(/`AUTH_SECRET` 생성 명령/i)
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "복사" })).toBeNull();
    });
});
