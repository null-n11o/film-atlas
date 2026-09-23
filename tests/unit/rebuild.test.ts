import { expect, it } from "vitest";
import {
  cp,
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  symlink,
  readdir,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { makeDataset, entity } from "../fixtures/make-dataset";
const exec = promisify(execFile);
it("full regeneration removes withdrawn pages, JSON and assets; failure leaves no output", async () => {
  await mkdir(".runtime", { recursive: true });
  const dir = await mkdtemp(resolve(".runtime/rebuild-"));
  try {
    for (const file of [
      "src",
      "scripts",
      "astro.config.mjs",
      "package.json",
      "tsconfig.json",
    ])
      await cp(file, join(dir, file), { recursive: true });
    await symlink(resolve("node_modules"), join(dir, "node_modules"), "dir");
    await mkdir(join(dir, "content/entities"), { recursive: true });
    await mkdir(join(dir, "content/statements"), { recursive: true });
    await mkdir(join(dir, "content/assets"), { recursive: true });
    const data = makeDataset();
    data.entities.push(
      entity(
        "a-test",
        {
          type: "asset",
          path: "content/assets/quote.txt",
          creator: "テスト",
          origin: "自作テスト",
          terms: "検証用",
          checkedOn: "2026-09-23",
          checkedBy: "架空の確認者",
          attribution: "テスト素材",
          modified: false,
          alt: { text: "テスト", spoilerWorkIds: [] },
        },
        "テスト素材",
      ),
    );
    await writeFile(join(dir, "content/assets/quote.txt"), "INTEGRATION_ASSET");
    async function save() {
      await rm(join(dir, "content/entities"), { recursive: true, force: true });
      await rm(join(dir, "content/statements"), {
        recursive: true,
        force: true,
      });
      await mkdir(join(dir, "content/entities"));
      await mkdir(join(dir, "content/statements"));
      for (const e of data.entities)
        await writeFile(
          join(dir, `content/entities/${e.kind}-${e.id}.json`),
          JSON.stringify(e).replaceAll("TEST_ONLY", "INTEGRATION_FIXTURE"),
        );
      for (const s of data.statements) {
        const { markdown, ...front } = s;
        await writeFile(
          join(dir, `content/statements/${s.id}.md`),
          "---\n" +
            JSON.stringify(front) +
            "\n---\n" +
            markdown.replaceAll("TEST_ONLY", "INTEGRATION_FIXTURE"),
        );
      }
    }
    const build = () =>
      exec(
        process.execPath,
        ["--import", "tsx", "scripts/build.ts", "production"],
        { cwd: dir, maxBuffer: 2_000_000 },
      );
    await save();
    await build();
    expect(
      await readFile(join(dir, "dist/works/test-work-b/index.html"), "utf8"),
    ).toContain("テスト専用作品");
    expect((await readdir(join(dir, "dist/_content"))).length).toBeGreaterThan(
      0,
    );
    expect(await readdir(join(dir, "dist/assets"))).toHaveLength(1);
    for (const e of data.entities) e.status = "withdrawn";
    for (const s of data.statements) s.status = "withdrawn";
    await save();
    await build();
    await expect(
      readFile(join(dir, "dist/works/test-work-b/index.html")),
    ).rejects.toThrow();
    await expect(readdir(join(dir, "dist/_content"))).rejects.toThrow();
    await expect(readdir(join(dir, "dist/assets"))).rejects.toThrow();
    data.entities[0].status = "published";
    data.entities[0].revision = 9;
    await save();
    await expect(build()).rejects.toThrow();
    await expect(readdir(join(dir, "dist"))).rejects.toThrow();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 60000);
