import type { PublicEntity } from "../content/types";
export type PageView = {
  title: string;
  summary: string;
  pageKind: string;
  blocks: {
    id: string;
    kind: string;
    section: string;
    html: string;
    evidenceIds: string[];
    workLabels: string[];
    quote: string | null;
  }[];
  references: {
    id: string;
    title: string;
    author: string;
    locator: string;
    url: string | null;
    bibliography: string | null;
    accessedOn: string;
  }[];
  links: {
    label: string;
    href: string;
    kind: string;
    reason: string;
    evidenceIds: string[];
    targetKind: string;
  }[];
  places: PublicEntity[];
  events: PublicEntity[];
  contextLinks: Record<string, { label: string; href: string }[]>;
  readingMinutes: number;
};
