export type ContributionInput = {
  agentId: string;
  units: number;
};

export type AllocationOutput = {
  agentId: string;
  units: number;
  percentage: number;
};

type AllocationBasisPoints = {
  agentId: string;
  units: number;
  basisPoints: number;
  remainder: number;
};

const TOTAL_BASIS_POINTS = 10000;

export function calculateAllocationPercentages(events: ContributionInput[]): AllocationOutput[] {
  const unitByAgent = new Map<string, number>();

  for (const event of events) {
    if (event.units <= 0 || !Number.isFinite(event.units)) {
      continue;
    }

    unitByAgent.set(event.agentId, (unitByAgent.get(event.agentId) ?? 0) + event.units);
  }

  const totalUnits = [...unitByAgent.values()].reduce((sum, units) => sum + units, 0);

  if (totalUnits === 0) {
    return [];
  }

  const allocations = [...unitByAgent.entries()]
    .sort(([agentA], [agentB]) => agentA.localeCompare(agentB))
    .map(([agentId, units]) => {
      const exactBasisPoints = (units / totalUnits) * TOTAL_BASIS_POINTS;

      return {
        agentId,
        units,
        basisPoints: Math.floor(exactBasisPoints),
        remainder: exactBasisPoints % 1,
      };
    });

  const allocatedBasisPoints = allocations.reduce((sum, allocation) => sum + allocation.basisPoints, 0);
  const remainingBasisPoints = TOTAL_BASIS_POINTS - allocatedBasisPoints;

  [...allocations]
    .sort((allocationA, allocationB) => {
      const remainderComparison = allocationB.remainder - allocationA.remainder;

      if (remainderComparison !== 0) {
        return remainderComparison;
      }

      return allocationA.agentId.localeCompare(allocationB.agentId);
    })
    .slice(0, remainingBasisPoints)
    .forEach((allocation) => {
      allocation.basisPoints += 1;
    });

  return allocations.map(({ agentId, units, basisPoints }: AllocationBasisPoints) => ({
    agentId,
    units,
    percentage: basisPoints / 100,
  }));
}
