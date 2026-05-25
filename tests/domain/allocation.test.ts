import { describe, expect, it } from "vitest";
import { calculateAllocationPercentages } from "@/lib/domain/allocation";

describe("calculateAllocationPercentages", () => {
  it("returns contribution percentages that sum to 100", () => {
    const allocations = calculateAllocationPercentages([
      { agentId: "agent-a", units: 25 },
      { agentId: "agent-b", units: 75 },
    ]);

    expect(allocations).toEqual([
      { agentId: "agent-a", units: 25, percentage: 25 },
      { agentId: "agent-b", units: 75, percentage: 75 },
    ]);
  });

  it("combines multiple events for the same agent", () => {
    const allocations = calculateAllocationPercentages([
      { agentId: "agent-a", units: 10 },
      { agentId: "agent-a", units: 15 },
      { agentId: "agent-b", units: 25 },
    ]);

    expect(allocations).toEqual([
      { agentId: "agent-a", units: 25, percentage: 50 },
      { agentId: "agent-b", units: 25, percentage: 50 },
    ]);
  });

  it("adjusts rounding so three equal contributors sum to 100", () => {
    const allocations = calculateAllocationPercentages([
      { agentId: "agent-a", units: 1 },
      { agentId: "agent-b", units: 1 },
      { agentId: "agent-c", units: 1 },
    ]);

    expect(allocations).toEqual([
      { agentId: "agent-a", units: 1, percentage: 33.34 },
      { agentId: "agent-b", units: 1, percentage: 33.33 },
      { agentId: "agent-c", units: 1, percentage: 33.33 },
    ]);
    expect(allocations.reduce((sum, allocation) => sum + allocation.percentage, 0)).toBe(100);
  });

  it("adjusts rounding so six equal contributors sum to 100", () => {
    const allocations = calculateAllocationPercentages([
      { agentId: "agent-a", units: 1 },
      { agentId: "agent-b", units: 1 },
      { agentId: "agent-c", units: 1 },
      { agentId: "agent-d", units: 1 },
      { agentId: "agent-e", units: 1 },
      { agentId: "agent-f", units: 1 },
    ]);

    expect(allocations).toEqual([
      { agentId: "agent-a", units: 1, percentage: 16.67 },
      { agentId: "agent-b", units: 1, percentage: 16.67 },
      { agentId: "agent-c", units: 1, percentage: 16.67 },
      { agentId: "agent-d", units: 1, percentage: 16.67 },
      { agentId: "agent-e", units: 1, percentage: 16.66 },
      { agentId: "agent-f", units: 1, percentage: 16.66 },
    ]);
    expect(allocations.reduce((sum, allocation) => sum + allocation.percentage, 0)).toBe(100);
  });

  it("returns an empty allocation for no units", () => {
    expect(calculateAllocationPercentages([])).toEqual([]);
  });
});
