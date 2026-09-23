import { expect, it } from "vitest";
import { makeDataset, entity } from "../fixtures/make-dataset";
import { publish } from "../../src/lib/content/publish";
import { readStatement } from "../../src/lib/content/load";
import { renderMarkdown } from "../../src/lib/content/markdown";
import { parseGroup } from "../../src/lib/spoilers/response";
import { readAllowed, writeAllowed } from "../../src/lib/spoilers/store";
import { projectPage } from "../../src/lib/view/project";
import { renderPageBody } from "../../src/lib/view/render";
it("failed revoke invalidates a previously saved permission", () => {
  let value: string | null = JSON.stringify({ version: 1, workIds: ["w1"] });
  const storage = {
    getItem: () => value,
    setItem: () => {
      throw Error("quota");
    },
    removeItem: () => {
      value = null;
    },
  };
  expect(writeAllowed(storage, new Set())).toBe(false);
  expect([...readAllowed(storage)]).toEqual([]);
});
it("guarded work and person payload names do not leak into base", () => {
  const d = makeDataset();
  const work = d.entities[0];
  work.title = { text: "SPOILER_NAME", spoilerWorkIds: ["w1"] };
  if (work.payload.type === "work") {
    work.payload.jaTitle = "SPOILER_JA";
    work.payload.originalTitle = "SPOILER_ORIGINAL";
  }
  const person = d.entities.find((e) => e.id === "p1")!;
  person.title = { text: "SPOILER_PERSON", spoilerWorkIds: ["w1"] };
  if (person.payload.type === "person") person.payload.name = "SPOILER_PERSON";
  expect(JSON.stringify(publish(d).base)).not.toContain("SPOILER_");
});
it("non-YAML frontmatter cannot execute code before rejection", () => {
  const probe = globalThis as typeof globalThis & { __atlasProbe?: string };
  delete probe.__atlasProbe;
  expect(() =>
    readStatement(
      '---javascript\n(globalThis.__atlasProbe = "executed", {})\n---\ntext',
    ),
  ).toThrow();
  expect(probe.__atlasProbe).toBeUndefined();
  delete probe.__atlasProbe;
});
it("every supported Markdown structure crosses the response boundary", () => {
  const g = publish(makeDataset()).groups.find(
    (g) => g.graph.statements.length,
  )!;
  g.graph.statements[0].html = renderMarkdown(
    "3. Third\n4. **Fourth**\n\n> *quote* and `code`\n\n- bullet\n\nline  \nbreak",
  );
  expect(parseGroup(g, g)).toEqual(g);
});
it.each([
  "<img src=data:,x onerror=globalThis.__atlasXss=1//",
  '<p onclick="x()">text</p>',
  "<svg/onload=x()>",
  "<p>text</p><",
  '<ol start="3" onclick="x()">',
])("rejects malformed or active response markup: %s", (html) => {
  const g = publish(makeDataset()).groups.find(
    (g) => g.graph.statements.length,
  )!;
  g.graph.statements[0].html = html;
  expect(() => parseGroup(g, g)).toThrow();
});
it("quote attribution and terms render only with the authorized quote", () => {
  const d = makeDataset();
  const asset = entity(
    "quote-asset",
    {
      type: "asset",
      path: "content/assets/quote.txt",
      creator: "AUTHOR_X",
      origin: "ORIGIN_X",
      terms: "TERMS_X",
      checkedOn: "2026-09-23",
      checkedBy: "tester",
      attribution: "ATTRIBUTION_X",
      modified: false,
      alt: { text: "quote", spoilerWorkIds: [] },
    },
    "quote",
  );
  d.entities.push(asset);
  const s = d.statements.find((s) => s.id === "spoiler-w1")!;
  s.quote = {
    speaker: "Speaker",
    locator: "p.1",
    original: "Original",
    translated: false,
    assetId: asset.id,
  };
  const p = publish(d);
  const graph = {
    entities: [
      ...p.base.entities,
      ...p.groups.flatMap((g) => g.graph.entities),
    ],
    statements: [
      ...p.base.statements,
      ...p.groups.flatMap((g) => g.graph.statements),
    ],
  };
  const html = renderPageBody(
    projectPage(graph, { kind: "work", id: "w1" }, new Set(["w1"])),
  );
  expect(html).toContain("ATTRIBUTION_X");
  expect(html).toContain("TERMS_X");
  expect(
    renderPageBody(projectPage(graph, { kind: "work", id: "w1" }, new Set())),
  ).not.toContain("ATTRIBUTION_X");
});
