import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { pageViewport, paginateScript } from "@/lib/resume-pdf/paginate";
import type { DomFacts } from "@/lib/resume-pdf/verify";
import type { PdfVariant } from "@/types/resume-pdf";

// 요청마다 Chromium 실행 → HTML 배치·측정 → PDF. 외부 network 전부 차단 (file:·data:만)

export const FONT_DIR = path.join(
    process.cwd(),
    "src",
    "assets",
    "resume-pdf-fonts"
);

export const fontUrls = () => ({
    regular: pathToFileURL(path.join(FONT_DIR, "PretendardJP-Regular.woff2"))
        .href,
    bold: pathToFileURL(path.join(FONT_DIR, "PretendardJP-Bold.woff2")).href,
});

// 렌더 후 검사 기준 수집 (브라우저 안에서 실행)
const DOM_FACTS = `(() => {
  const norm = (s) => s.replace(/\\s+/g, "");
  const headings = [...document.querySelectorAll("h1,h2,h3,h4,th,dt,.co,.tag,.pos")]
    .map((el) => el.innerText.trim()).filter(Boolean);
  // 처음·끝 표식: 묶음 안 첫·마지막 글자 덩어리(6자 이상)의 앞 12자. 한 줄 안에 있어 다단 배치에서도 PDF 글자와 순서가 같음
  const keepSpans = [...document.querySelectorAll("[data-sec].keep")].map((el) => {
    const runs = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = norm(n.textContent || "");
      if (t.length >= 6) runs.push(t.slice(0, 12));
    }
    return { first: runs[0] || "", last: runs[runs.length - 1] || "" };
  });
  return { headings, keepSpans };
})()`;

const launch = async () => {
    const { default: puppeteer } = await import("puppeteer-core");
    if (process.platform === "linux") {
        const { default: chromium } = await import("@sparticuz/chromium");
        return puppeteer.launch({
            executablePath: await chromium.executablePath(),
            args: chromium.args,
            headless: true,
        });
    }
    // 로컬 개발: CHROME_PATH → Playwright Chromium → 설치된 Chrome
    const executablePath = process.env.CHROME_PATH ?? (await findLocalChrome());
    if (!executablePath) throw new Error("CHROME_PATH 필요 (로컬 PDF 생성)");
    return puppeteer.launch({ executablePath, headless: true });
};

const findLocalChrome = async (): Promise<string | undefined> => {
    const home = os.homedir();
    const playwrightRoot =
        process.platform === "win32"
            ? path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright")
            : process.platform === "darwin"
              ? path.join(home, "Library", "Caches", "ms-playwright")
              : path.join(home, ".cache", "ms-playwright");
    const candidates: string[] = [];
    try {
        const dirs = (await fs.readdir(playwrightRoot))
            .filter((d) => /^chromium-\d+$/.test(d))
            .sort()
            .reverse();
        for (const d of dirs)
            candidates.push(
                process.platform === "win32"
                    ? path.join(playwrightRoot, d, "chrome-win64", "chrome.exe")
                    : process.platform === "darwin"
                      ? path.join(
                            playwrightRoot,
                            d,
                            "chrome-mac",
                            "Chromium.app",
                            "Contents",
                            "MacOS",
                            "Chromium"
                        )
                      : path.join(playwrightRoot, d, "chrome-linux", "chrome")
            );
    } catch {}
    candidates.push(
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    );
    for (const c of candidates) {
        try {
            await fs.access(c);
            return c;
        } catch {}
    }
    return undefined;
};

export const printPdf = async (
    html: string,
    variant: PdfVariant
): Promise<{ pdf: Uint8Array; dom: DomFacts; blocked: number }> => {
    const browser = await launch();
    const file = path.join(
        os.tmpdir(),
        `resume-pdf-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.html`
    );
    try {
        const page = await browser.newPage();
        await page.setJavaScriptEnabled(true);
        await page.setRequestInterception(true);
        let blocked = 0;
        page.on("request", (req) => {
            const url = req.url();
            if (url.startsWith("file:") || url.startsWith("data:"))
                void req.continue();
            else {
                blocked++;
                void req.abort();
            }
        });
        await page.setViewport(pageViewport(variant));
        await page.emulateMediaType("print");
        await fs.writeFile(file, html);
        await page.goto(pathToFileURL(file).href, {
            waitUntil: "load",
            timeout: 30_000,
        });
        const fontsOk = await page.evaluate(async () => {
            await document.fonts.ready;
            return [...document.fonts].some((f) => f.status === "loaded");
        });
        if (!fontsOk) throw new Error("PDF 글꼴 로드 실패");
        await page.evaluate(paginateScript(variant));
        const dom = (await page.evaluate(DOM_FACTS)) as DomFacts;
        const pdf = await page.pdf({
            format: "A4",
            preferCSSPageSize: true,
            printBackground: true,
            timeout: 60_000,
        });
        return { pdf: new Uint8Array(pdf), dom, blocked };
    } finally {
        await fs.rm(file, { force: true });
        await browser.close();
    }
};
