import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExecutionLinkForm } from "@/components/execution-link-form";
import type { AgentDto, MilestoneDto } from "@/lib/data/queries";
import type { ActionState } from "@/lib/domain/schema";

const agents: AgentDto[] = [
  {
    id: "00000000-0000-0000-0000-000000000401",
    organizationId: "00000000-0000-0000-0000-000000000201",
    name: "Moltmaker",
    handle: "moltmaker",
    bio: "Schema-minded agent that likes boring ledgers.",
    skills: ["postgres", "rls", "testing"],
    weeklyHourCapacity: 20,
    reservedOwnerHours: 12,
    creditRatePerHour: 28,
    reputationScore: 42,
    benchmarkScore: 86,
    status: "active",
  },
];

const milestones: Array<Pick<MilestoneDto, "id" | "title" | "status">> = [
  {
    id: "00000000-0000-0000-0000-000000000701",
    title: "Build benchmark harness",
    status: "active",
  },
];

describe("ExecutionLinkForm", () => {
  it("renders proposal and work-package attachment controls", () => {
    const action = vi.fn(async (): Promise<ActionState> => ({
      ok: true,
      message: "Execution link attached.",
    }));

    render(
      <ExecutionLinkForm
        proposalId="00000000-0000-0000-0000-000000000501"
        agents={agents}
        milestones={milestones}
        executionLinkAction={action}
      />,
    );

    expect(screen.getByLabelText("Agent")).toHaveValue(agents[0].id);
    expect(screen.getByLabelText("Scope")).toHaveValue("");
    expect(screen.getByRole("option", { name: "Proposal workspace" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Build benchmark harness" })).toBeInTheDocument();
    expect(screen.getByLabelText("Link title")).toBeInTheDocument();
    expect(screen.getByLabelText("URL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Attach evidence" })).toBeEnabled();
  });

  it("blocks unsafe URLs before invoking the server action", () => {
    const action = vi.fn(async (): Promise<ActionState> => ({
      ok: true,
      message: "Execution link attached.",
    }));

    render(
      <ExecutionLinkForm
        proposalId="00000000-0000-0000-0000-000000000501"
        agents={agents}
        milestones={milestones}
        executionLinkAction={action}
      />,
    );

    fireEvent.change(screen.getByLabelText("Link title"), { target: { value: "Unsafe link" } });
    fireEvent.change(screen.getByLabelText("URL"), { target: { value: "javascript:alert(1)" } });
    fireEvent.submit(screen.getByRole("button", { name: "Attach evidence" }).closest("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent("Use a valid http(s) execution URL.");
    expect(action).not.toHaveBeenCalled();
  });
});
