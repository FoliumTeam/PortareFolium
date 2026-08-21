import { expect, test } from "@playwright/test";

test("Resume 관리자에서 대표 프로젝트 편집 영역으로 바로 이동한다", async ({
    page,
}) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/admin#resume", { waitUntil: "domcontentloaded" });

    const sectionNavigation = page.getByRole("navigation", {
        name: "이력서 편집 섹션",
    });
    const projectNavigation = sectionNavigation.getByRole("button", {
        name: /프로젝트 (공개|비공개)/,
    });
    const projectsSection = page.locator('[data-resume-section="projects"]');

    await expect(sectionNavigation).toBeVisible();
    await expect(projectNavigation).toBeVisible();
    await expect(projectsSection).toBeVisible();

    await projectNavigation.click();
    await expect(projectNavigation).toHaveAttribute("aria-current", "location");

    await expect(
        projectsSection.getByRole("heading", {
            name: "대표 프로젝트",
            exact: true,
        })
    ).toBeVisible();
    await expect(
        projectsSection.getByText(
            "Portfolio의 Published 프로젝트를 직무 분야별로 최대 5건까지 선택합니다. 이 목록과 순서가 공개 이력서에 그대로 표시됩니다."
        )
    ).toBeVisible();
    await expect(
        projectsSection.getByRole("heading", {
            name: "선택된 대표 프로젝트",
        })
    ).toBeVisible();

    const sectionTop = await projectsSection.evaluate(
        (element) => element.getBoundingClientRect().top
    );
    expect(sectionTop).toBeGreaterThanOrEqual(0);
    expect(sectionTop).toBeLessThan(400);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
});

test("Resume 관리자에서 개인 정보와 preset 설정을 제공한다", async ({
    page,
}) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/admin#resume", { waitUntil: "domcontentloaded" });

    const basics = page.locator('[data-resume-section="basics"]').last();
    const presentation = page.locator(
        '[data-resume-section="basics-presentation"]'
    );

    await expect(
        basics.getByRole("heading", { name: "기본 정보" })
    ).toBeVisible();
    await expect(basics.getByText("생년월일", { exact: true })).toBeVisible();
    await expect(basics.getByText("병역 상태", { exact: true })).toBeVisible();
    await expect(
        presentation.getByRole("heading", { name: "표시와 디자인" })
    ).toBeVisible();
    await expect(
        presentation.getByRole("button", { name: /좌우 분할형/ })
    ).toBeVisible();
    await expect(
        presentation.getByText("생년월일", { exact: true })
    ).toBeVisible();
    await expect(
        presentation.getByText("병역 사항", { exact: true })
    ).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
});
