import { expect, it } from "vitest";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stagePublication } from "../../scripts/build";
import { makeDataset } from "../fixtures/make-dataset";
it("replaces previous data and refuses test data in production", async () => {
  const dir = await mkdtemp(join(tmpdir(), "atlas-build-"));
  try {
    await writeFile(join(dir, "old.json"), "OLD");
    const d = makeDataset();
    await stagePublication(d, dir, "e2e");
    await expect(readFile(join(dir, "old.json"))).rejects.toThrow();
    expect(await readFile(join(dir, "manifest.json"), "utf8")).toContain(
      "test-work-a",
    );
    const work = d.entities.find((x) => x.id === "w2")!;
    work.status = "withdrawn";
    d.entities = d.entities.filter(
      (e) =>
        e.id !== "w3" &&
        e.id !== "ev-guarded-body" &&
        e.id !== "r-related" &&
        e.id !== "ev-r-related" &&
        e.id !== "ev-reason-r-related",
    );
    d.statements = d.statements.filter(
      (s) => !["reason-r-related", "guarded-body"].includes(s.id),
    );
    await stagePublication(d, dir, "e2e");
    expect(await readFile(join(dir, "manifest.json"), "utf8")).not.toContain(
      "test-work-b",
    );
    await expect(stagePublication(d, dir, "production")).rejects.toThrow(
      "TEST_ONLY",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
import { auditDist } from "../../scripts/audit-dist";
it("rejects broken internal destinations and leaked spoiler metadata", async () => {
  const dir = await mkdtemp(join(tmpdir(), "atlas-audit-"));
  try {
    await writeFile(
      join(dir, "index.html"),
      '<a href="/missing/">開く</a><meta name="description" content="SPOILER_SOURCE">',
    );
    const codes = (await auditDist(dir, "e2e")).map((x) => x.code);
    expect(codes).toContain("BROKEN_INTERNAL_LINK");
    expect(codes).toContain("SPOILER_LEAK");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
it("resolves the root link to index.html", async () => {
  const dir = await mkdtemp(join(tmpdir(), "atlas-audit-"));
  try {
    await writeFile(join(dir, "index.html"), '<a href="/">作品一覧</a>');
    expect(await auditDist(dir, "production")).toEqual([]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
