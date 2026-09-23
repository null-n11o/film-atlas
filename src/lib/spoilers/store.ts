export const STORAGE_KEY = "film-atlas:spoilers:v1";
export function readAllowed(storage: Pick<Storage, "getItem">): Set<string> {
  try {
    const value: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null");
    if (
      !value ||
      typeof value !== "object" ||
      !("version" in value) ||
      value.version !== 1 ||
      !("workIds" in value) ||
      !Array.isArray(value.workIds) ||
      !value.workIds.every(
        (x) => typeof x === "string" && /^[A-Za-z0-9_-]+$/.test(x),
      )
    )
      return new Set();
    return new Set(value.workIds);
  } catch {
    return new Set();
  }
}
export function writeAllowed(
  storage: Pick<Storage, "setItem">,
  allowed: ReadonlySet<string>,
): boolean {
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, workIds: [...allowed] }),
    );
    return true;
  } catch {
    return false;
  }
}
