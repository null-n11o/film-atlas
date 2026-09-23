import { escapeHtml } from "../src/lib/view/render";
export function renderSitemap(
  origin: string | null,
  files: string[],
): string | null {
  if (!origin) return null;
  const urls = files
    .filter((file) => file.endsWith(".html") && file !== "404.html")
    .sort()
    .map(
      (file) =>
        new URL(
          file.replace(/index\.html$/, ""),
          origin.endsWith("/") ? origin : origin + "/",
        ).href,
    );
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escapeHtml(url)}</loc></url>`).join("")}</urlset>`;
}
