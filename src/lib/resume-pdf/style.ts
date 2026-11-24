import type { PdfLang } from "@/types/resume-pdf";

// 이력서 PDF 스타일 (시제품 build-samples.mjs 이식 + 인쇄 밀도 정본 2026-11-22)

export const PDF_FONT_FAMILY = "ResumePdf";
const STACK = `"${PDF_FONT_FAMILY}",sans-serif`;

export type PdfFontUrls = { regular: string; bold: string };

// 글꼴 주입: 서버에서는 함수에 포함한 woff2를 file:// 또는 data: 로 전달
export const fontFaceCss = (urls: PdfFontUrls): string =>
    [
        [urls.regular, 400],
        [urls.bold, 700],
    ]
        .map(
            ([url, weight]) =>
                `@font-face{font-family:"${PDF_FONT_FAMILY}";src:url("${url}") format("woff2");font-weight:${weight};font-style:normal;font-display:block}`
        )
        .join("");

// 줄바꿈: ko 어절 단위, ja 금칙 처리 (keep-all은 일본어에서 구두점에서만 끊김)
const wrap = (lang: PdfLang) =>
    lang === "ja"
        ? "word-break:normal;line-break:strict;text-wrap:pretty"
        : "word-break:keep-all";

// ja 역할 칸: 가타카나 직함이 길어 넓히고 글자 축소
export const roleColumnWidth = (lang: PdfLang) =>
    lang === "ja" ? "50mm" : "44mm";

export const cssC = (lang: PdfLang, footer: string) => `
@page{size:A4;margin:14mm 15mm 16mm;@bottom-left{content:"${footer}";font:8pt ${STACK};color:#8592a3}@bottom-right{content:counter(page) " / " counter(pages);font:8pt ${STACK};color:#8592a3}}
:root{--accent:#2d7ff9;--ink:#191f28;--muted:#5b6878;--line:#e3e8ef;--soft:#f2f6fb}
*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:${STACK};color:var(--ink);font-size:9pt;line-height:1.45;${wrap(lang)};overflow-wrap:anywhere}
a{color:inherit;text-decoration:none}p{margin:0 0 1.2mm}ul{margin:1mm 0 0;padding-left:4.5mm}li{margin-bottom:.8mm;break-inside:avoid}
.head{display:grid;grid-template-columns:1fr 30mm;gap:6mm;align-items:start;padding-bottom:5mm;border-bottom:2px solid var(--ink)}
.head h1{font-size:25pt;letter-spacing:-.04em;line-height:1.15;margin:0}.head .title{font-size:13pt;font-weight:700;color:var(--accent);margin:1.5mm 0 3.5mm}
.photo{width:30mm;height:38mm;object-fit:cover;border-radius:2.5mm;border:1px solid var(--line)}
.btns{display:flex;flex-wrap:wrap;gap:2mm}.btns+.btns{margin-top:2mm}.btn{display:inline-flex;align-items:center;gap:1.6mm;padding:1.4mm 3mm;border-radius:1.8mm;background:#243247;color:#fff;font-size:8.4pt;font-weight:600;line-height:1.3}
.btn svg{width:3.4mm;height:3.4mm;fill:none;stroke:currentColor;stroke-width:2}.btn svg.brand{fill:currentColor;stroke:none}.btn.github{background:#111}.btn.linkedin{background:#0a66c2}.btn.npm{background:#cb3837}
.sec{margin-top:4.5mm}.sec>.head-keep>h2{font-size:12pt;margin:0 0 2.2mm;padding:1.6mm 3mm;background:var(--soft);border-left:1.4mm solid var(--accent);letter-spacing:-.01em;break-after:avoid}
.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm 5mm}.facts dt{font-size:8pt;color:var(--muted)}.facts dd{margin:0;font-weight:600}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:3mm}.card{border:1px solid var(--line);border-radius:2mm;padding:3mm 3.5mm;break-inside:avoid}.card h3{font-size:10pt;margin:0 0 1.2mm}.card p{font-size:8.8pt;color:#333d4b}
.job{margin-bottom:3mm}.job>.row,.job>.meta,.role>.row,.role>.sum{break-after:avoid}.row{display:flex;justify-content:space-between;gap:4mm;align-items:baseline}.row h3{font-size:11pt;margin:0}.meta{color:var(--muted);font-size:8.4pt;white-space:nowrap}
.role{break-inside:avoid;margin:1.5mm 0 0;padding-left:3mm;border-left:2px solid var(--line)}.role .pos{font-weight:700}.role .sum{color:#333d4b}
.proj{break-inside:avoid;display:grid;grid-template-columns:32mm 1fr;gap:4mm;padding:2.5mm 0;border-bottom:1px solid var(--line)}.proj .tag,.proj .row,.proj .desc,.proj h4{break-after:avoid}.proj p,.proj .btns{break-inside:avoid}.edu{break-inside:avoid}.proj:last-child{border-bottom:0}
.proj.wide{grid-template-columns:1fr}.proj img{width:32mm;height:21mm;object-fit:cover;border-radius:1.5mm;border:1px solid var(--line);background:var(--soft)}
.proj h3{font-size:10.5pt;margin:0 0 .6mm}.proj .desc{margin:1mm 0}.proj h4{font-size:8.6pt;color:var(--accent);margin:1.6mm 0 .4mm}.proj .tech{font-size:8pt;color:var(--muted);margin-top:1.2mm}.proj .btns{margin-top:1.6mm}
.tag{display:inline-block;font-size:7.6pt;font-weight:700;color:var(--accent);background:var(--soft);border-radius:1mm;padding:.2mm 1.6mm;margin-bottom:.8mm}
.skills{display:grid;grid-template-columns:${lang === "ja" ? "30mm" : "24mm"} 1fr;gap:1.8mm 3mm}.skills dt{font-weight:700;font-size:8.8pt}.skills dd{margin:0}.chip{display:inline-block;border:1px solid var(--line);border-radius:1mm;padding:.1mm 1.6mm;margin:0 1mm 1mm 0;font-size:8.2pt}
.edu-courses{margin-top:1.5mm}.edu-courses b{font-size:8.6pt;color:var(--muted);font-weight:600;margin-right:2mm}
.ai-note{margin-top:2mm}.ai-label{font-weight:700;font-size:8.8pt;margin:0 0 .6mm}.ai-note ul{margin:0}
.card.ai ul{font-size:8.8pt;margin:0;color:#333d4b}
.head-keep,.keep{break-inside:avoid}
`;

export const cssF = (lang: PdfLang) => `
@page{size:A4;margin:15mm 16mm 15mm;@bottom-center{content:counter(page) " / " counter(pages);font:8pt ${STACK};color:#000}}
*{box-sizing:border-box}body{margin:0;font-family:${STACK};color:#000;font-size:9pt;line-height:1.45;${wrap(lang)};overflow-wrap:anywhere}
h1{font-size:18pt;letter-spacing:.4em;text-align:center;margin:0 0 4mm;font-weight:700}
.date{text-align:right;font-size:9pt;margin:0 0 2mm}
table{width:100%;border-collapse:collapse}td,th{border:.3mm solid #000;padding:1.2mm 2mm;vertical-align:top;text-align:left;font-weight:400}
th{background:#f0f0f0;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-weight:700;white-space:nowrap}
.outer{border:.6mm solid #000}.lbl{width:24mm;background:#f0f0f0;font-weight:700;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.top{display:grid;grid-template-columns:1fr 30mm;gap:5mm;align-items:start}
.photo{width:30mm;height:40mm;object-fit:cover;display:block;outline:.3mm solid #000;outline-offset:-.3mm}
.page2{break-before:page}.pr{height:70mm}.wish{height:30mm}.lic td{height:9mm}
.head-links{font-size:8.6pt;text-align:right;margin:0 0 2mm}
.name{font-size:15pt;font-weight:700;letter-spacing:.15em}
.hist td.y{width:14mm;text-align:center}.hist td.m{width:9mm;text-align:center}.hist .center{text-align:center;font-weight:700;letter-spacing:.3em}.hist .end{text-align:right}
.mt{margin-top:4mm}.part{break-before:page}
h2{font-size:11pt;margin:3.5mm 0 1.5mm;padding-bottom:.8mm;border-bottom:.5mm solid #000;break-after:avoid}
h3{font-size:10pt;margin:3mm 0 1mm;break-after:avoid}
.co{display:flex;justify-content:space-between;align-items:baseline;font-weight:700}
.corow th{padding:1.4mm 2.4mm}.tbl{margin-top:3mm}.tbl.first{margin-top:0}
table.detail,table.skill{table-layout:fixed}table.cont{margin-top:-.3mm}
.head-keep,.keep{break-inside:avoid}
.co span{font-weight:400;font-size:9pt}
.detail td.p{width:24mm;white-space:nowrap;font-size:8.8pt}.detail td.r{width:${roleColumnWidth(lang)};font-size:${lang === "ja" ? "8pt" : "8.8pt"};word-break:keep-all}
.detail tr,.skill tr{break-inside:avoid}.block{break-inside:avoid}
ul{margin:.6mm 0 0;padding-left:4mm}li{margin-bottom:.5mm}p{margin:0 0 1mm}
.small{font-size:8.6pt}
`;

// 쪽 내용 영역 (A4 − @page 여백, mm)
export const PAGE_AREA = {
    C: { w: 210 - 30, h: 297 - 30 },
    F: { w: 210 - 32, h: 297 - 30 },
} as const;
