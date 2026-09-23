import type { PageRef, PublishedGraph } from "../content/types";
import { projectPage } from "../view/project";
import { renderPageBody } from "../view/render";
import { canView } from "./policy";
import { readAllowed, writeAllowed } from "./store";
import { parseGroup } from "./response";
import { mergeVisibleGraph } from "./merge";
export function mountSpoilers(
  root: HTMLElement,
  page: PageRef,
  base: PublishedGraph,
  groups: { token: string; requires: string[] }[],
): () => void {
  const heading = root.querySelector<HTMLElement>("[data-page-title]")!;
  const safeTitle = heading.textContent!;
  let persistenceFailed = false;
  const content = root.querySelector<HTMLElement>("#page-content")!;
  const buttons = [
    ...root.querySelectorAll<HTMLButtonElement>("button[data-work]"),
  ];
  const status = root.querySelector<HTMLElement>("[data-spoiler-status]")!;
  const retry = root.querySelector<HTMLButtonElement>("[data-retry]")!;
  const storageNote = root.querySelector<HTMLElement>("[data-storage-note]")!;
  let allowed = new Set<string>(),
    generation = 0,
    disposed = false;
  const cached = new Map<string, PublishedGraph>();
  function restore() {
    try {
      allowed = persistenceFailed
        ? new Set()
        : readAllowed(window.sessionStorage);
      if (!writeAllowed(window.sessionStorage, allowed)) {
        allowed = new Set();
        persistenceFailed = true;
        storageNote.hidden = false;
      }
    } catch {
      allowed = new Set();
    }
  }
  function persist() {
    let saved = false;
    try {
      saved = writeAllowed(window.sessionStorage, allowed);
    } catch {}
    persistenceFailed = !saved;
    storageNote.hidden = saved;
  }
  function render(graph: PublishedGraph) {
    const view = projectPage(graph, page, allowed);
    heading.textContent = graph.entities.some(
      (e) =>
        e.id === page.id &&
        e.kind === page.kind &&
        canView(e.spoilerWorkIds, allowed),
    )
      ? view.title
      : safeTitle;
    content.innerHTML = renderPageBody(view);
    for (const button of buttons) {
      const active = allowed.has(button.dataset.work!);
      const action = `ネタバレを${active ? "隠す" : "表示"}`;
      button.setAttribute("aria-label", `${button.dataset.label}の${action}`);
      if (button.dataset.label === "この作品")
        button.textContent = `この作品の${action}`;
      else {
        const name = document.createElement("span"),
          verb = document.createElement("span");
        name.textContent = button.dataset.label!;
        verb.textContent = action;
        name.className = "button-work";
        verb.className = "button-action";
        button.replaceChildren(name, verb);
      }
      button.setAttribute("aria-pressed", String(active));
    }
  }
  function merge() {
    return mergeVisibleGraph(base, groups, cached, allowed);
  }
  async function update() {
    const current = ++generation;
    render(merge());
    retry.hidden = true;
    status.textContent = "";
    const needed = groups.filter(
      (g) => canView(g.requires, allowed) && !cached.has(g.token),
    );
    if (!needed.length) return;
    status.textContent = "許可した内容を読み込んでいます。";
    try {
      const results = await Promise.all(
        needed.map(async (group) => {
          const response = await fetch(`/_content/${group.token}.json`);
          if (!response.ok) throw Error("CONTENT_FETCH_FAILED");
          return parseGroup(await response.json(), group);
        }),
      );
      if (disposed || current !== generation) return;
      for (const group of results)
        if (canView(group.requires, allowed))
          cached.set(group.token, group.graph);
      render(merge());
      status.textContent = "許可した内容を表示しました。";
    } catch {
      if (disposed || current !== generation) return;
      render(base);
      status.textContent =
        "追加の内容を読み込めませんでした。安全な内容を表示しています。";
      retry.hidden = false;
    }
  }
  function click(event: Event) {
    const button = event.currentTarget as HTMLButtonElement;
    const id = button.dataset.work!;
    if (allowed.has(id)) {
      allowed.delete(id);
      if (content.contains(document.activeElement)) button.focus();
    } else allowed.add(id);
    persist();
    void update();
  }
  function again() {
    void update();
  }
  function hide() {
    generation++;
    allowed = new Set();
    cached.clear();
    render(base);
    status.textContent = "";
    retry.hidden = true;
  }
  function show() {
    restore();
    void update();
  }
  for (const b of buttons) {
    b.disabled = false;
    b.addEventListener("click", click);
  }
  retry.addEventListener("click", again);
  window.addEventListener("pagehide", hide);
  window.addEventListener("pageshow", show);
  show();
  return () => {
    disposed = true;
    hide();
    for (const b of buttons) b.removeEventListener("click", click);
    retry.removeEventListener("click", again);
    window.removeEventListener("pagehide", hide);
    window.removeEventListener("pageshow", show);
  };
}
