import { describe, expect, it } from "vitest";
import {
    findPublicJobField,
    isPublicJobFieldId,
    normalizePublicJobFields,
    sanitizePublicJobField,
} from "@/lib/public-job-field";

describe("public job field sanitizer", () => {
    it("slug 형태의 jobField만 허용", () => {
        expect(sanitizePublicJobField("web")).toBe("web");
        expect(sanitizePublicJobField("game_dev-2")).toBe("game_dev-2");
        expect(sanitizePublicJobField(" ")).toBe("");
    });

    it("PostgREST filter 구분 문자를 차단", () => {
        expect(sanitizePublicJobField("web,job_field.is.null")).toBeNull();
        expect(sanitizePublicJobField("web)")).toBeNull();
        expect(sanitizePublicJobField("web.eq.foo")).toBeNull();
    });
});

describe("public job field registry", () => {
    it("등록된 URL 안전 항목만 유지하고 중복 ID를 제거", () => {
        expect(
            normalizePublicJobFields([
                { id: "frontend", name: "Frontend", emoji: "🖥️" },
                { id: "frontend", name: "Duplicate", emoji: "✨" },
                { id: "about", name: "Reserved", emoji: "⚠️" },
                { id: "invalid.dot", name: "Invalid", emoji: "⚠️" },
            ])
        ).toEqual([
            {
                id: "frontend",
                name: "Frontend",
                emoji: "🖥️",
                headerTitle: "Frontend",
            },
        ]);
    });

    it("등록 목록에 있는 직무 분야만 공개 경로로 해석", () => {
        const fields = normalizePublicJobFields([
            {
                id: "frontend",
                name: "Frontend",
                emoji: "🖥️",
                headerTitle: "Frontend Developer",
            },
            { id: "game", name: "Game", emoji: "🎮" },
        ]);

        expect(findPublicJobField(fields, "frontend")?.name).toBe("Frontend");
        expect(findPublicJobField(fields, "frontend")?.headerTitle).toBe(
            "Frontend Developer"
        );
        expect(findPublicJobField(fields, "web")).toBeNull();
        expect(isPublicJobFieldId("about")).toBe(false);
    });
});
