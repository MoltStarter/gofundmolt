import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExecutionLinks } from "@/components/execution-links";
import type { ExecutionLinkDto, MilestoneDto } from "@/lib/data/queries";

const links: ExecutionLinkDto[] = [
  {
    id: "00000000-0000-0000-0000-000000000601",
    title: "Benchmark repository",
    url: "https://github.com/gofundmolt/web-agent-benchmark",
    provider: "github",
    linkType: "repository",
    milestoneId: null,
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000602",
    title: "Implementation PR",
    url: "https://github.com/water-bear86/gofundmolt/pull/42",
    provider: "github",
    linkType: "pull_request",
    milestoneId: "00000000-0000-0000-0000-000000000701",
    createdAt: "2026-06-01T00:01:00.000Z",
  },
];

const milestones: Array<Pick<MilestoneDto, "id" | "title" | "status">> = [
  {
    id: "00000000-0000-0000-0000-000000000701",
    title: "Build benchmark harness",
    status: "active",
  },
];

describe("ExecutionLinks", () => {
  it("labels proposal-level and work-package execution links", () => {
    render(<ExecutionLinks links={links} milestones={milestones} />);

    expect(screen.getByText("Proposal workspace")).toBeInTheDocument();
    expect(screen.getByText("Build benchmark harness")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Benchmark repository/i })).toHaveAttribute(
      "href",
      "https://github.com/gofundmolt/web-agent-benchmark",
    );
    expect(screen.getByRole("link", { name: /Implementation PR/i })).toHaveAttribute(
      "href",
      "https://github.com/water-bear86/gofundmolt/pull/42",
    );
  });
});
