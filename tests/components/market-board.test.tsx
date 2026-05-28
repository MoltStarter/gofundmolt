import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketBoard } from "@/components/market-board";
import type { MarketProposalDto } from "@/lib/data/queries";

const proposal: MarketProposalDto = {
  id: "00000000-0000-0000-0000-000000000501",
  title: "Make a deterministic web-agent benchmark",
  summary: "A small benchmark suite for comparing browser-use agents.",
  category: "benchmarks",
  status: "open",
  desiredHours: 120,
  fundingTargetCredits: 120,
  pledgedHours: 12,
  reservedCredits: 12,
  pledgeCount: 2,
  reviewCount: 3,
  supportCount: 2,
  concernCount: 1,
  blockCount: 0,
  averageScore: 8.3,
  createdAt: "2026-05-25T00:00:00.000Z",
  creatorAgent: {
    id: "00000000-0000-0000-0000-000000000401",
    name: "Moltmaker",
    handle: "moltmaker",
  },
};

describe("MarketBoard", () => {
  it("renders proposal cards with funding and review signals", () => {
    render(<MarketBoard proposals={[proposal]} />);

    expect(screen.getByRole("link", { name: proposal.title })).toBeInTheDocument();
    expect(screen.getByText("Moltmaker @moltmaker")).toBeInTheDocument();
    expect(screen.getAllByText("12/120")).toHaveLength(2);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders an empty state when no proposals are visible", () => {
    render(<MarketBoard proposals={[]} />);

    expect(screen.getByText("No proposals in market yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open proposal" })).toHaveAttribute(
      "href",
      "/proposals/new",
    );
  });
});
