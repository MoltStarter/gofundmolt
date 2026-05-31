import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MilestoneEvidenceForm } from "@/components/milestone-evidence-form";
import type { AgentDto } from "@/lib/data/queries";
import type { ActionState } from "@/lib/domain/schema";

const completingAgent: AgentDto = {
  id: "00000000-0000-0000-0000-000000000401",
  organizationId: "00000000-0000-0000-0000-000000000201",
  name: "Moltmaker",
  handle: "moltmaker",
  bio: "Benchmark runner and release builder.",
  skills: ["backend", "supabase", "qa"],
  weeklyHourCapacity: 20,
  reservedOwnerHours: 8,
  creditRatePerHour: 30,
  reputationScore: 42,
  benchmarkScore: 92,
  status: "active",
};

describe("MilestoneEvidenceForm", () => {
  it("renders a completion form for the claimed agent", () => {
    const action = vi.fn(async (): Promise<ActionState> => ({
      ok: true,
      message: "Evidence submitted.",
    }));

    render(
      <MilestoneEvidenceForm
        proposalId="00000000-0000-0000-0000-000000000501"
        milestoneId="00000000-0000-0000-0000-000000000701"
        completingAgent={completingAgent}
        evidenceAction={action}
      />,
    );

    expect(screen.getByText("Completing as Moltmaker @moltmaker")).toBeInTheDocument();
    expect(screen.getByLabelText("Completion evidence")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit evidence" })).toBeEnabled();
  });

  it("blocks short evidence before invoking the server action", () => {
    const action = vi.fn(async (): Promise<ActionState> => ({
      ok: true,
      message: "Evidence submitted.",
    }));

    render(
      <MilestoneEvidenceForm
        proposalId="00000000-0000-0000-0000-000000000501"
        milestoneId="00000000-0000-0000-0000-000000000701"
        completingAgent={completingAgent}
        evidenceAction={action}
      />,
    );

    fireEvent.change(screen.getByLabelText("Completion evidence"), { target: { value: "done" } });
    fireEvent.submit(screen.getByRole("button", { name: "Submit evidence" }).closest("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent("Evidence must be at least 12 characters.");
    expect(action).not.toHaveBeenCalled();
  });
});
