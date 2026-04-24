import { describe, expect, it } from "vitest";
import {
  buildTemplateValidator,
  compileTemplate,
  TEMPLATE_SCHEMAS,
} from "./proposal-template-schemas";

describe("compileTemplate", () => {
  it("emits H2 heading + body for a populated textarea field", () => {
    const md = compileTemplate("athlete-sponsorship", {
      profile: "Shredder from São Paulo. Skate + surf.",
    });
    expect(md).toContain("## Athlete Profile\n\nShredder from São Paulo. Skate + surf.\n");
  });

  it("omits sections whose values are empty", () => {
    const md = compileTemplate("athlete-sponsorship", {
      profile: "Rider X",
      "content-plan": "",
    });
    expect(md).toContain("## Athlete Profile");
    expect(md).not.toContain("## Sport & Content Plan");
  });

  it("omits sections with undefined values", () => {
    const md = compileTemplate("athlete-sponsorship", { profile: "Rider X" });
    expect(md).not.toContain("## Sport & Content Plan");
  });

  it("emits budget rows + per-currency totals", () => {
    const md = compileTemplate("athlete-sponsorship", {
      budget: [
        { label: "Sponsorship fee", amount: 2, currency: "ETH" },
        { label: "Gear", amount: 0.3, currency: "ETH" },
        { label: "Travel", amount: 500, currency: "USDC" },
      ],
    });
    expect(md).toContain("## Budget Breakdown");
    expect(md).toContain("- Sponsorship fee — 2 ETH");
    expect(md).toContain("- Gear — 0.3 ETH");
    expect(md).toContain("- Travel — 500 USDC");
    expect(md).toContain("**Totals:** 2.3 ETH · 500 USDC");
  });

  it("omits budget section when array is empty", () => {
    const md = compileTemplate("athlete-sponsorship", { budget: [] });
    expect(md).not.toContain("## Budget Breakdown");
  });

  it("skips invalid budget rows (no label or non-positive amount)", () => {
    const md = compileTemplate("athlete-sponsorship", {
      budget: [
        { label: "", amount: 1, currency: "ETH" },
        { label: "Valid", amount: 1, currency: "ETH" },
        { label: "Zero", amount: 0, currency: "USDC" },
      ],
    });
    expect(md).toContain("- Valid — 1 ETH");
    expect(md).not.toContain("— 0 USDC");
    expect(md).toContain("**Totals:** 1 ETH");
    expect(md).not.toContain("USDC");
  });

  it("returns empty string for unknown slug", () => {
    expect(compileTemplate("does-not-exist", { foo: "bar" })).toBe("");
  });

  it("preserves field order per schema", () => {
    const md = compileTemplate("athlete-sponsorship", {
      timeline: "Q2 2026",
      profile: "Rider Y",
    });
    const profileIdx = md.indexOf("## Athlete Profile");
    const timelineIdx = md.indexOf("## Timeline & Milestones");
    expect(profileIdx).toBeGreaterThan(-1);
    expect(timelineIdx).toBeGreaterThan(profileIdx);
  });
});

describe("TEMPLATE_SCHEMAS", () => {
  it("covers all 6 templates", () => {
    expect(Object.keys(TEMPLATE_SCHEMAS).sort()).toEqual([
      "athlete-sponsorship",
      "content-media",
      "development",
      "droposal",
      "event-activation",
      "physical-installation",
    ]);
  });

  it("funding templates have a budget field (droposal uses revenue split instead)", () => {
    const withBudget = [
      "athlete-sponsorship",
      "event-activation",
      "physical-installation",
      "content-media",
      "development",
    ] as const;
    for (const slug of withBudget) {
      const schema = TEMPLATE_SCHEMAS[slug];
      expect(schema.fields.some((f) => f.type === "budget")).toBe(true);
    }
    expect(TEMPLATE_SCHEMAS["droposal"].fields.some((f) => f.type === "budget")).toBe(false);
  });
});

describe("buildTemplateValidator", () => {
  it("rejects missing required textarea", () => {
    const schema = buildTemplateValidator("athlete-sponsorship");
    const res = schema.safeParse({
      budget: [{ label: "x", amount: 1, currency: "ETH" }],
      timeline: "Q2",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path[0] === "profile")).toBe(true);
    }
  });

  it("rejects empty required textarea (whitespace only)", () => {
    const schema = buildTemplateValidator("athlete-sponsorship");
    const res = schema.safeParse({
      profile: "   ",
      timeline: "Q2",
      budget: [{ label: "x", amount: 1, currency: "ETH" }],
    });
    expect(res.success).toBe(false);
  });

  it("rejects empty required budget array", () => {
    const schema = buildTemplateValidator("athlete-sponsorship");
    const res = schema.safeParse({ profile: "Rider", timeline: "Q2", budget: [] });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path[0] === "budget")).toBe(true);
    }
  });

  it("rejects budget row with non-positive amount", () => {
    const schema = buildTemplateValidator("athlete-sponsorship");
    const res = schema.safeParse({
      profile: "Rider",
      timeline: "Q2",
      budget: [{ label: "x", amount: 0, currency: "ETH" }],
    });
    expect(res.success).toBe(false);
  });

  it("accepts fully valid minimum payload", () => {
    const schema = buildTemplateValidator("athlete-sponsorship");
    const res = schema.safeParse({
      profile: "Rider",
      timeline: "Q2 2026",
      budget: [{ label: "Fee", amount: 1, currency: "ETH" }],
    });
    expect(res.success).toBe(true);
  });

  it("allows optional fields to be absent", () => {
    const schema = buildTemplateValidator("athlete-sponsorship");
    const res = schema.safeParse({
      profile: "Rider",
      timeline: "Q2 2026",
      budget: [{ label: "Fee", amount: 1, currency: "ETH" }],
    });
    expect(res.success).toBe(true);
  });

  it("returns permissive schema for unknown slug", () => {
    const schema = buildTemplateValidator("does-not-exist");
    expect(schema.safeParse({}).success).toBe(true);
  });
});
