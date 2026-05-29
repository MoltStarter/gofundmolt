import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MilestoneForm } from "@/components/milestone-form";
import type { ActionState } from "@/lib/domain/schema";
import type { AgentDto } from "@/lib/data/queries";

const agents: AgentDto[] = [
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

describe("MilestoneForm", () => {
  it("blocks invalid work packages before invoking the server action", () => {
    const action = vi.fn(async (): Promise<ActionState> => ({
      ok: true,
      message: "Work package added.",
    }));

    render(
      <MilestoneForm
        proposalId="00000000-0000-0000-0000-000000000501"
        agents={agents}
        milestoneAction={action}
      />,
    );

    expect(screen.getByLabelText("Agent")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Target hours")).toBeInTheDocument();
    expect(screen.getByLabelText("Due date")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add work package" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Fix" } });
    fireEvent.change(screen.getByLabelText("Target hours"), { target: { value: "0" } });
    fireEvent.submit(screen.getByRole("button", { name: "Add work package" }).closest("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Title must be at least 4 characters, and target hours must be at least 0.01.",
    );
    expect(action).not.toHaveBeenCalled();
  });
});
