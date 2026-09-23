import type { PublishedGraph } from "../content/types";
import { key } from "../view/project";
import { canView } from "./policy";
export function mergeVisibleGraph(
  base: PublishedGraph,
  groups: { token: string; requires: string[] }[],
  cached: ReadonlyMap<string, PublishedGraph>,
  allowed: ReadonlySet<string>,
): PublishedGraph {
  const entities = new Map(base.entities.map((e) => [key(e), e]));
  const statements = new Map(base.statements.map((s) => [s.id, s]));
  // Title variants extend record requirements. Apply the narrowest last,
  // regardless of token, lexical ordering, or fetch completion order.
  for (const group of [...groups].sort(
    (a, b) => a.requires.length - b.requires.length,
  )) {
    if (!canView(group.requires, allowed)) continue;
    const graph = cached.get(group.token);
    if (!graph) continue;
    for (const e of graph.entities)
      if (canView(e.spoilerWorkIds, allowed)) entities.set(key(e), e);
    for (const s of graph.statements)
      if (canView(s.spoilerWorkIds, allowed)) statements.set(s.id, s);
  }
  return {
    entities: [...entities.values()],
    statements: [...statements.values()],
  };
}
