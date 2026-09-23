import { test, expect } from "@playwright/test";
test("selects by release year and follows background and evidence", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "テスト専用作品（2000）", exact: true })
    .click();
  await expect(page).toHaveURL(/\/works\/test-work-a\/$/);
  await page.getByRole("link", { name: "テスト専用背景", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "背景の説明", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "出典1", exact: true }).first().click();
  await expect(page.locator("#evidence-v1")).toContainText("テスト専用資料");
  await expect(page.locator("#evidence-v1")).toContainText("2026-09-23");
});
test("person links back to work and empty related works are explicit", async ({
  page,
}) => {
  await page.goto("/people/test-person/");
  await page
    .getByRole("link", { name: "テスト専用作品（2000）", exact: true })
    .click();
  await expect(page.getByText("関連作品はまだ掲載していません")).toBeVisible();
});
test("unknown URL offers the list and about has no unverified contact", async ({
  page,
}) => {
  await page.goto("/missing/");
  await expect(
    page.getByRole("heading", { name: "ページが見つかりません" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "作品一覧へ戻る" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/about/");
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator('a[href*="note.com"]')).toHaveCount(0);
});
