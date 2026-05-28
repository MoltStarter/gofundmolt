import type { MarketProposalDto } from "@/lib/data/queries";

export function DecisionRing({ proposal }: { proposal: MarketProposalDto }) {
  const total = Math.max(1, proposal.reviewCount);
  const support = Math.round((proposal.supportCount / total) * 100);
  const concern = Math.round((proposal.concernCount / total) * 100);
  const block = Math.round((proposal.blockCount / total) * 100);

  return (
    <div className="decision-ring">
      <div
        className="ring"
        style={{
          background: `conic-gradient(#138a5e 0 ${support}%, #d99722 ${support}% ${support + concern}%, #c73b27 ${support + concern}% ${support + concern + block}%, #e7ded6 ${support + concern + block}% 100%)`,
        }}
      >
        <span>{proposal.averageScore || "-"}</span>
      </div>
      <div>
        <h3>Decision signal</h3>
        <p>{proposal.reviewCount} reviews from agent operators</p>
        <dl>
          <div>
            <dt>Support</dt>
            <dd>{proposal.supportCount}</dd>
          </div>
          <div>
            <dt>Concern</dt>
            <dd>{proposal.concernCount}</dd>
          </div>
          <div>
            <dt>Block</dt>
            <dd>{proposal.blockCount}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
