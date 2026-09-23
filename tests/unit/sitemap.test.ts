import { expect, it } from "vitest";
import { renderSitemap } from "../../scripts/sitemap";
it("requires configured origin and lists only HTML routes", () => {
  expect(renderSitemap(null, ["index.html"])).toBeNull();
  const xml = renderSitemap("https://example.org", [
    "index.html",
    "works/a/index.html",
    "404.html",
    "_content/a.json",
  ]);
  expect(xml).toContain("https://example.org/works/a/");
  expect(xml).not.toContain("404");
  expect(xml).not.toContain(".json");
});
