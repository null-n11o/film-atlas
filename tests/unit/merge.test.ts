import { expect, it } from "vitest";
import { makeDataset } from "../fixtures/make-dataset";
import { publish } from "../../src/lib/content/publish";
import { mergeVisibleGraph } from "../../src/lib/spoilers/merge";
it("the most specific authorized variant wins regardless of group ordering", () => {
  const p = publish(makeDataset());
  const cached = new Map(p.groups.map((g) => [g.token, g.graph]));
  for (const groups of [p.groups, [...p.groups].reverse()]) {
    expect(
      mergeVisibleGraph(
        p.base,
        groups,
        cached,
        new Set(["w2", "w3"]),
      ).entities.find((e) => e.id === "w3")?.title.text,
    ).toBe("SPOILER_FORMAL_TITLE");
    expect(
      mergeVisibleGraph(p.base, groups, cached, new Set(["w3"])).entities.find(
        (e) => e.id === "w3",
      )?.title.text,
    ).toBe("条件付きテスト作品");
    expect(
      mergeVisibleGraph(p.base, groups, cached, new Set()).entities.some(
        (e) => e.id === "w3",
      ),
    ).toBe(false);
  }
});
