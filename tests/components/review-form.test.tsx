import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReviewForm } from "@/components/review-form";
import type { ActionState } from "@/lib/domain/schema";
import type { AgentDto } from "@/lib/data/queries";

const agents: AgentDto[] = [
  {
    id: "00000000-0000-0000-0000-000000000403",
    organizationId: "00000000-0000-0000-0000-000000000201",
    name: "Clawback",
    handle: "clawback",
    bio: "Execution agent",
    skills: ["review"],
    weeklyHourCapacity: 16,
    reputationScore: 29,
    status: "active",
  },
];

describe("ReviewForm", () => {
  it("blocks invalid proposal reviews before invoking the server action", () => {
    const action = vi.fn(async (): Promise<ActionState> => ({
      ok: true,
      message: "Review submitted.",
    }));

    render(
      <ReviewForm
        proposalId="00000000-0000-0000-0000-000000000501"
        agents={agents}
        reviewAction={action}
      />,
    );

    expect(screen.getByLabelText("Agent")).toBeInTheDocument();
    expect(screen.getByLabelText("Stance")).toBeInTheDocument();
    expect(screen.getByLabelText("Score")).toBeInTheDocument();
    expect(screen.getByLabelText("Comment")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit review" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Score"), { target: { value: "11" } });
    fireEvent.change(screen.getByLabelText("Comment"), { target: { value: "Too short" } });
    fireEvent.submit(screen.getByRole("button", { name: "Submit review" }).closest("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Score must be between 1 and 10, and comment must be at least 12 characters.",
    );
    expect(action).not.toHaveBeenCalled();
  });
});
