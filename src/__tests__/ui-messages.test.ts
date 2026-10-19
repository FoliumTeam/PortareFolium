import { createElement, type ChangeEvent } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocalizedElement } from "@/components/LocalizedText";
import { LocaleProvider } from "@/components/LocaleProvider";
import {
    loadUIMessages,
    normalizeUIMessage,
    resolveUIMessage,
    translateUI,
} from "@/lib/ui-messages";

describe("화면 문구와 사용자 입력의 구분", () => {
    it("문구 조회용 공백을 한 칸으로 정규화", () => {
        expect(normalizeUIMessage("  변경사항\n\t저장  ")).toBe(
            "변경사항 저장"
        );
    });

    it("일치하는 화면 문구 번역 후 바깥 공백 보존", () => {
        expect(translateUI("  저장\n", { 저장: "Save" })).toBe("  Save\n");
    });

    it("사전에 없는 문구는 원문 그대로 유지", () => {
        const original = "사용자 입력  회사명\n두 번째 줄";
        expect(translateUI(original, { 저장: "Save" })).toBe(original);
    });

    it("명시한 변수 값은 사전 문구와 같아도 재번역 제외", () => {
        expect(
            translateUI(
                "회사: {0}",
                { "회사: {0}": "Company: {0}", 저장: "Save" },
                ["저장"]
            )
        ).toBe("Company: 저장");
    });

    it("변수의 줄바꿈과 연속 공백을 원문 그대로 보존", () => {
        const value = "회사  이름\n두 번째 줄";
        expect(
            translateUI(
                "저장 실패: {0}",
                { "저장 실패: {0}": "Save failed: {0}" },
                [value]
            )
        ).toBe(`Save failed: ${value}`);
    });

    it("번역을 명시한 중첩 화면 문구만 변수 안에서 번역", () => {
        expect(
            translateUI(
                "{0} 선택",
                { "{0} 선택": "Select {0}", 저장: "Save" },
                [{ text: "저장" }]
            )
        ).toBe("Select Save");
    });

    it("숫자와 빈 변수를 안전한 표시 문자열로 치환", () => {
        expect(translateUI("{0} / {1} / {2}", {}, [0, null, undefined])).toBe(
            "0 /  / "
        );
    });

    it("전달하지 않은 변수 자리는 임의 값으로 덮어쓰기 제외", () => {
        expect(translateUI("{0} / {1}", {}, ["first"])).toBe("first / {1}");
    });

    it("가공 전 사용자 문자열을 UI 문구로 자동 해석하지 않는 계약", () => {
        expect(resolveUIMessage("저장", { 저장: "Save" })).toBe("저장");
    });
});

describe("이미 조합된 상태와 오류 문구", () => {
    it("번역 순서가 바뀌어도 각 변수 값 보존", () => {
        expect(
            translateUI("전체 12개 중 3개 선택", {
                "전체 {0}개 중 {1}개 선택": "Selected {1} of {0}",
            })
        ).toBe("Selected 3 of 12");
    });

    it("정규식 기호가 포함된 고정 문구도 정확히 일치하는 경우만 번역", () => {
        const messages = { "저장 [항목] ({0})": "Save [item] ({0})" };
        expect(translateUI("저장 [항목] (회사)", messages)).toBe(
            "Save [item] (회사)"
        );
        expect(translateUI("저장 항목 (회사)", messages)).toBe(
            "저장 항목 (회사)"
        );
    });

    it("이미 조합된 오류에도 변수의 줄바꿈과 연속 공백 보존", () => {
        const error = "회사  이름\n두 번째 줄";
        expect(
            translateUI(`저장 실패: ${error}`, {
                "저장 실패: {0}": "Save failed: {0}",
            })
        ).toBe(`Save failed: ${error}`);
    });

    it("변수만 있는 사전 항목으로 임의 콘텐츠를 번역하지 않는 계약", () => {
        expect(
            translateUI("사용자가 작성한 회사명", { "{0}": "Translated {0}" })
        ).toBe("사용자가 작성한 회사명");
    });
});

describe("실제 언어 사전의 핵심 화면 문구", () => {
    it.each([
        ["ko", "이력서", "이력서 편집", "기본 정보"],
        ["en", "Resume", "Edit resume", "Basic information"],
        ["ja", "履歴書", "履歴書を編集", "基本情報"],
    ] as const)(
        "%s 공개 메뉴와 관리자 편집 문구 제공",
        async (locale, resume, editResume, basics) => {
            const messages = await loadUIMessages(locale);
            expect(translateUI("Resume", messages)).toBe(resume);
            expect(translateUI("이력서 편집", messages)).toBe(editResume);
            expect(translateUI("기본 정보", messages)).toBe(basics);
        }
    );
});

describe("입력 요소의 화면 속성 번역", () => {
    it("속성만 번역하고 사전과 같은 사용자 입력 원문 보존", () => {
        render(
            createElement(LocaleProvider, {
                initialLocale: "en",
                initialMessages: { 제목: "Title", 입력: "Enter", 저장: "Save" },
                children: createElement(LocalizedElement<"input">, {
                    as: "input",
                    translatedProps: ["aria-label", "placeholder"],
                    "aria-label": "제목",
                    placeholder: "입력",
                    value: "저장",
                    readOnly: true,
                }),
            })
        );
        const input = screen.getByRole("textbox", { name: "Title" });
        expect(input).toHaveAttribute("placeholder", "Enter");
        expect(input).toHaveValue("저장");
    });

    it("번역된 입력 요소의 변경 이벤트를 원본 값으로 전달", () => {
        const onChange = vi.fn(
            (event: ChangeEvent<HTMLInputElement>) => event.target.value
        );
        render(
            createElement(LocaleProvider, {
                initialLocale: "ja",
                initialMessages: { 제목: "タイトル" },
                children: createElement(LocalizedElement<"input">, {
                    as: "input",
                    translatedProps: ["aria-label"],
                    "aria-label": "제목",
                    defaultValue: "원본",
                    onChange,
                }),
            })
        );
        fireEvent.change(screen.getByRole("textbox", { name: "タイトル" }), {
            target: { value: "入力  原文" },
        });
        expect(onChange).toHaveReturnedWith("入力  原文");
    });
});
