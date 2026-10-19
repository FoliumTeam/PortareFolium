import { mkdirSync, readFileSync } from "node:fs";
import {
    expect,
    test as base,
    type Locator,
    type Page,
} from "@playwright/test";
import { CONTENT_LOCALE_COOKIE, UI_LOCALE_COOKIE } from "../../src/lib/i18n";
import { contentLanguageName } from "../helpers/language";

const test = base.extend<{ readonlyGuard: void }>({
    readonlyGuard: [
        async ({ page }, use) => {
            const serverMode =
                process.env.E2E_SERVER_MODE ??
                (process.env.CI ? "start" : "dev");
            const manifest = JSON.parse(
                readFileSync(
                    `${serverMode === "start" ? ".next/server" : ".next/dev/server"}/server-reference-manifest.json`,
                    "utf8"
                )
            );
            expect(
                Object.values(manifest.node ?? {}).some(
                    (entry) =>
                        (entry as { exportedName?: string }).exportedName ===
                        "copyContentToLanguage"
                )
            ).toBe(true);
            const writes = new Set([
                "copyContentToLanguage",
                "createLanguageVariant",
                "setDocumentPublication",
            ]);
            const blockedIds = new Set(
                Object.entries(manifest.node ?? {})
                    .filter(([, entry]) =>
                        writes.has(
                            (entry as { exportedName?: string }).exportedName ??
                                ""
                        )
                    )
                    .map(([id]) => id)
            );
            const errors: string[] = [];
            let blockedWrites = 0;
            page.on("console", (message) => {
                if (message.type() === "error") errors.push(message.text());
            });
            page.on("pageerror", (error) => errors.push(error.message));
            await page.route("**/*", async (route) => {
                const request = route.request();
                if (
                    request.method() === "POST" &&
                    blockedIds.has(request.headers()["next-action"])
                ) {
                    blockedWrites += 1;
                    await route.abort("blockedbyclient");
                    return;
                }
                await route.continue();
            });
            await use();
            expect(blockedWrites).toBe(0);
            expect(errors).toEqual([]);
        },
        { auto: true },
    ],
});

test.beforeEach(async ({ context, baseURL }) => {
    if (!baseURL) throw new Error("언어 사본 읽기 전용 시험의 baseURL 필요");
    await context.addCookies([
        { name: UI_LOCALE_COOKIE, value: "ko", url: baseURL },
        { name: CONTENT_LOCALE_COOKIE, value: "ko", url: baseURL },
    ]);
});

const copyName = "다른 언어로 복사";
const captureForReview = async (page: Page, name: string) => {
    if (process.env.PF_UI_QA_CAPTURE !== "1") return;
    const directory = "docs/private/language-controls";
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: `${directory}/${name}.png` });
};

const chooseTargetAndCancel = async (
    page: Page,
    dialog: Locator,
    captureName?: string
) => {
    const confirm = dialog.getByRole("button", { name: "복사", exact: true });
    const target = dialog.getByRole("button", { name: "대상 언어" });
    await expect(target).toHaveAttribute("data-locale", "");
    await expect(confirm).toBeDisabled();
    await target.click();
    await expect(
        page.getByRole("menuitemradio", { name: "한국어", exact: true })
    ).toHaveCount(0);
    await expect(
        page.getByRole("menuitemradio", { name: "日本語", exact: true })
    ).toBeVisible();
    if (captureName) await captureForReview(page, captureName);
    await page
        .getByRole("menuitemradio", { name: "English", exact: true })
        .click();
    await expect(confirm).toBeEnabled();
    await dialog.getByRole("button", { name: "취소", exact: true }).click();
    await expect(dialog).toBeHidden();
};

test("이력서의 항목별 복사 창에서 대상 선택 후 취소와 원본 유지", async ({
    page,
}) => {
    await page.goto("/admin#resume", { waitUntil: "domcontentloaded" });
    const main = page.getByRole("main");
    await expect(
        main.getByRole("heading", { name: "이력서 편집", exact: true })
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    const copy = main.getByRole("button", { name: copyName, exact: true });
    const layout = main.getByRole("button", {
        name: "레이아웃 편집",
        exact: true,
    });
    await expect(copy).toBeEnabled();
    const order = await main
        .getByRole("button")
        .evaluateAll((buttons) =>
            buttons.map(
                (button) =>
                    button.getAttribute("aria-label") ||
                    button.textContent?.trim()
            )
        );
    expect(order.indexOf(copyName)).toBeLessThan(
        order.indexOf("레이아웃 편집")
    );
    await expect(layout).toBeVisible();
    await captureForReview(page, "resume-controls-desktop");
    await copy.click();
    const dialog = page.getByRole("dialog", { name: copyName, exact: true });
    await expect(dialog).toContainText("Resume");
    await expect(dialog).toContainText("이력서");
    await chooseTargetAndCancel(page, dialog, "resume-copy-target-desktop");

    await expect(page).toHaveURL(/\/admin#resume$/);
    await expect(
        page.getByRole("button", { name: contentLanguageName })
    ).toHaveAttribute("data-locale", "ko");
});

test("실제 Portfolio 목록 항목의 제목·종류를 복사 창에서 확인하고 취소", async ({
    page,
}) => {
    await page.goto("/admin#portfolio", { waitUntil: "domcontentloaded" });
    const list = page.getByTestId("portfolio-panel-scroll");
    await expect(list).toBeVisible();
    await page.waitForLoadState("networkidle");
    const copies = list.getByRole("button", { name: copyName, exact: true });
    if ((await copies.count()) === 0) {
        await expect(
            list.getByText("첫 프로젝트를 기록할 준비가 됐습니다", {
                exact: true,
            })
        ).toBeVisible();
        test.info().annotations.push({
            type: "fixture",
            description:
                "실제 Portfolio 원본이 없어 빈 목록 확인. 항목 메타데이터·대상 언어 계약은 가짜 자료를 쓰는 단위 시험에서 검증",
        });
        return;
    }
    const row = list
        .locator("div.group")
        .filter({
            has: page.getByRole("button", { name: copyName, exact: true }),
        })
        .first();
    const title = (await row.locator("p.truncate").first().innerText()).trim();
    expect(title).not.toBe("");
    await row.hover();
    await row.getByRole("button", { name: copyName, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: copyName, exact: true });
    await expect(dialog).toContainText(title);
    await expect(dialog).toContainText("포트폴리오");
    await chooseTargetAndCancel(page, dialog);
    await expect(page).toHaveURL(/\/admin#portfolio$/);
});

test("About의 공개·복사 조작을 해당 패널에서 제공하고 공통 복사 영역 제거", async ({
    page,
}) => {
    await page.goto("/admin#about", { waitUntil: "domcontentloaded" });
    const main = page.getByRole("main");
    await expect(
        main.getByRole("heading", { name: "About 관리", exact: true })
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(
        main.getByRole("button", { name: copyName, exact: true })
    ).toHaveCount(1);
    await expect(
        main.getByRole("button", {
            name: /^(Published|Draft|공개 상태|콘텐츠 저장 후 공개 가능)/,
        })
    ).toHaveCount(1);
    await expect(
        page.locator("summary").filter({ hasText: "다른 언어에서 복사" })
    ).toHaveCount(0);
});

test("390px 복사 창의 중앙 배치와 화면 안 대상 선택·취소", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin#resume", { waitUntil: "domcontentloaded" });
    await expect(
        page.getByRole("heading", { name: "이력서 편집", exact: true })
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page
        .getByRole("main")
        .getByRole("button", { name: copyName, exact: true })
        .click();
    const dialog = page.getByRole("dialog", { name: copyName, exact: true });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    expect(Math.abs(box!.x + box!.width / 2 - 195)).toBeLessThan(3);
    expect(Math.abs(box!.y + box!.height / 2 - 422)).toBeLessThan(3);
    await chooseTargetAndCancel(page, dialog, "resume-copy-target-mobile");
    await expect(page).toHaveURL(/\/admin#resume$/);
});
