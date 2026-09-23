import { test, expect } from "@playwright/test";
const show = "この作品のネタバレを表示",
  hide = "この作品のネタバレを隠す";
test("initial HTML is safe, toggle removes body and source, reload restores permission", async ({
  page,
  request,
}) => {
  const response = await request.get("/works/test-work-a/");
  expect(await response.text()).not.toContain("SPOILER_");
  await page.goto("/works/test-work-a/?spoilers=w1#show");
  await expect(page.getByText("SPOILER_SENTINEL", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: show, exact: true }).click();
  await expect(
    page.getByText("SPOILER_SENTINEL", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("SPOILER_SENTINEL", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: hide, exact: true }).click();
  await expect(page.locator("body")).not.toContainText("SPOILER_");
});
test("late response cannot reopen revoked content", async ({ page }) => {
  let release!: () => void;
  let requested!: () => void;
  const barrier = new Promise<void>((r) => (release = r)),
    started = new Promise<void>((r) => (requested = r));
  await page.route("**/_content/*.json", async (route) => {
    requested();
    await barrier;
    await route.continue();
  });
  await page.goto("/works/test-work-a/");
  await page.getByRole("button", { name: show, exact: true }).click();
  await started;
  await page.getByRole("button", { name: hide, exact: true }).click();
  const arrived = page.waitForResponse((r) => r.url().includes("/_content/"));
  release();
  await (await arrived).finished();
  await expect(page.locator("body")).not.toContainText("SPOILER_");
});
test("failed fetch offers retry", async ({ page }) => {
  await page.route("**/_content/*.json", (r) =>
    r.fulfill({ status: 503, body: "failed" }),
  );
  await page.goto("/works/test-work-a/");
  await page.getByRole("button", { name: show, exact: true }).click();
  await expect(page.getByRole("button", { name: "再試行" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("SPOILER_");
  await page.unroute("**/_content/*.json");
  await page.getByRole("button", { name: "再試行" }).click();
  await expect(
    page.getByText("SPOILER_SENTINEL", { exact: true }),
  ).toBeVisible();
});
test("blocked storage permits only the current page", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new Error("blocked");
      },
    }),
  );
  await page.goto("/works/test-work-a/");
  await page.getByRole("button", { name: show, exact: true }).click();
  await expect(
    page.getByText("SPOILER_SENTINEL", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("設定を保存できないため、このページだけに適用します。"),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("SPOILER_SENTINEL", { exact: true })).toHaveCount(
    0,
  );
});
test("unknown saved version is rejected and another work remains unpermitted", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "film-atlas:spoilers:v1",
      JSON.stringify({ version: 99, workIds: ["w1"] }),
    ),
  );
  await page.goto("/works/test-work-a/");
  await expect(
    page.getByRole("button", { name: show, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: show, exact: true }).click();
  await expect(page.locator("body")).not.toContainText("SPOILER_RELATED");
  await page.goto("/works/test-work-b/");
  await expect(
    page.getByRole("button", { name: show, exact: true }),
  ).toBeVisible();
});
test("history navigation respects revocation on another page", async ({
  page,
}) => {
  await page.goto("/works/test-work-a/");
  await page.getByRole("button", { name: show, exact: true }).click();
  await expect(
    page.getByText("SPOILER_SENTINEL", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "テスト専用背景", exact: true }).click();
  await page
    .getByRole("button", { name: /テスト専用作品.*ネタバレを隠す/ })
    .click();
  await page.goBack();
  await expect(
    page.getByRole("button", { name: show, exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("SPOILER_");
});
test("without JavaScript safe links work and controls stay disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4322/works/test-work-a/");
  await expect(
    page.getByRole("button", { name: show, exact: true }),
  ).toBeDisabled();
  await expect(page.locator("body")).not.toContainText("SPOILER_");
  await page.getByRole("link", { name: "テスト専用背景", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "背景の説明", exact: true }),
  ).toBeVisible();
  await context.close();
});
