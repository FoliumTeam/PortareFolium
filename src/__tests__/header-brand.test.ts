import { describe, expect, it } from "vitest";
import { getHeaderBrandLabel } from "@/lib/header-brand";

describe("getHeaderBrandLabel", () => {
    it("DB의 이름과 직무 제목으로 대괄호형 헤더 문구를 구성", () => {
        expect(getHeaderBrandLabel("정호진", "게임 개발자")).toBe(
            "[ 정호진 · 게임 개발자 ]"
        );
    });
});
