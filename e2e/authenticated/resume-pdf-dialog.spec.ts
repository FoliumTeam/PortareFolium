import { expect, test, type Locator } from "@playwright/test";

// React 처리기 연결 확인 뒤 클릭 (hydration 전 클릭 무시 방지)
const waitForHydrated = (locator: Locator) =>
    expect
        .poll(
            () =>
                locator.evaluate((element) =>
                    Object.keys(element).some((key) =>
                        key.startsWith("__reactProps$")
                    )
                ),
            { timeout: 15_000 }
        )
        .toBe(true);

// 관리자 이력서 PDF 대화상자: 사이트 기본값 조회 → PDF 생성(읽기 전용) → 미리보기·내려받기
// 프리셋 저장은 하지 않음 (운영 DB 쓰기 0)
test.use({ locale: "ko-KR" });

test("이력서 PDF 대화상자에서 PDF 생성", async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
    });
    const writes: string[] = [];
    page.on("request", (r) => {
        if (
            r.method() === "POST" &&
            /saveResumePdfPreset|deleteResumePdfPreset/.test(r.postData() ?? "")
        )
            writes.push(r.url());
    });

    await page.goto("/web/resume", { waitUntil: "domcontentloaded" });
    const open = page.getByRole("button", { name: "이력서 PDF 만들기" });
    await waitForHydrated(open);
    await open.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("섹션", { exact: true })).toBeVisible({
        timeout: 30_000,
    });
    // 첫 상태: 사이트 표시 그대로, 미지원 섹션은 끔·비활성
    await expect(dialog.getByRole("switch").first()).toBeVisible();

    const response = page.waitForResponse(
        (r) =>
            r.url().endsWith("/api/resume-pdf") &&
            r.request().method() === "POST",
        { timeout: 90_000 }
    );
    await dialog.getByRole("button", { name: "PDF 만들기" }).click();
    const res = await response;
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    await expect(dialog.getByTitle("PDF 미리보기")).toBeVisible();
    await expect(
        dialog.getByRole("link", { name: "내려받기" })
    ).toHaveAttribute("download", "resume-ko-c.pdf");
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
});
