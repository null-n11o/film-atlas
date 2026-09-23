import type { PublicEntity } from "../content/types";
export function orderEvents(
  events: PublicEntity[],
): { key: string; items: PublicEntity[] }[] {
  const groups = new Map<string, PublicEntity[]>();
  for (const event of events) {
    const p = event.payload;
    if (p.type !== "event") continue;
    const key = `${p.domain}:${p.worldId ?? "earth"}${p.start === null ? ":unknown" : ""}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      key,
      items: items.sort((a, b) => {
        if (a.payload.type !== "event" || b.payload.type !== "event") return 0;
        return (
          (a.payload.start ?? Infinity) - (b.payload.start ?? Infinity) ||
          (a.payload.end ?? Infinity) - (b.payload.end ?? Infinity) ||
          a.id.localeCompare(b.id)
        );
      }),
    }));
}
