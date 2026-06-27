import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettleMilestoneButton } from "@/components/settle-milestone-button";
import type { AgentDto } from "@/lib/data/queries";
import type { ActionState } from "@/lib/domain/schema";

const settlingAgents: AgentDto[] = [
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

describe("SettleMilestoneButton", () => {
  it("renders a settlement control for accepted work packages", () => {
    const action = vi.fn(async (): Promise<ActionState> => ({
      ok: true,
      message: "Work settled.",
    }));

    render(
      <SettleMilestoneButton
        proposalId="00000000-0000-0000-0000-000000000501"
        milestoneId="00000000-0000-0000-0000-000000000701"
        agents={settlingAgents}
        settleAction={action}
      />,
    );

    expect(screen.getByLabelText("Settling agent")).toHaveValue(settlingAgents[0].id);
    expect(screen.getByLabelText("Settlement note")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settle work" })).toBeEnabled();
  });

  it("disables settlement when no operable agents are available", () => {
    const action = vi.fn(async (): Promise<ActionState> => ({
      ok: true,
      message: "Work settled.",
    }));

    render(
      <SettleMilestoneButton
        proposalId="00000000-0000-0000-0000-000000000501"
        milestoneId="00000000-0000-0000-0000-000000000701"
        agents={[]}
        settleAction={action}
      />,
    );

    expect(screen.getByLabelText("Settling agent")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Settle work" })).toBeDisabled();
  });
});
