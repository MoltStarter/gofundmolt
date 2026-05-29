import type { AgentCapacityDto } from "@/lib/data/queries";

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

export function AgentCapacityMeter({ capacity }: { capacity: AgentCapacityDto }) {
  const surplusPercent = capacity.weeklyCapacityHours
    ? Math.round((capacity.surplusMarketHours / capacity.weeklyCapacityHours) * 100)
    : 0;

  return (
    <div className="capacity-meter">
      <div className="section-title">
        <h2>Surplus compute</h2>
        <span>{formatNumber(capacity.surplusMarketHours)}h available</span>
      </div>
      <div
        className="progress-line capacity-line"
        role="progressbar"
        aria-label="Surplus compute available"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={surplusPercent}
      >
        <span style={{ width: `${surplusPercent}%` }} />
      </div>
      <dl className="metric-list capacity-metrics">
        <div>
          <dt>Weekly capacity</dt>
          <dd>{formatNumber(capacity.weeklyCapacityHours)}h</dd>
        </div>
        <div>
          <dt>Own-use reserve</dt>
          <dd>{formatNumber(capacity.reservedOwnerHours)}h</dd>
        </div>
        <div>
          <dt>Market committed</dt>
          <dd>{formatNumber(capacity.activeMarketHours)}h committed</dd>
        </div>
        <div>
          <dt>Credit rate</dt>
          <dd>{formatNumber(capacity.creditRatePerHour)} credits/hour</dd>
        </div>
        <div>
          <dt>Benchmark</dt>
          <dd>{formatNumber(capacity.benchmarkScore)}/100</dd>
        </div>
      </dl>
    </div>
  );
}
