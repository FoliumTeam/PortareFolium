import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getResumePdfDefaults: vi.fn(),
    listResumePdfPresets: vi.fn(),
    saveResumePdfPreset: vi.fn(),
    deleteResumePdfPreset: vi.fn(),
}));

vi.mock("@/app/admin/actions/resume-pdf", () => ({
    getResumePdfDefaults: mocks.getResumePdfDefaults,
}));
vi.mock("@/app/admin/actions/resume-pdf-presets", () => ({
    listResumePdfPresets: mocks.listResumePdfPresets,
    saveResumePdfPreset: mocks.saveResumePdfPreset,
    deleteResumePdfPreset: mocks.deleteResumePdfPreset,
}));

import ResumePdfDialog from "@/components/resume-pdf/ResumePdfDialog";

const defaults = {
    sections: [
        { key: "work", on: true, supported: true },
        { key: "awards", on: false, supported: true },
        { key: "volunteer", on: true, supported: false },
    ],
    basics: { phone: true, birthDate: false },
    projects: [
        {
            slug: "a",
            name: "Project A",
            type: "work",
            ai: false,
            on: true,
            subsections: ["Notes"],
        },
        {
            slug: "b",
            name: "Project B",
            type: "personal",
            ai: false,
            on: true,
            subsections: [],
        },
        {
            slug: "c",
            name: "Project C",
            type: "personal",
            ai: true,
            on: false,
            subsections: [],
        },
    ],
    core: [{ id: "core-1", title: "Core One" }],
};

const source = { sourceKind: "job_field" as const, jobField: "web" };

const sentBody = () =>
    JSON.parse(
        (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string
    ) as { options: Record<string, unknown> };

beforeEach(() => {
    vi.clearAllMocks();
    mocks.getResumePdfDefaults.mockResolvedValue({
        success: true,
        data: defaults,
    });
    mocks.listResumePdfPresets.mockResolvedValue({ success: true, data: [] });
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
            new Response(new Blob(["%PDF-"]), {
                headers: { "X-Resume-Pdf-Warnings": encodeURIComponent("[]") },
            })
        )
    );
    URL.createObjectURL = vi.fn(() => "blob:pdf");
    URL.revokeObjectURL = vi.fn();
});

const open = async () => {
    render(<ResumePdfDialog open onOpenChange={() => {}} source={source} />);
    await screen.findByText("Project A");
};

describe("이력서 PDF 대화상자", () => {
    it("첫 상태 = 사이트 표시, 미지원 섹션은 끔·비활성", async () => {
        await open();
        const work = screen.getByRole("switch", { name: "경력" });
        const awards = screen.getByRole("switch", { name: "수상" });
        const volunteer = screen.getByRole("switch", { name: /봉사 활동/ });
        expect(work.getAttribute("aria-checked")).toBe("true");
        expect(awards.getAttribute("aria-checked")).toBe("false");
        expect(volunteer.getAttribute("aria-checked")).toBe("false");
        expect(volunteer.hasAttribute("disabled")).toBe(true);
        expect(
            (
                screen.getByRole("checkbox", {
                    name: "Project C",
                }) as HTMLInputElement
            ).checked
        ).toBe(false);
    });

    it("바꾸지 않으면 덮어쓰기 없이 요청, 되돌리면 덮어쓰기 제거", async () => {
        await open();
        const awards = screen.getByRole("switch", { name: "수상" });
        fireEvent.click(awards);
        fireEvent.click(awards);
        fireEvent.click(screen.getByRole("button", { name: "PDF 만들기" }));
        await waitFor(() => expect(fetch).toHaveBeenCalled());
        const { options } = sentBody();
        expect(options.sections).toEqual({});
        expect(options.basics).toEqual({});
        expect(
            (options.projects as { order?: string[] }).order
        ).toBeUndefined();
        expect(await screen.findByTitle("PDF 미리보기")).toBeTruthy();
    });

    it("프로젝트 선택·순서·세부 숨김은 바꾼 값으로 전송", async () => {
        await open();
        fireEvent.click(screen.getByRole("checkbox", { name: "Project C" }));
        fireEvent.click(screen.getAllByRole("button", { name: "위로" })[1]);
        fireEvent.click(screen.getByRole("switch", { name: "학점(GPA)" }));
        fireEvent.click(screen.getByRole("switch", { name: "Core One" }));
        fireEvent.click(screen.getByRole("checkbox", { name: "Notes" }));
        fireEvent.click(screen.getByRole("button", { name: "PDF 만들기" }));
        await waitFor(() => expect(fetch).toHaveBeenCalled());
        const { options } = sentBody();
        expect(options.projects).toEqual({
            order: ["b", "a", "c"],
            hiddenSubsections: { a: ["Notes"] },
            compactPersonal: false,
        });
        expect(options.details).toEqual({
            educationGpa: false,
            excludedCore: ["core-1"],
        });
    });

    it("관문 실패 내용 표시", async () => {
        vi.mocked(fetch).mockResolvedValue(
            Response.json(
                {
                    error: "PDF 검사 실패",
                    failures: [{ gate: "V2", detail: "p1–p2" }],
                },
                { status: 422 }
            )
        );
        await open();
        fireEvent.click(screen.getByRole("button", { name: "PDF 만들기" }));
        expect((await screen.findByRole("alert")).textContent).toContain(
            "V2 p1–p2"
        );
    });
});
