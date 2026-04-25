import { describe, expect, it } from "vitest";
import { sanitizePublicJobField } from "@/lib/public-job-field";

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
