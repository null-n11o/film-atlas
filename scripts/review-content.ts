import { mkdir, writeFile, copyFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build as bundle } from "esbuild";
import { loadDataset } from "../src/lib/content/load";
import { validateDataset } from "../src/lib/content/validate";
import { renderMarkdown } from "../src/lib/content/markdown";
import { projectPage, href } from "../src/lib/view/project";
import { renderPageBody, escapeHtml as esc } from "../src/lib/view/render";
import type { Dataset, PublishedGraph, PageRef } from "../src/lib/content/types";

// This initial preview accepts only unreviewed, spoiler-free, asset-free drafts.
// It never changes review records or writes to the production output directory.
export async function buildContentReview(data: Dataset, out: string) {
  await rm(out, { recursive: true, force: true });
  const issues = validateDataset(data);
  if (issues.length) throw Error(`INVALID_REVIEW_DATA: ${JSON.stringify(issues)}`);
  if (
    data.entities.some(e => e.status !== "draft" || e.review !== null ||
      e.spoilerWorkIds.length || e.title.spoilerWorkIds.length || e.kind === "asset") ||
    data.statements.some(s => s.status !== "draft" || s.review !== null ||
      s.spoilerWorkIds.length || s.quote)
  ) throw Error("UNSUPPORTED_REVIEW_CONTENT: use only unreviewed drafts without spoilers, quotes or assets");

  // Shared view projection for editorial review, not the publication pipeline.
  const graph = {
    entities: data.entities.map(({ status, review, revision, ...e }) => e),
    statements: data.statements.map(({ status, review, revision, markdown, ...s }) => ({ ...s, html: renderMarkdown(markdown) })),
  } as PublishedGraph;
  const order = ["work", "background", "person"];
  const pages = graph.entities.filter(e => order.includes(e.kind))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  const shell = (title: string, body: string) => `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}｜下書き確認</title><link rel="stylesheet" href="/style.css"></head><body><a class="skip-link" href="#main">本文へ移動</a><div class="test-banner">下書き・内容確認前｜外部公開用ではありません</div><header class="site-header"><a class="brand" href="/">film-atlas<span>原稿の確認用画面</span></a></header><main id="main" tabindex="-1">${body}</main><footer><p>出典の外部ページには本編の詳細を含む場合があります。</p></footer><script src="/map.js"></script></body></html>`;
  try {
    await mkdir(out, { recursive: true });
    await copyFile("src/styles/global.css", `${out}/style.css`);
    for (const e of pages) {
      const dir = out + href(e)!;
      await mkdir(dir, { recursive: true });
      const view = projectPage(graph, { kind: e.kind, id: e.id } as PageRef, new Set());
      const original = data.entities.find(x => x.kind === e.kind && x.id === e.id)!;
      const year = e.payload.type === "work" ? `<p class="meta">${e.payload.releaseYear}年公開</p>` : "";
      await writeFile(dir + "index.html", shell(e.safeTitle, `<div class="reading-layout"><header class="page-intro"><a class="back-link" href="/">確認する原稿の一覧へ</a><h1>${esc(e.safeTitle)}</h1>${year}<p class="lead">${esc(e.safeSummary)}</p><p class="meta">下書き revision ${original.revision}。外部資料には物語の詳細を含む場合があります。</p></header>${renderPageBody(view)}</div>`));
    }
    await writeFile(`${out}/index.html`, shell("確認する原稿の一覧", `<div class="reading-layout"><header class="page-intro"><h1>確認する原稿</h1><p>本文と出典を確認してください。通常の作品一覧には、内容確認を終えた原稿から掲載します。</p></header><ul class="related-list">${pages.map(e => `<li><h2><a href="${href(e)}">${esc(e.safeTitle)}</a></h2><p>${esc(e.safeSummary)}</p></li>`).join("")}</ul></div>`));
    await bundle({
      stdin: { contents: "import {mountMap} from './src/lib/view/exploration'; mountMap(document.querySelector('main'));", resolveDir: process.cwd() },
      bundle: true, platform: "browser", outfile: `${out}/map.js`,
    });
  } catch (error) {
    await rm(out, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  // A parse failure must also remove the previous preview.
  await rm(".runtime/content-review", { recursive: true, force: true });
  await buildContentReview(await loadDataset("content"), ".runtime/content-review");
  console.log("下書き確認用の画面を生成しました。原稿は未確認のままです。");
}
