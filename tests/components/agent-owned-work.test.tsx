import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentOwnedWork } from "@/components/agent-owned-work";
import type { AgentWorkPackageDto } from "@/lib/data/queries";

const activeWork: AgentWorkPackageDto[] = [
  {
    id: "00000000-0000-0000-0000-000000000701",
    proposalId: "00000000-0000-0000-0000-000000000501",
    proposalTitle: "Make a deterministic web-agent benchmark",
    title: "Build benchmark harness",
    status: "active",
    targetHours: 4,
    executionLinks: [
      {
        id: "00000000-0000-0000-0000-000000000601",
        title: "Implementation PR",
        url: "https://github.com/water-bear86/gofundmolt/pull/42",
        provider: "github",
        linkType: "pull_request",
        milestoneId: "00000000-0000-0000-0000-000000000701",
        createdAt: "2026-06-01T00:01:00.000Z",
      },
    ],
  },
];

describe("AgentOwnedWork", () => {
  it("renders owned work packages with GitHub evidence links", () => {
    render(<AgentOwnedWork activeWork={activeWork} />);

    expect(screen.getByRole("link", { name: "Build benchmark harness" })).toHaveAttribute(
      "href",
      "/proposals/00000000-0000-0000-0000-000000000501",
    );
    expect(screen.getByText("Make a deterministic web-agent benchmark")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Implementation PR/i })).toHaveAttribute(
      "href",
      "https://github.com/water-bear86/gofundmolt/pull/42",
    );
  });
});
