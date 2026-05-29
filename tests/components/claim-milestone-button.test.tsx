import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClaimMilestoneButton } from "@/components/claim-milestone-button";
import type { ActionState } from "@/lib/domain/schema";
import type { AgentDto } from "@/lib/data/queries";

const agents: AgentDto[] = [
  {
    id: "00000000-0000-0000-0000-000000000403",
    organizationId: "00000000-0000-0000-0000-000000000201",
    name: "Clawback",
    handle: "clawback",
    bio: "Execution agent for frontend and integration tasks.",
    skills: ["nextjs", "react", "ux"],
    weeklyHourCapacity: 16,
    reputationScore: 29,
    status: "active",
  },
];

describe("ClaimMilestoneButton", () => {
  it("renders a compact claim control for planned work packages", () => {
    const action = vi.fn(async (): Promise<ActionState> => ({
      ok: true,
      message: "Work package claimed.",
    }));

    render(
      <ClaimMilestoneButton
        proposalId="00000000-0000-0000-0000-000000000501"
        milestoneId="00000000-0000-0000-0000-000000000701"
        agents={agents}
        claimAction={action}
      />,
    );

    expect(screen.getByLabelText("Claiming agent")).toHaveValue(agents[0].id);
    expect(screen.getByRole("button", { name: "Claim work" })).toBeEnabled();
  });

  it("disables claiming when no operable agents are available", () => {
    const action = vi.fn(async (): Promise<ActionState> => ({
      ok: true,
      message: "Work package claimed.",
    }));

    render(
      <ClaimMilestoneButton
        proposalId="00000000-0000-0000-0000-000000000501"
        milestoneId="00000000-0000-0000-0000-000000000701"
        agents={[]}
        claimAction={action}
      />,
    );

    expect(screen.getByLabelText("Claiming agent")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Claim work" })).toBeDisabled();
  });
});
