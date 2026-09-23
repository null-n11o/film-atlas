import { test, expect } from "@playwright/test";
test("map selection and list reach the same background, revocation resets map extent", async ({
  page,
}) => {
  await page.goto("/works/test-work-a/");
  const original = await page
    .locator("svg[data-map]")
    .getAttribute("data-bounds");
  const pin = page.getByRole("button", {
    name: "場所を選択：テスト専用の場所",
  });
  await pin.focus();
  await page.keyboard.press("Enter");
  await expect(pin).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator('[data-selected-places] a[href^="/backgrounds/"]'),
  ).toHaveAttribute("href", "/backgrounds/test-background/");
  await expect(
    page.locator('#place-l1 a[href^="/backgrounds/"]'),
  ).toHaveAttribute("href", "/backgrounds/test-background/");
  await page
    .getByRole("button", { name: "この作品のネタバレを表示", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "場所を選択：SPOILER_PLACE" }),
  ).toBeVisible();
  await expect(page.locator("#timeline")).toContainText("SPOILER_EVENT");
  expect(
    await page.locator("svg[data-map]").getAttribute("data-bounds"),
  ).not.toBe(original);
  await page
    .getByRole("button", { name: "この作品のネタバレを隠す", exact: true })
    .click();
  await expect(page.locator("svg[data-map]")).toHaveAttribute(
    "data-bounds",
    original!,
  );
  await expect(page.locator("body")).not.toContainText("SPOILER_");
});
test("without JavaScript places and timeline remain usable", async ({
  browser,
}) => {
  const c = await browser.newContext({ javaScriptEnabled: false });
  const p = await c.newPage();
  await p.goto("http://127.0.0.1:4322/works/test-work-a/");
  await expect(p.locator("#timeline")).toContainText("紀元前1年");
  await p.locator('#place-l1 a[href^="/backgrounds/"]').click();
  await expect(p).toHaveURL(/\/backgrounds\/test-background\/$/);
  await c.close();
});
