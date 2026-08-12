import { test, expect } from "@playwright/test";

test.describe("Admin editor viewport fit", () => {
    test("Posts 편집 화면은 main 영역에 외곽 세로 스크롤이 없어야 함 (laptop viewport)", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto("/admin#posts", { waitUntil: "domcontentloaded" });

        // posts list 안정화 대기
        await page.waitForTimeout(1000);

        // 편집 버튼 텍스트 기반 탐색 (PostsPanel 목록 행의 편집 버튼)
        const editBtn = page.locator("button:has-text('편집')").first();
        await expect(editBtn).toBeVisible({ timeout: 15_000 });

        await editBtn.click();

        // 에디터 로드 대기
        await page.waitForSelector(".ProseMirror, [contenteditable='true']", {
            timeout: 15_000,
        });
        await page.waitForTimeout(500);

        // 외곽 세로 스크롤 없음 검증 (main tablet:overflow-hidden 효과)
        const overflowDelta = await page.evaluate(() => {
            return document.body.scrollHeight - window.innerHeight;
        });
        expect(overflowDelta).toBeLessThanOrEqual(2);
    });

    test("Portfolio 편집 화면도 main 영역에 외곽 세로 스크롤이 없어야 함", async ({
        page,
    }) => {
        const runtimeErrors: string[] = [];
        page.on("console", (message) => {
            if (message.type() === "error") runtimeErrors.push(message.text());
        });
        page.on("pageerror", (error) => runtimeErrors.push(error.message));

        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto("/admin#portfolio", { waitUntil: "domcontentloaded" });

        await page.waitForTimeout(1000);

        const editBtn = page.locator("button:has-text('편집')").first();
        await expect(editBtn).toBeVisible({ timeout: 15_000 });

        await editBtn.click();

        await page.waitForSelector(".ProseMirror, [contenteditable='true']", {
            timeout: 15_000,
        });
        await page.waitForTimeout(500);

        const overflowDelta = await page.evaluate(() => {
            return document.body.scrollHeight - window.innerHeight;
        });
        expect(overflowDelta).toBeLessThanOrEqual(2);
        await expect(
            page.getByText(
                "저장은 Draft를 갱신하며, 공개 반영은 발행 단계에서 처리됩니다."
            )
        ).toBeVisible();
        expect(runtimeErrors).toEqual([]);
    });
});
