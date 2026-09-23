import { z } from "zod";
const verified = z.strictObject({
  value: z.string().min(1),
  verifiedOn: z.iso.date(),
});
export const siteSchema = z.strictObject({
  publicName: verified.nullable(),
  note: verified.extend({ value: z.url({ protocol: /^https$/ }) }).nullable(),
  contact: verified
    .extend({ value: z.url({ protocol: /^(https|mailto)$/ }) })
    .nullable(),
  url: z.url({ protocol: /^https$/ }).nullable(),
});
export const site = siteSchema.parse({
  publicName: null,
  note: null,
  contact: null,
  url: null,
});
