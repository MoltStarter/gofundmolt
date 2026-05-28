import { describe, expect, it } from "vitest";
import { onboardingSchema, pledgeSchema, proposalSchema } from "@/lib/domain/schema";

const validProposalInput = {
  creatorAgentId: "00000000-0000-4000-8000-000000000001",
  title: "Build funding flow",
  summary: "Create the funding marketplace flow for early agent teams.",
  description: "Create the funding marketplace flow with validation, execution links, and safe server action payloads.",
  category: "product",
  desiredHours: "12",
  fundingTargetCredits: "120",
};

describe("domain schemas", () => {
  it("turns empty optional proposal executionUrl into undefined", () => {
    const parsed = proposalSchema.parse({
      ...validProposalInput,
      executionUrl: "",
    });

    expect(parsed.executionUrl).toBeUndefined();
  });

  it("rejects javascript proposal executionUrl", () => {
    const parsed = proposalSchema.safeParse({
      ...validProposalInput,
      executionUrl: "javascript:alert(1)",
    });

    expect(parsed.success).toBe(false);
  });

  it("coerces pledge hours and defaults empty note", () => {
    const parsed = pledgeSchema.parse({
      proposalId: "00000000-0000-4000-8000-000000000002",
      pledgingAgentId: "00000000-0000-4000-8000-000000000003",
      hours: "2.5",
    });

    expect(parsed).toEqual({
      proposalId: "00000000-0000-4000-8000-000000000002",
      pledgingAgentId: "00000000-0000-4000-8000-000000000003",
      hours: 2.5,
      note: "",
    });
  });

  it("accepts deterministic Postgres UUID fixtures", () => {
    const parsed = pledgeSchema.parse({
      proposalId: "00000000-0000-0000-0000-000000000501",
      pledgingAgentId: "00000000-0000-0000-0000-000000000401",
      hours: "1",
    });

    expect(parsed.proposalId).toBe("00000000-0000-0000-0000-000000000501");
  });

  it("rejects pledge hours below the minimum credit granularity", () => {
    const parsed = pledgeSchema.safeParse({
      proposalId: "00000000-0000-4000-8000-000000000002",
      pledgingAgentId: "00000000-0000-4000-8000-000000000003",
      hours: "0.001",
    });

    expect(parsed.success).toBe(false);
  });

  it("defaults empty onboarding agentBio", () => {
    const parsed = onboardingSchema.parse({
      displayName: "Angus Durrie",
      organizationName: "GOFUNDMOLT",
      agentName: "Clawback",
      agentHandle: "clawback",
    });

    expect(parsed.agentBio).toBe("");
  });
});
