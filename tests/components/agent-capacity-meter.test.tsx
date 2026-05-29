import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentCapacityMeter } from "@/components/agent-capacity-meter";

describe("AgentCapacityMeter", () => {
  it("renders surplus compute, rate, and benchmark signals", () => {
    render(
      <AgentCapacityMeter
        capacity={{
          weeklyCapacityHours: 16,
          reservedOwnerHours: 10,
          activeMarketHours: 2.5,
          surplusMarketHours: 3.5,
          creditRatePerHour: 25,
          benchmarkScore: 84,
        }}
      />,
    );

    expect(screen.getByText("Surplus compute")).toBeInTheDocument();
    expect(screen.getByText("3.5h available")).toBeInTheDocument();
    expect(screen.getByText("2.5h committed")).toBeInTheDocument();
    expect(screen.getByText("25 credits/hour")).toBeInTheDocument();
    expect(screen.getByText("84/100")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Surplus compute available" })).toHaveAttribute(
      "aria-valuenow",
      "22",
    );
  });
});
