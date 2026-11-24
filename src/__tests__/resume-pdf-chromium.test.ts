import fs from "node:fs";
import { chromium } from "@playwright/test";
import { describe, expect, it } from "vitest";
import { generateResumePdf } from "@/lib/resume-pdf/generate";
import { normalizePdfOptions } from "@/lib/resume-pdf/options";
import { buildJobFieldSource } from "@/lib/resume-pdf/source";
import type { PdfLang, PdfVariant } from "@/types/resume-pdf";
import {
    aboutRow,
    ASOF,
    configRows,
    portfolioRows,
    resumeRow,
} from "./resume-pdf-fixture";

// 실제 Chromium으로 합성 입력 생성 → 관문 V1–V5 통과 확인. 브라우저가 없으면 건너뜀
const chromePath = process.env.CHROME_PATH ?? chromium.executablePath();
const hasChrome = fs.existsSync(chromePath);

describe.skipIf(!hasChrome)("이력서 PDF 실제 생성", () => {
    for (const [lang, variant] of [
        ["ko", "C"],
        ["ja", "F"],
    ] as [PdfLang, PdfVariant][]) {
        it(`${lang} ${variant}`, async () => {
            process.env.CHROME_PATH = chromePath;
            const r = resumeRow();
            r.basics!.name = lang === "ja" ? "テスト パーソン" : "테스트 인물";
            const result = await generateResumePdf({
                source: buildJobFieldSource({
                    lang,
                    jobField: "web",
                    resume: r,
                    about: aboutRow(),
                    portfolio: portfolioRows(),
                    config: configRows(),
                }),
                options: normalizePdfOptions({}),
                variant,
                asOf: ASOF,
                koName: "테스트 인물",
                r2PublicUrl: "",
                readR2: async () => null,
            });
            expect(result.ok ? [] : result.failures).toEqual([]);
            if (!result.ok) return;
            expect(Buffer.from(result.pdf.slice(0, 5)).toString()).toBe(
                "%PDF-"
            );
            expect(result.pages).toBeGreaterThanOrEqual(
                variant === "F" ? 3 : 1
            );
            expect(result.warnings.map((w) => w.code)).not.toContain(
                "external-request-blocked"
            );
        }, 60_000);
    }
});
