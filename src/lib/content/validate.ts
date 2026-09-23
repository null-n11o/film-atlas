import { entitySchema, statementSchema } from "./schema";
import type { Base, Dataset, Entity, Issue, Ref } from "./types";
export const refKey = (ref: { kind: string; id: string }) =>
  `${ref.kind}:${ref.id}`;
const reviewed = (x: Base) =>
  x.review !== null && x.review.revision === x.revision;
export function validateDataset(data: Dataset): Issue[] {
  const issues: Issue[] = [];
  const add = (code: string, ref: string, message = code) =>
    issues.push({ code, ref, message });
  const entities = new Map(data.entities.map((x) => [refKey(x), x]));
  const statements = new Map(data.statements.map((x) => [x.id, x]));
  const keys = new Set<string>(),
    slugs = new Set<string>();
  function reference(
    owner: Base,
    key: string,
    ref: Ref | { kind: "content-statement"; id: string },
  ) {
    const target =
      ref.kind === "content-statement"
        ? statements.get(ref.id)
        : entities.get(refKey(ref));
    if (!target) add("MISSING_REFERENCE", key, refKey(ref));
    else if (owner.status === "published" && target.status !== "published")
      add("NON_PUBLIC_REFERENCE", key, refKey(ref));
    return target;
  }
  function evidence(owner: Base, key: string, ids: string[]) {
    if (!ids.length) add("INVALID_EVIDENCE", key);
    for (const id of ids) {
      const e = reference(owner, key, { kind: "evidence", id }) as
        | Entity
        | undefined;
      if (e?.payload.type !== "evidence" || refKey(e.payload.target) !== key)
        add("INVALID_EVIDENCE", key, id);
    }
  }
  for (const item of [...data.entities, ...data.statements]) {
    const isEntity = "payload" in item,
      key = isEntity ? refKey(item) : `content-statement:${item.id}`;
    const parsed = isEntity
      ? entitySchema.safeParse(item)
      : statementSchema.safeParse(item);
    if (!parsed.success) add("INVALID_FORMAT", key, parsed.error.message);
    if (keys.has(key)) add("DUPLICATE_ID", key);
    keys.add(key);
    if (
      (item.status === "published" || item.status === "reviewed") &&
      !reviewed(item)
    )
      add("STALE_REVIEW", key);
    const guards = [
      ...item.spoilerWorkIds,
      ...(isEntity ? item.title.spoilerWorkIds : []),
    ];
    if (isEntity && item.payload.type === "asset")
      guards.push(...item.payload.alt.spoilerWorkIds);
    for (const id of guards) {
      if (!entities.has(`work:${id}`)) add("INVALID_SPOILER_WORK", key, id);
      else reference(item, key, { kind: "work", id });
    }
    if (!isEntity) {
      reference(item, key, item.owner);
      for (const id of item.workIds) reference(item, key, { kind: "work", id });
      evidence(item, key, item.evidenceRefs);
      if (item.quote) {
        const a = reference(item, key, {
          kind: "asset",
          id: item.quote.assetId,
        }) as Entity | undefined;
        if (!a || !reviewed(a)) add("UNREVIEWED_ASSET", key);
      }
      continue;
    }
    if (item.slug !== null) {
      const slug = `${item.kind}:${item.slug}`;
      if (slugs.has(slug)) add("DUPLICATE_SLUG", key);
      slugs.add(slug);
    }
    const p = item.payload;
    switch (p.type) {
      case "evidence":
        reference(item, key, { kind: "source", id: p.sourceId });
        reference(item, key, p.target);
        break;
      case "place":
        evidence(item, key, p.evidenceRefs);
        if (
          (p.space === "fiction" && (p.coordinates !== null || !p.worldId)) ||
          (p.space === "earth" && p.worldId !== null) ||
          (p.coordinates &&
            (Math.abs(p.coordinates.lat) > 90 ||
              Math.abs(p.coordinates.lon) > 180))
        )
          add("INVALID_COORDINATES", key);
        break;
      case "event":
        evidence(item, key, p.evidenceRefs);
        if (
          (p.start !== null && p.end !== null && p.start > p.end) ||
          (p.start === null && p.end !== null) ||
          (p.domain !== "story" && p.worldId !== null)
        )
          add("INVALID_DATE", key);
        break;
      case "asset":
        if (!reviewed(item) || !p.checkedBy || !p.checkedOn || !p.terms)
          add("UNREVIEWED_ASSET", key);
        if (
          !/^content\/assets\/[A-Za-z0-9_./-]+$/.test(p.path) ||
          p.path.split("/").some((x) => x === ".." || x === ".")
        )
          add("INVALID_ASSET_PATH", key);
        break;
      case "relation": {
        reference(item, key, p.from);
        reference(item, key, p.to);
        const pair = `${p.from.kind}:${p.to.kind}`;
        const allowed: Record<typeof p.relationKind, string[]> = {
          context: ["work:background", "background:person"],
          location: ["background:place"],
          chronology: ["background:event"],
          participation: ["person:work"],
          inspiration: ["work:work", "work:person", "work:background"],
          adaptation: ["work:work", "work:person", "work:background"],
          "shared-background": ["work:work"],
          comparison: ["work:work"],
        };
        if (!allowed[p.relationKind].includes(pair))
          add("INVALID_RELATION", key);
        if (!p.reasonStatementIds.length) add("INVALID_EVIDENCE", key);
        for (const id of p.reasonStatementIds) {
          const s = reference(item, key, { kind: "content-statement", id });
          if (s && "owner" in s && refKey(s.owner) !== key)
            add("INVALID_EVIDENCE", key);
        }
        evidence(item, key, p.evidenceRefs);
        if (
          p.relationKind === "inspiration" &&
          !p.evidenceRefs.some((id) => {
            const e = entities.get(`evidence:${id}`);
            return (
              e?.payload.type === "evidence" &&
              e.payload.support === "explicit-statement"
            );
          })
        )
          add("UNPROVEN_INSPIRATION", key);
        break;
      }
    }
  }
  return issues;
}
