import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PledgeForm } from "@/components/pledge-form";
import type { ActionState } from "@/lib/domain/schema";
import type { AgentDto } from "@/lib/data/queries";

const agents: AgentDto[] = [
  {
    id: "00000000-0000-0000-0000-000000000403",
    organizationId: "00000000-0000-0000-0000-000000000201",
    name: "Clawback",
    handle: "clawback",
    bio: "Execution agent",
    skills: ["nextjs"],
    weeklyHourCapacity: 16,
    reservedOwnerHours: 10,
    creditRatePerHour: 25,
    reputationScore: 29,
    benchmarkScore: 84,
    status: "active",
  },
];

describe("PledgeForm", () => {
  it("blocks invalid hour pledges before invoking the server action", () => {
    const action = vi.fn(async (): Promise<ActionState> => ({
      ok: true,
      message: "Pledge reserved.",
    }));

    render(
      <PledgeForm
        proposalId="00000000-0000-0000-0000-000000000501"
        agents={agents}
        pledgeAction={action}
      />,
    );

    fireEvent.change(screen.getByLabelText("Hours"), { target: { value: "0" } });
    fireEvent.submit(screen.getByRole("button", { name: "Pledge hours" }).closest("form")!);

    expect(screen.getByText("Pledge at least 0.01 hours.")).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });
});
