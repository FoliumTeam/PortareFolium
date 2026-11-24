import type { PdfWarning, PdfWarningCode } from "@/types/resume-pdf";

// PDF에서 아직 그리지 않는 섹션 (D9). 켜져 있고 항목이 있으면 경고
export const UNSUPPORTED_PDF_SECTIONS = [
    "careerPhases",
    "volunteer",
    "publications",
    "interests",
    "references",
];

// 국제번호 뒤 국내 0 (예: +82 010-…) — 해외에서 걸 수 없는 번호
export const hasTrunkPrefixAfterCountryCode = (phone: string): boolean =>
    /^\(?\+\d{1,3}\)?[\s.-]*\(?0/.test(phone.trim());

export const createWarnings = () => {
    const list: PdfWarning[] = [];
    return {
        list,
        add: (code: PdfWarningCode, detail?: string) => {
            if (!list.some((w) => w.code === code && w.detail === detail))
                list.push(detail === undefined ? { code } : { code, detail });
        },
    };
};
