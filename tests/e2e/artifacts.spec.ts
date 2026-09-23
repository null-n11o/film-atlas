import { test, expect } from "@playwright/test";
import { auditDist } from "../../scripts/audit-dist";
test("generated safe HTML and internal links pass artifact audit", async () =>
  expect(await auditDist(".runtime/e2e-dist", "e2e")).toEqual([]));
test("every test page is marked and noindex", async ({ page }) => {
  for (const path of [
    "/",
    "/works/test-work-a/",
    "/backgrounds/test-background/",
    "/people/test-person/",
    "/about/",
    "/404.html",
  ]) {
    await page.goto(path);
    await expect(page.locator("meta[name=robots]")).toHaveAttribute(
      "content",
      "noindex,nofollow",
    );
    await expect(page.getByText(/テスト専用画面/)).toBeVisible();
    expect(await page.content()).not.toContain("SPOILER_");
  }
});
