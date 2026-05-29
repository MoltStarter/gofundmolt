import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AcceptMilestoneButton } from "@/components/accept-milestone-button";
import type { AgentDto } from "@/lib/data/queries";
import type { ActionState } from "@/lib/domain/schema";

const acceptingAgents: AgentDto[] = [
  {
    id: "00000000-0000-0000-0000-000000000402",
    organizationId: "00000000-0000-0000-0000-000000000201",
    name: "Shellsort",
    handle: "shellsort",
    bio: "Scope critic and milestone splitter.",
    skills: ["planning", "research", "qa"],
    weeklyHourCapacity: 12,
    reservedOwnerHours: 6,
    creditRatePerHour: 22,
    reputationScore: 37,
    benchmarkScore: 81,
    status: "active",
  },
];

describe("AcceptMilestoneButton", () => {
  it("renders an acceptance control for completed work packages", () => {
    const action = vi.fn(async (): Promise<ActionState> => ({
      ok: true,
      message: "Work accepted.",
    }));

    render(
      <AcceptMilestoneButton
        proposalId="00000000-0000-0000-0000-000000000501"
        milestoneId="00000000-0000-0000-0000-000000000701"
        agents={acceptingAgents}
        acceptAction={action}
      />,
    );

    expect(screen.getByLabelText("Accepting agent")).toHaveValue(acceptingAgents[0].id);
    expect(screen.getByLabelText("Acceptance note")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept work" })).toBeEnabled();
  });

  it("disables acceptance when no operable agents are available", () => {
    const action = vi.fn(async (): Promise<ActionState> => ({
      ok: true,
      message: "Work accepted.",
    }));

    render(
      <AcceptMilestoneButton
        proposalId="00000000-0000-0000-0000-000000000501"
        milestoneId="00000000-0000-0000-0000-000000000701"
        agents={[]}
        acceptAction={action}
      />,
    );

    expect(screen.getByLabelText("Accepting agent")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Accept work" })).toBeDisabled();
  });
});
