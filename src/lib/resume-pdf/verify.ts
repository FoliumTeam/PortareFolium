import type { ResumePdfModel, ResumePdfSource } from "@/types/resume-pdf";

// 생성 관문 V1–V5 (공식 §8). 하나라도 실패 또는 검사 불가면 PDF를 내보내지 않음

export type PdfPageText = { lines: string[] };

// 렌더 후 DOM에서 모은 검사 기준
export type DomFacts = {
    // 제목·머리글 글자 (h1–h4, th, dt, 회사 행, 태그, 역할 이름)
    headings: string[];
    // keep 처리한 묶음의 처음·끝 글자 (공백 제거, 각 30자)
    keepSpans: { first: string; last: string }[];
};

export type VerifyFailure = {
    gate: "V1" | "V2" | "V3" | "V4" | "V5";
    detail: string;
};

export const normText = (s: string) => s.replace(/[\s•◦▪]+/g, "");

const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const KANJI = /[一-鿿㐀-䶿]/;

// V3 후보: 다른 직무 전용 항목의 대표 글자. 현재 직무 항목에도 같은 글자가 있으면 제외
export const otherFieldStrings = (source: ResumePdfSource): string[] => {
    const field = source.jobField;
    const fields = (v: unknown) =>
        [v ?? []].flat().filter((x) => typeof x === "string");
    const other = (v: unknown) =>
        fields(v).length > 0 && !fields(v).includes(field);
    const leaks = new Set<string>();
    const keep = new Set<string>();
    const add = (set: Set<string>, ...values: unknown[]) => {
        for (const v of values)
            if (typeof v === "string" && v.trim().length >= 3)
                set.add(v.trim());
    };
    const r = source.resume as Record<
        string,
        { entries?: Record<string, unknown>[] } | undefined
    >;
    for (const sec of [
        "work",
        "projects",
        "coreCompetencies",
        "awards",
        "training",
        "careerPhases",
    ]) {
        for (const e of r[sec]?.entries ?? []) {
            add(
                other(e.jobField) ? leaks : keep,
                e.name,
                e.title,
                e.summary,
                e.description
            );
        }
    }
    for (const c of source.resume.skills?.entries ?? [])
        for (const k of c.keywords ?? [])
            add(other(k.jobField) ? leaks : keep, k.name);
    for (const p of source.portfolio) {
        const jf = [p.job_field, p.data?.jobField].flatMap(fields);
        add(jf.length && !jf.includes(field) ? leaks : keep, p.title);
    }
    return [...leaks].filter((s) => !keep.has(s));
};

export const verifyPdf = (input: {
    pages: PdfPageText[];
    dom: DomFacts;
    model: ResumePdfModel;
    source: ResumePdfSource;
    // ja 검사용 ko 이력서 이름 (D19)
    koName?: string;
}): VerifyFailure[] => {
    const { pages, dom, model, source } = input;
    const failures: VerifyFailure[] = [];
    if (!pages.length) return [{ gate: "V1", detail: "쪽 글자 추출 불가" }];
    const heads = new Set(dom.headings.map(normText).filter(Boolean));

    // V1: 마지막 쪽 외 쪽의 마지막 줄이 제목·머리글뿐
    pages.slice(0, -1).forEach((page, i) => {
        const last = page.lines.at(-1);
        if (!last) return;
        const key = normText(last);
        const parts = last
            .split(/\s{2,}|\t/)
            .map(normText)
            .filter(Boolean);
        if (
            heads.has(key) ||
            (parts.length > 1 && parts.every((p) => heads.has(p)))
        )
            failures.push({ gate: "V1", detail: `p${i + 1}: ${last}` });
    });

    // V2: 한 쪽 이하 묶음의 처음·끝이 다른 쪽. 찾지 못하면 검사 불가 = 실패
    // 같은 문구가 다른 쪽에도 있을 수 있음 → 두 표식이 함께 있는 쪽이 하나라도 있으면 통과
    const texts = pages.map((p) => normText(p.lines.join("")));
    const pagesWith = (s: string) =>
        texts.flatMap((t, i) => (t.includes(s) ? [i] : []));
    for (const span of dom.keepSpans) {
        const first = normText(span.first);
        const last = normText(span.last);
        if (!first || !last) continue;
        const a = pagesWith(first);
        const z = pagesWith(last);
        if (!a.length || !z.length)
            failures.push({
                gate: "V2",
                detail: `검사 불가: ${first}…${last}`,
            });
        else if (!a.some((p) => z.includes(p)))
            failures.push({
                gate: "V2",
                detail: `p${a[0] + 1}–p${z[z.length - 1] + 1}: ${first}…${last}`,
            });
    }
    // V3: 다른 직무 전용 데이터
    const all = texts.join("");
    for (const s of otherFieldStrings(source)) {
        if (all.includes(normText(s)))
            failures.push({ gate: "V3", detail: s.slice(0, 40) });
    }

    // V4: ko 외 언어에 한글
    if (model.lang !== "ko") {
        const found = all.match(new RegExp(HANGUL.source, "g"));
        if (found)
            failures.push({
                gate: "V4",
                detail: `한글 ${found.length}자: ${all.slice(Math.max(0, all.search(HANGUL) - 10), all.search(HANGUL) + 20)}`,
            });
    }

    // V5: ja에서 한자 성명 (ko 이름이 한글일 때만)
    if (
        model.lang === "ja" &&
        input.koName &&
        HANGUL.test(input.koName) &&
        KANJI.test(model.basics.name)
    )
        failures.push({ gate: "V5", detail: model.basics.name });

    return failures;
};

// PDF → 쪽별 줄 (바닥 여백의 쪽 번호·꼬리말 제외)
export const extractPdfPages = async (
    pdf: Uint8Array
): Promise<PdfPageText[]> => {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = getDocument({
        data: pdf.slice(),
        disableFontFace: true,
        useSystemFonts: false,
    });
    const doc = await task.promise;
    const footer = (15 * 72) / 25.4;
    const pages: PdfPageText[] = [];
    try {
        for (let n = 1; n <= doc.numPages; n++) {
            const page = await doc.getPage(n);
            const content = await page.getTextContent();
            const rows: { y: number; x: number; s: string }[] = [];
            for (const item of content.items) {
                if (!("str" in item) || !item.str.trim()) continue;
                const [, , , , x, y] = item.transform as number[];
                if (y < footer) continue;
                rows.push({ y, x, s: item.str });
            }
            rows.sort((a, b) => b.y - a.y || a.x - b.x);
            const lines: string[] = [];
            let lastY = Infinity;
            for (const r of rows) {
                if (Math.abs(r.y - lastY) < 2)
                    lines[lines.length - 1] += `  ${r.s}`;
                else lines.push(r.s);
                lastY = r.y;
            }
            pages.push({ lines });
        }
    } finally {
        await task.destroy();
    }
    return pages;
};
