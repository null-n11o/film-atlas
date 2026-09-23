import { test, expect } from "@playwright/test";
for (const width of [320, 390, 1280])
  test(`reading pages fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/works/test-work-a/",
      "/backgrounds/test-background/",
    ]) {
      await page.goto(path);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
      if (path.includes("/works/")) {
        await page
          .getByRole("button", {
            name: "この作品のネタバレを表示",
            exact: true,
          })
          .click();
        await expect(
          page.getByText("SPOILER_SENTINEL", { exact: true }),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        ).toBe(true);
      }
    }
  });
test("skip link, keyboard controls and 200% text scaling remain reachable", async ({
  page,
  browserName,
}) => {
  await page.goto("/works/test-work-a/");
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  await expect(page.getByRole("link", { name: "本文へ移動" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await page.evaluate(() => (document.documentElement.style.fontSize = "36px"));
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  if (browserName === "chromium")
    await page.screenshot({
      path: "docs/verification/screenshots/work-text200.png",
    });
  const button = page.getByRole("button", {
    name: "この作品のネタバレを表示",
    exact: true,
  });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("SPOILER_SENTINEL", { exact: true }),
  ).toBeVisible();
});
test("rendered pages make no external requests", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:4322/")) external.push(r.url());
  });
  for (const path of [
    "/",
    "/works/test-work-a/",
    "/backgrounds/test-background/",
    "/about/",
  ])
    await page.goto(path);
  expect(external).toEqual([]);
});
test("map selection has a 44px touch target on a small screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/works/test-work-a/");
  const box = await page
    .getByRole("button", { name: "場所を選択：テスト専用の場所" })
    .boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
});
