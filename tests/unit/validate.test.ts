import { expect, it } from "vitest";
import { validateDataset } from "../../src/lib/content/validate";
import { makeDataset, entity } from "../fixtures/make-dataset";
import type { Dataset } from "../../src/lib/content/types";
const find = (d: Dataset, id: string) => d.entities.find((x) => x.id === id)!;
it("accepts valid evidence, typed IDs and unknown dates", () => {
  const d = makeDataset();
  expect(validateDataset(d)).toEqual([]);
  d.entities.push(
    entity(
      "w1",
      { type: "person", name: "別種", disambiguation: "" },
      "別種",
      "other",
    ),
  );
  const p = find(d, "e1").payload;
  if (p.type === "event") {
    p.start = null;
    p.end = null;
    p.certainty = "unknown";
  }
  expect(validateDataset(d)).toEqual([]);
});
it.each<[string, (d: Dataset) => void]>([
  ["DUPLICATE_ID", (d) => d.entities.push(structuredClone(d.entities[0]))],
  ["DUPLICATE_SLUG", (d) => (d.entities[1].slug = d.entities[0].slug)],
  [
    "MISSING_REFERENCE",
    (d) => {
      const p = find(d, "r1").payload;
      if (p.type === "relation") p.to.id = "missing";
    },
  ],
  [
    "INVALID_RELATION",
    (d) => {
      const p = find(d, "r1").payload;
      if (p.type === "relation") p.relationKind = "participation";
    },
  ],
  ["NON_PUBLIC_REFERENCE", (d) => (find(d, "b1").status = "draft")],
  ["NON_PUBLIC_REFERENCE", (d) => (find(d, "b1").status = "withdrawn")],
  ["STALE_REVIEW", (d) => (d.entities[0].revision = 2)],
  ["INVALID_EVIDENCE", (d) => (d.statements[0].evidenceRefs = [])],
  [
    "INVALID_EVIDENCE",
    (d) => {
      const p = find(d, "v1").payload;
      if (p.type === "evidence") p.target.id = "w1";
    },
  ],
  [
    "UNPROVEN_INSPIRATION",
    (d) => {
      const p = find(d, "r1").payload;
      if (p.type === "relation") p.relationKind = "inspiration";
    },
  ],
  [
    "INVALID_DATE",
    (d) => {
      const p = find(d, "e1").payload;
      if (p.type === "event") p.end = -1;
    },
  ],
  [
    "INVALID_COORDINATES",
    (d) => {
      const p = find(d, "l1").payload;
      if (p.type === "place") p.coordinates!.lat = 91;
    },
  ],
  [
    "INVALID_COORDINATES",
    (d) => {
      const p = find(d, "l1").payload;
      if (p.type === "place") {
        p.space = "fiction";
        p.worldId = "world";
      }
    },
  ],
  ["INVALID_SPOILER_WORK", (d) => (d.statements[0].spoilerWorkIds = ["p1"])],
  [
    "UNREVIEWED_ASSET",
    (d) =>
      (d.statements[0].quote = {
        speaker: "人",
        locator: "1",
        original: "引用",
        translated: false,
        assetId: "missing",
      }),
  ],
  [
    "INVALID_ASSET_PATH",
    (d) =>
      d.entities.push(
        entity(
          "a1",
          {
            type: "asset",
            path: "../secret",
            creator: "人",
            origin: "自作",
            terms: "確認済",
            checkedOn: "2026-09-23",
            checkedBy: "テスト",
            attribution: "テスト",
            modified: false,
            alt: { text: "テスト", spoilerWorkIds: [] },
          },
          "素材",
        ),
      ),
  ],
])("reports %s", (code, mutate) => {
  const d = makeDataset();
  mutate(d);
  expect(validateDataset(d).map((x) => x.code)).toContain(code);
});
