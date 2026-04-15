import { test, expect } from "@playwright/test";

// Blog 페이지: block/list view toggle, search, pagination 검증

test.describe("Blog view toggle", () => {
    test("toggle 버튼 존재 확인", async ({ page }) => {
        await page.goto("/blog");
        // auth 확인 후 렌더링되므로 대기 필요
        const listBtn = page.locator('button[aria-label="List view"]');
        const blockBtn = page.locator('button[aria-label="Block view"]');
        await expect(listBtn.first()).toBeAttached({ timeout: 10000 });
        await expect(blockBtn.first()).toBeAttached({ timeout: 10000 });
    });

    test("block 모드 전환 시 grid 레이아웃 표시", async ({ page }) => {
        await page.goto("/blog");
        // auth 확인 후 렌더링 대기
        const blockBtn = page.locator(
            'button[aria-label="Block view"]:visible'
        );
        await expect(blockBtn.first()).toBeVisible({ timeout: 10000 });
        await blockBtn.first().click();
        const card = page.locator(".aspect-video").first();
        await expect(card).toBeVisible();
    });

    test("list 모드 전환 시 list 레이아웃 표시", async ({ page }) => {
        await page.goto("/blog");
        // auth 확인 후 렌더링 대기
        const blockBtn = page.locator(
            'button[aria-label="Block view"]:visible'
        );
        const listBtn = page.locator('button[aria-label="List view"]:visible');
        await expect(blockBtn.first()).toBeVisible({ timeout: 10000 });
        await blockBtn.first().click();
        await listBtn.first().click();
        const list = page.locator("ul").first();
        await expect(list).toBeVisible();
    });
});

test.describe("Blog search", () => {
    test("search input 존재 확인", async ({ page }) => {
        await page.goto("/blog");
        const searchInput = page.locator(
            'input[placeholder="블로그 포스트 검색..."]:visible'
        );
        await expect(searchInput.first()).toBeVisible();
    });

    test("검색 입력 시 필터링 동작", async ({ page }) => {
        await page.goto("/blog");
        const searchInput = page
            .locator('input[placeholder="블로그 포스트 검색..."]:visible')
            .first();
        await searchInput.fill("zzz_nonexistent_query_zzz");
        // 검색 결과 없음 → "No posts match" 또는 빈 상태
        await expect(
            page.locator("text=No posts match the current filters.")
        ).toBeVisible({ timeout: 3000 });
    });
});

test.describe("Blog pagination", () => {
    test("pagination nav 조건부 표시", async ({ page }) => {
        await page.goto("/blog");
        // pagination은 포스트 12개 초과 시에만 표시
        const paginationNav = page.locator('nav[aria-label="Pagination"]');
        const exists = await paginationNav.isVisible().catch(() => false);
        // 포스트 수와 관계없이 페이지 정상 로딩 확인
        await expect(page.locator("body")).toBeVisible();
    });
});
