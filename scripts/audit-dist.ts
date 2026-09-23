import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { Issue } from "../src/lib/content/types";
export async function auditDist(
  dir: string,
  mode: "production" | "e2e",
): Promise<Issue[]> {
  const issues: Issue[] = [],
    files = new Map<string, string>();
  async function scan(folder: string) {
    for (const file of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, file.name);
      if (file.isDirectory()) {
        await scan(path);
        continue;
      }
      const name = relative(dir, path).split("\\").join("/");
      files.set(
        name,
        /\.(html|json|js|xml)$/.test(name) ? await readFile(path, "utf8") : "",
      );
    }
  }
  await scan(dir);
  for (const [name, text] of files) {
    for (const sentinel of [
      "PRIVATE_REVIEW_NOTE",
      ...(mode === "production" ? ["TEST_ONLY"] : []),
    ])
      if (text.includes(sentinel))
        issues.push({ code: "PRIVATE_CONTENT", ref: name, message: sentinel });
    if (!name.endsWith(".html")) continue;
    if (/SPOILER_(SENTINEL|SOURCE|PLACE|EVENT|RELATED|TITLE)/.test(text))
      issues.push({
        code: "SPOILER_LEAK",
        ref: name,
        message: "initial HTML or data",
      });
    for (const match of text.matchAll(/\b(?:href|src)="([^\"]+)"/g)) {
      const target = match[1].replace(/&amp;/g, "&");
      if (/^(?:https?:|mailto:|data:|\/\/)/.test(target)) continue;
      const url = new URL(target, `https://atlas.invalid/${name}`);
      const pathname = decodeURIComponent(url.pathname).slice(1);
      const file =
        !pathname || pathname.endsWith("/")
          ? `${pathname}index.html`
          : pathname;
      const resolved = files.has(file)
        ? file
        : files.has(`${file}/index.html`)
          ? `${file}/index.html`
          : null;
      if (!resolved) {
        issues.push({
          code: "BROKEN_INTERNAL_LINK",
          ref: name,
          message: target,
        });
        continue;
      }
      if (url.hash && resolved.endsWith(".html")) {
        const id = decodeURIComponent(url.hash.slice(1));
        if (!files.get(resolved)!.includes(`id="${id}"`))
          issues.push({
            code: "BROKEN_INTERNAL_LINK",
            ref: name,
            message: target,
          });
      }
    }
  }
  return issues;
}
