import { z } from "zod";

/**
 * The brief payload, specification §6.8 and FR-15/FR-17.
 *
 * One schema, validated in both places. The client uses it to decide whether a
 * step may advance; the route handler uses it because a client-side check is a
 * convenience, not a control — anything can POST to the endpoint. Sharing the
 * definition is what stops the two drifting apart, which is the usual way a form
 * ends up accepting something the server rejects.
 *
 * FR-16's attachment is deliberately absent. It was built as far as validating
 * the file and sending its *name*, while the form told the visitor the file was
 * "attached on send" — so the one thing the feature claimed was the one thing it
 * did not do. Finishing it needs a signed upload target and an account to own
 * it; the honest alternative was to remove it, which is what happened. See the
 * revision note under FR-16 in docs/01-PRD.md.
 */

export const SERVICE_LINES = [
  "Sonic mnemonic",
  "Product and UI sound",
  "Brand voice direction",
  "Soundscape architecture",
  "Sonic identity guidelines",
  "Measurement and guardianship",
] as const;

export const BUDGET_BANDS = [
  { value: "<50", label: "Under £50k" },
  { value: "50-110", label: "£50k – £110k" },
  { value: "110-220", label: "£110k – £220k" },
  { value: "220+", label: "£220k+" },
  { value: "tbd", label: "Not yet defined" },
] as const;

export type BudgetBand = (typeof BUDGET_BANDS)[number]["value"];

/** Qualified, per the north-star metric: a stated budget of £50k+. */
export const QUALIFIED_BANDS: readonly BudgetBand[] = [
  "50-110",
  "110-220",
  "220+",
];

/** Step 1 — who. */
export const whoSchema = z.object({
  name: z.string().trim().min(2, "Please give us a name").max(80),
  company: z.string().trim().min(2, "Which company?").max(120),
  role: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.email("That does not look like an email address").max(160),
});

/** Step 2 — what. */
export const whatSchema = z.object({
  services: z
    .array(z.enum(SERVICE_LINES))
    .min(1, "Pick at least one line of work"),
  moment: z
    .string()
    .trim()
    .min(10, "A sentence is plenty, but we need one")
    .max(280, "280 characters maximum"),
});

/** Step 3 — scale. */
export const scaleSchema = z.object({
  budget: z.enum(
    BUDGET_BANDS.map((band) => band.value) as [BudgetBand, ...BudgetBand[]],
    { message: "Pick a band, or tell us it is undecided" },
  ),
  targetDate: z.string().trim().max(40).optional().or(z.literal("")),
});

export const briefSchema = whoSchema
  .extend(whatSchema.shape)
  .extend(scaleSchema.shape)
  .extend({
    // FR-17. A bot fills every field it finds; a person never sees this one.
    // Named plausibly on purpose — `honeypot` is a giveaway to anything that
    // reads attribute names.
    fax: z.string().max(0, "Rejected").optional().or(z.literal("")),
    turnstileToken: z.string().optional().or(z.literal("")),
  });

export type BriefPayload = z.infer<typeof briefSchema>;

/** The steps, in order, with the schema that gates leaving each one. */
export const STEPS = [
  { id: "who", title: "Who", schema: whoSchema },
  { id: "what", title: "What", schema: whatSchema },
  { id: "scale", title: "Scale", schema: scaleSchema },
  { id: "review", title: "Review", schema: null },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export function isQualified(budget: BudgetBand): boolean {
  return QUALIFIED_BANDS.includes(budget);
}
