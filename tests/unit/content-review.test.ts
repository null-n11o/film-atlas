import { mkdtemp, readFile, writeFile, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import type { Dataset } from "../../src/lib/content/types";
import { publish } from "../../src/lib/content/publish";
import { buildContentReview } from "../../scripts/review-content";

function draftDataset(): Dataset {
  const base = { revision: 1, status: "draft" as const, review: null, spoilerWorkIds: [] };
  const entity = { ...base, slug: null, safeTitle: "下書きの根拠", safeSummary: "内容確認前", title: { text: "下書きの根拠", spoilerWorkIds: [] } };
  return {
    entities: [
      { ...entity, id: "draft-work", kind: "work", slug: "draft-work", safeTitle: "確認対象の作品", payload: { type: "work", jaTitle: "確認対象の作品", originalTitle: "Review Film", releaseYear: 2026 } },
      { ...entity, id: "draft-source", kind: "source", payload: { type: "source", author: "検証用の発行者", url: "https://example.com/source", bibliography: null, accessedOn: "2026-09-23" } },
      { ...entity, id: "draft-evidence", kind: "evidence", payload: { type: "evidence", sourceId: "draft-source", target: { kind: "content-statement", id: "draft-text" }, locator: "検証用の段落", verificationNote: "EDITORIAL_NOTE_PRIVATE", support: "fact" } },
    ],
    statements: [{ ...base, id: "draft-text", owner: { kind: "work", id: "draft-work" }, kind: "history", section: "summary", workIds: [], evidenceRefs: ["draft-evidence"], quote: null, markdown: "DRAFT_ONLY 確認対象の本文。" }],
  };
}

const directories: string[] = [];
async function output() {
  const dir = await mkdtemp(join(tmpdir(), "film-atlas-review-"));
  directories.push(dir);
  return dir;
}
afterEach(async () => {
  await Promise.all(directories.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

test("drafts can be read without approving them or including them in publication", async () => {
  const data = draftDataset();
  const before = JSON.stringify(data);
  const dir = await output();
  await buildContentReview(data, dir);
  const index = await readFile(join(dir, "index.html"), "utf8");
  expect(index).toContain("確認対象の作品");
  expect(index).toContain("下書き・内容確認前");
  expect(index).toContain("noindex,nofollow");
  const work = await readFile(join(dir, "works/draft-work/index.html"), "utf8");
  expect(work).toContain("DRAFT_ONLY");
  expect(work).toContain("https://example.com/source");
  expect(work).toContain('src="/map.js"');
  expect(work).not.toContain("EDITORIAL_NOTE_PRIVATE");
  expect(JSON.stringify(data)).toBe(before);
  expect(publish(data).base.entities).toEqual([]);
});

test("invalid drafts remove stale review output instead of leaving an old preview", async () => {
  const data = draftDataset();
  data.statements[0].evidenceRefs = ["missing"];
  const dir = await output();
  await writeFile(join(dir, "index.html"), "stale draft");
  await expect(buildContentReview(data, dir)).rejects.toThrow("INVALID_REVIEW_DATA");
  await expect(access(join(dir, "index.html"))).rejects.toThrow();
});

test("the initial review preview refuses spoiler-bearing drafts", async () => {
  const data = draftDataset();
  data.statements[0].spoilerWorkIds = ["draft-work"];
  await expect(buildContentReview(data, await output())).rejects.toThrow("UNSUPPORTED_REVIEW_CONTENT");
});
