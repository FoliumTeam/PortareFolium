import {
    collectImageUrls,
    loadImages,
    type ReadR2,
} from "@/lib/resume-pdf/assets";
import { fontUrls, printPdf } from "@/lib/resume-pdf/browser";
import { buildResumePdfModel } from "@/lib/resume-pdf/model";
import { renderResumePdf } from "@/lib/resume-pdf/render";
import {
    extractPdfPages,
    verifyPdf,
    type VerifyFailure,
} from "@/lib/resume-pdf/verify";
import type {
    PdfVariant,
    PdfWarning,
    ResumePdfOptions,
    ResumePdfSource,
} from "@/types/resume-pdf";

// PDF = Verify(Paginate(Render(Order(Select(Merge(Data, lang), field, opts)), lang)))

export type GenerateResult =
    | { ok: true; pdf: Uint8Array; pages: number; warnings: PdfWarning[] }
    | { ok: false; failures: VerifyFailure[]; warnings: PdfWarning[] };

// 오늘 (서울 기준 YYYY-MM-DD)
export const todayInSeoul = () =>
    new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

export const generateResumePdf = async (input: {
    source: ResumePdfSource;
    options: ResumePdfOptions;
    variant: PdfVariant;
    asOf: string;
    koName?: string;
    r2PublicUrl: string;
    readR2: ReadR2;
}): Promise<GenerateResult> => {
    const model = buildResumePdfModel(input.source, input.options, input.asOf);
    const { images, skipped } = await loadImages(
        collectImageUrls(model),
        input.r2PublicUrl,
        input.readR2
    );
    const warnings: PdfWarning[] = [
        ...model.warnings,
        ...skipped.map((url) => ({
            code: "image-skipped" as const,
            detail: url,
        })),
    ];
    const html = renderResumePdf(model, input.variant, {
        fonts: fontUrls(),
        resolveImage: (url) => images.get(url),
    });
    const { pdf, dom, blocked } = await printPdf(html, input.variant);
    // 차단은 안전 동작. 템플릿이 외부 자원을 쓰면 안 되므로 경고로 남김
    if (blocked > 0)
        warnings.push({
            code: "external-request-blocked",
            detail: String(blocked),
        });
    const pages = await extractPdfPages(pdf);
    const failures = verifyPdf({
        pages,
        dom,
        model,
        source: input.source,
        koName: input.koName,
    });
    if (failures.length) return { ok: false, failures, warnings };
    return { ok: true, pdf, pages: pages.length, warnings };
};
