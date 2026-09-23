import { z } from "zod";
const text = z.string().trim().min(1);
const id = z.string().regex(/^[A-Za-z0-9_-]+$/);
const date = z.iso.date();
export const kindSchema = z.enum([
  "work",
  "background",
  "person",
  "place",
  "event",
  "relation",
  "source",
  "evidence",
  "asset",
]);
export const refSchema = z.strictObject({ kind: kindSchema, id });
const ids = z.array(id);
export const guardedSchema = z.strictObject({ text, spoilerWorkIds: ids });
const base = {
  id,
  revision: z.number().int().positive(),
  status: z.enum(["draft", "reviewed", "published", "withdrawn"]),
  review: z
    .strictObject({ by: text, date, revision: z.number().int().positive() })
    .nullable(),
  spoilerWorkIds: ids,
};
const payloads = [
  z.strictObject({
    type: z.literal("work"),
    jaTitle: text,
    originalTitle: text,
    releaseYear: z.number().int(),
  }),
  z.strictObject({
    type: z.literal("background"),
    category: z.enum([
      "history",
      "culture",
      "production",
      "acting",
      "interpretation",
    ]),
  }),
  z.strictObject({
    type: z.literal("person"),
    name: text,
    disambiguation: z.string(),
  }),
  z.strictObject({
    type: z.literal("place"),
    space: z.enum(["earth", "fiction"]),
    worldId: id.nullable(),
    coordinates: z
      .strictObject({ lat: z.number(), lon: z.number() })
      .nullable(),
    period: text,
    precision: z.enum(["exact", "approximate", "unknown"]),
    evidenceRefs: ids,
  }),
  z.strictObject({
    type: z.literal("event"),
    domain: z.enum(["history", "story", "release"]),
    worldId: id.nullable(),
    start: z.number().int().nullable(),
    end: z.number().int().nullable(),
    dateLabel: text,
    certainty: z.enum(["exact", "approximate", "range", "unknown"]),
    evidenceRefs: ids,
  }),
  z.strictObject({
    type: z.literal("relation"),
    from: refSchema,
    to: refSchema,
    relationKind: z.enum([
      "inspiration",
      "adaptation",
      "shared-background",
      "comparison",
      "participation",
      "context",
      "location",
      "chronology",
    ]),
    reasonStatementIds: ids,
    evidenceRefs: ids,
  }),
  z
    .strictObject({
      type: z.literal("source"),
      author: text,
      url: z.url({ protocol: /^https?$/ }).nullable(),
      bibliography: text.nullable(),
      accessedOn: date,
    })
    .refine((x) => x.url !== null || x.bibliography !== null),
  z.strictObject({
    type: z.literal("evidence"),
    sourceId: id,
    target: z.union([
      refSchema,
      z.strictObject({ kind: z.literal("content-statement"), id }),
    ]),
    locator: text,
    verificationNote: text,
    support: z.enum([
      "explicit-statement",
      "correspondence",
      "comparison",
      "fact",
    ]),
  }),
  z.strictObject({
    type: z.literal("asset"),
    path: text,
    creator: text,
    origin: text,
    terms: text,
    checkedOn: date,
    checkedBy: text,
    attribution: text,
    modified: z.boolean(),
    alt: guardedSchema,
  }),
] as const;
export const payloadSchema = z.discriminatedUnion("type", payloads);
export const entitySchema = z
  .strictObject({
    ...base,
    kind: kindSchema,
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .nullable(),
    safeTitle: text,
    safeSummary: text,
    title: guardedSchema,
    payload: payloadSchema,
  })
  .refine((x) => x.kind === x.payload.type, {
    message: "kind and payload.type must match",
  })
  .refine(
    (x) =>
      !["work", "background", "person"].includes(x.kind) || x.slug !== null,
    { message: "page slug required" },
  );
export const statementSchema = z.strictObject({
  ...base,
  owner: refSchema,
  kind: z.enum(["history", "depiction", "statement", "interpretation"]),
  section: z.enum([
    "summary",
    "background",
    "connection",
    "production",
    "acting",
    "interpretation",
  ]),
  workIds: ids,
  evidenceRefs: ids,
  markdown: text,
  quote: z
    .strictObject({
      speaker: text,
      locator: text,
      original: text,
      translated: z.boolean(),
      assetId: id,
    })
    .nullable(),
});
export function parseEntity(value: unknown) {
  return entitySchema.parse(value);
}
export function parseStatement(frontmatter: unknown, markdown: string) {
  if (typeof frontmatter !== "object" || frontmatter === null)
    throw Error("frontmatter required");
  return statementSchema.parse({ ...frontmatter, markdown });
}
