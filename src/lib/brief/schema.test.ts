import { describe, expect, it } from "vitest";

import {
  BUDGET_BANDS,
  QUALIFIED_BANDS,
  SERVICE_LINES,
  STEPS,
  briefSchema,
  isQualified,
  scaleSchema,
  whatSchema,
  whoSchema,
} from "./schema";

const VALID = {
  name: "Marguerite Okonjo-Bell",
  company: "Halcyon Mobility",
  role: "VP Brand",
  email: "m.okonjo-bell@example.com",
  services: [SERVICE_LINES[0], SERVICE_LINES[1]],
  moment: "The door close on our second-generation platform.",
  budget: "110-220" as const,
  targetDate: "Q3",
  fax: "",
  turnstileToken: "",
};

describe("step schemas gate their own step", () => {
  it("accepts a complete step 1", () => {
    expect(whoSchema.safeParse(VALID).success).toBe(true);
  });

  it("treats role as genuinely optional", () => {
    expect(whoSchema.safeParse({ ...VALID, role: "" }).success).toBe(true);
  });

  it("rejects a malformed email", () => {
    for (const email of ["nope", "a@", "@b.com", "a b@c.com"]) {
      expect(whoSchema.safeParse({ ...VALID, email }).success).toBe(false);
    }
  });

  it("rejects whitespace-only text as if it were empty", () => {
    // Trim first, or "   " passes a min-length check and reaches the studio.
    expect(whoSchema.safeParse({ ...VALID, name: "   " }).success).toBe(false);
    expect(whoSchema.safeParse({ ...VALID, company: "  " }).success).toBe(false);
  });

  it("requires at least one service line", () => {
    expect(whatSchema.safeParse({ ...VALID, services: [] }).success).toBe(false);
  });

  it("rejects a service line that is not on offer", () => {
    expect(
      whatSchema.safeParse({ ...VALID, services: ["Skywriting"] }).success,
    ).toBe(false);
  });

  it("holds the 280-character limit from §6.8", () => {
    expect(
      whatSchema.safeParse({ ...VALID, moment: "x".repeat(280) }).success,
    ).toBe(true);
    expect(
      whatSchema.safeParse({ ...VALID, moment: "x".repeat(281) }).success,
    ).toBe(false);
  });

  it("requires a budget band, including the undecided one", () => {
    expect(scaleSchema.safeParse({ ...VALID, budget: "tbd" }).success).toBe(true);
    expect(scaleSchema.safeParse({ ...VALID, budget: undefined }).success).toBe(
      false,
    );
    expect(scaleSchema.safeParse({ ...VALID, budget: "loads" }).success).toBe(
      false,
    );
  });
});

describe("the full payload", () => {
  it("accepts a complete brief", () => {
    expect(briefSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects a filled honeypot", () => {
    expect(briefSchema.safeParse({ ...VALID, fax: "bot" }).success).toBe(false);
  });

  it("covers every step with a schema except the review step", () => {
    expect(STEPS).toHaveLength(4);
    expect(STEPS.filter((s) => s.schema !== null)).toHaveLength(3);
    expect(STEPS[STEPS.length - 1].schema).toBeNull();
  });
});

describe("qualification, per the north-star metric", () => {
  it("counts £50k and above as qualified", () => {
    expect(isQualified("50-110")).toBe(true);
    expect(isQualified("110-220")).toBe(true);
    expect(isQualified("220+")).toBe(true);
  });

  it("does not count under-£50k or undecided", () => {
    expect(isQualified("<50")).toBe(false);
    expect(isQualified("tbd")).toBe(false);
  });

  it("only qualifies bands that exist", () => {
    const known = BUDGET_BANDS.map((band) => band.value);
    for (const band of QUALIFIED_BANDS) expect(known).toContain(band);
  });
});

describe("the payload carries no attachment, FR-16 withdrawn", () => {
  it("drops an attachment name rather than accepting one it cannot honour", () => {
    // The regression this guards: the field was validated and its *name* was
    // sent while the form told the visitor the file was "attached on send". If
    // the key reappears in the parsed payload, either the upload was finished —
    // in which case delete this test deliberately — or the claim is back
    // without it.
    const parsed = briefSchema.safeParse({
      ...VALID,
      attachmentName: "deck.pdf",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && "attachmentName" in parsed.data).toBe(false);
  });
});

describe("messages a person can act on", () => {
  it("gives a written message for an empty field, not a type error", () => {
    // An absent field fails zod's type check before reaching the length rule,
    // which surfaces "Invalid input" instead of the message written for it.
    // The form therefore seeds every text field with an empty string.
    const emptyStrings = whoSchema.safeParse({
      name: "",
      company: "",
      role: "",
      email: "",
    });
    expect(emptyStrings.success).toBe(false);

    const messages = emptyStrings.success
      ? {}
      : emptyStrings.error.flatten().fieldErrors;
    expect(messages.name?.[0]).toBe("Please give us a name");
    expect(messages.company?.[0]).toBe("Which company?");
  });

  it("never surfaces a bare type error to a visitor for step 1", () => {
    const result = whoSchema.safeParse({
      name: "",
      company: "",
      role: "",
      email: "",
    });
    const messages = result.success ? {} : result.error.flatten().fieldErrors;
    for (const list of Object.values(messages)) {
      for (const message of list ?? []) {
        expect(message).not.toBe("Invalid input");
      }
    }
  });

  it("explains an over-long moment rather than silently truncating", () => {
    const result = whatSchema.safeParse({
      services: [SERVICE_LINES[0]],
      moment: "x".repeat(300),
    });
    const messages = result.success ? {} : result.error.flatten().fieldErrors;
    expect(messages.moment?.[0]).toContain("280");
  });
});
