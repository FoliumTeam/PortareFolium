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

    const shortcut = page.getByRole("button", {
        name: "대표 프로젝트 편집",
    });
    const sectionNavigation = page.getByRole("navigation", {
        name: "이력서 편집 섹션",
    });
    const projectNavigation = sectionNavigation.getByRole("button", {
        name: /프로젝트 (공개|비공개)/,
    });
    const projectsSection = page.locator('[data-resume-section="projects"]');

    await expect(shortcut).toBeVisible();
    await expect(sectionNavigation).toBeVisible();
    await expect(projectNavigation).toBeVisible();
    await expect(projectsSection).toBeVisible();

    await projectNavigation.click();
    await expect(projectNavigation).toHaveAttribute("aria-current", "location");
    await shortcut.click();

    await expect(
        projectsSection.getByRole("heading", {
            name: "대표 프로젝트 / 프로젝트 (Projects)",
        })
    ).toBeVisible();
    await expect(
        projectsSection.getByText(
            "Web 이력서는 Web Portfolio Featured 순서에서 최대 3건을 대표 프로젝트로 표시합니다."
        )
    ).toBeVisible();

    const sectionTop = await projectsSection.evaluate(
        (element) => element.getBoundingClientRect().top
    );
    expect(sectionTop).toBeGreaterThanOrEqual(0);
    expect(sectionTop).toBeLessThan(400);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
});
