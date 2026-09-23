import { createHash } from "node:crypto";
import { validateDataset, refKey } from "./validate";
import { renderMarkdown } from "./markdown";
import type {
  Dataset,
  Entity,
  Statement,
  Publication,
  PublishedGraph,
  PublicEntity,
  PublicPayload,
} from "./types";
const hash = (text: string) =>
  createHash("sha256").update(text).digest("hex").slice(0, 24);
export function assetUrl(item: Entity) {
  if (item.payload.type !== "asset") throw Error("ASSET_REQUIRED");
  const ext = item.payload.path.split(".").pop();
  return `/assets/${hash(item.id + ":" + item.revision)}.${ext}`;
}
function publicPayload(e: Entity): PublicPayload {
  const p = e.payload;
  switch (p.type) {
    case "work":
      return {
        type: p.type,
        jaTitle: p.jaTitle,
        originalTitle: p.originalTitle,
        releaseYear: p.releaseYear,
      };
    case "background":
      return { type: p.type, category: p.category };
    case "person":
      return { type: p.type, name: p.name, disambiguation: p.disambiguation };
    case "place":
      return {
        type: p.type,
        space: p.space,
        worldId: p.worldId,
        coordinates: p.coordinates,
        period: p.period,
        precision: p.precision,
        evidenceRefs: p.evidenceRefs,
      };
    case "event":
      return {
        type: p.type,
        domain: p.domain,
        worldId: p.worldId,
        start: p.start,
        end: p.end,
        dateLabel: p.dateLabel,
        certainty: p.certainty,
        evidenceRefs: p.evidenceRefs,
      };
    case "relation":
      return {
        type: p.type,
        from: p.from,
        to: p.to,
        relationKind: p.relationKind,
        reasonStatementIds: p.reasonStatementIds,
        evidenceRefs: p.evidenceRefs,
      };
    case "source":
      return {
        type: p.type,
        author: p.author,
        url: p.url,
        bibliography: p.bibliography,
        accessedOn: p.accessedOn,
      };
    case "evidence":
      return {
        type: p.type,
        sourceId: p.sourceId,
        target: p.target,
        locator: p.locator,
        support: p.support,
      };
    case "asset":
      return {
        type: p.type,
        publicUrl: assetUrl(e),
        creator: p.creator,
        origin: p.origin,
        terms: p.terms,
        checkedOn: p.checkedOn,
        attribution: p.attribution,
        modified: p.modified,
        alt: p.alt,
      };
  }
}
export function publish(data: Dataset): Publication {
  const issues = validateDataset(data);
  if (issues.length) throw Error(JSON.stringify(issues));
  const entities = data.entities.filter((x) => x.status === "published"),
    statements = data.statements.filter((x) => x.status === "published");
  const items = new Map<string, Entity | Statement>([
    ...entities.map((x) => [refKey(x), x] as const),
    ...statements.map((x) => [`content-statement:${x.id}`, x] as const),
  ]);
  const requirements = new Map(
    [...items].map(([key, item]) => [key, new Set(item.spoilerWorkIds)]),
  );
  function dependencies(item: Entity | Statement): string[] {
    if (!("payload" in item))
      return [
        refKey(item.owner),
        ...item.evidenceRefs.map((id) => `evidence:${id}`),
        ...(item.quote ? [`asset:${item.quote.assetId}`] : []),
      ];
    const p = item.payload;
    if (p.type === "relation")
      return [
        refKey(p.from),
        refKey(p.to),
        ...p.evidenceRefs.map((id) => `evidence:${id}`),
        ...p.reasonStatementIds.map((id) => `content-statement:${id}`),
      ];
    if (p.type === "evidence")
      return [`source:${p.sourceId}`, refKey(p.target)];
    if (p.type === "event" || p.type === "place")
      return p.evidenceRefs.map((id) => `evidence:${id}`);
    return [];
  }
  // Dependency cycles converge because permissions only grow over a finite set.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [key, item] of items) {
      const set = requirements.get(key)!;
      for (const dep of dependencies(item)) {
        const target = items.get(dep);
        const inherited = [
          ...(requirements.get(dep) ?? []),
          ...(target && "title" in target ? target.title.spoilerWorkIds : []),
        ];
        for (const id of inherited)
          if (!set.has(id)) {
            set.add(id);
            changed = true;
          }
      }
      if ("payload" in item && item.payload.type === "asset")
        for (const id of item.payload.alt.spoilerWorkIds)
          if (!set.has(id)) {
            set.add(id);
            changed = true;
          }
    }
  }
  const base: PublishedGraph = { entities: [], statements: [] },
    groups = new Map<string, { requires: string[]; graph: PublishedGraph }>();
  function graphFor(required: string[]) {
    if (!required.length) return base;
    const key = JSON.stringify(required);
    if (!groups.has(key))
      groups.set(key, {
        requires: required,
        graph: { entities: [], statements: [] },
      });
    return groups.get(key)!.graph;
  }
  for (const e of entities) {
    const required = [...requirements.get(refKey(e))!].sort();
    const titleRequirements = [
      ...new Set([...required, ...e.title.spoilerWorkIds]),
    ].sort();
    const record: PublicEntity = {
      id: e.id,
      kind: e.kind,
      slug: e.slug,
      safeTitle: e.safeTitle,
      safeSummary: e.safeSummary,
      title: {
        text: e.title.spoilerWorkIds.length ? e.safeTitle : e.title.text,
        spoilerWorkIds: [],
      },
      spoilerWorkIds: required,
      payload: publicPayload(e),
    };
    graphFor(required).entities.push(record);
    if (e.title.spoilerWorkIds.length)
      graphFor(titleRequirements).entities.push({
        ...record,
        title: e.title,
        spoilerWorkIds: titleRequirements,
      });
  }
  for (const s of statements) {
    const required = [...requirements.get(`content-statement:${s.id}`)!].sort();
    graphFor(required).statements.push({
      id: s.id,
      owner: s.owner,
      kind: s.kind,
      section: s.section,
      workIds: s.workIds,
      evidenceRefs: s.evidenceRefs,
      spoilerWorkIds: required,
      html: renderMarkdown(s.markdown),
      quote: s.quote,
    });
  }
  return {
    base,
    groups: [...groups]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ token: hash(key), ...value })),
  };
}
