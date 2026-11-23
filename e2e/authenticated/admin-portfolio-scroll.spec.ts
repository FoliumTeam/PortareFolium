import { expect, test } from "@playwright/test";
import { ADMIN_PANEL_TIMEOUT } from "../helpers/language";

test("Portfolio 탭을 고정하고 AI 설정과 목록을 한 영역에서 스크롤", async ({
    page,
}) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/admin#portfolio", { waitUntil: "domcontentloaded" });

    const tabs = page.getByTestId("portfolio-panel-tabs");
    const scrollArea = page.getByTestId("portfolio-panel-scroll");
    await expect(tabs).toBeVisible({ timeout: ADMIN_PANEL_TIMEOUT });
    await expect(scrollArea).toBeVisible();
    await expect(
        scrollArea.getByText("선택된 AI 프로젝트", { exact: true })
    ).toBeVisible();

    const selector = scrollArea.locator("details").filter({
        hasText: "AI 프로젝트 선택 변경",
    });
    await expect(selector).not.toHaveAttribute("open", "");
    await selector.locator("summary").click();
    await expect(selector).toHaveAttribute("open", "");
    await expect(
        selector.getByRole("button", { name: /AI 구역 (포함|제외)/ }).first()
    ).toBeVisible();

    const tabTopBefore = await tabs.evaluate(
        (element) => element.getBoundingClientRect().top
    );
    const scrollMetrics = await scrollArea.evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
    }));
    expect(scrollMetrics.scrollHeight).toBeGreaterThan(
        scrollMetrics.clientHeight
    );

    await scrollArea.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
    });
    await expect
        .poll(() => scrollArea.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
    await expect(
        scrollArea.getByText(/전체 선택 \(\d+개\)/).first()
    ).toBeVisible();

    const tabTopAfter = await tabs.evaluate(
        (element) => element.getBoundingClientRect().top
    );
    expect(Math.abs(tabTopAfter - tabTopBefore)).toBeLessThanOrEqual(1);

    const scrollOwners = await scrollArea.evaluate((root) =>
        [root, ...Array.from(root.querySelectorAll("*"))]
            .filter((element) => {
                const style = getComputedStyle(element);
                return (
                    ["auto", "scroll"].includes(style.overflowY) &&
                    element.scrollHeight > element.clientHeight
                );
            })
            .map(
                (element) =>
                    element.getAttribute("data-testid") ?? element.tagName
            )
    );
    expect(scrollOwners).toEqual(["portfolio-panel-scroll"]);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
});
