import type { MarketProposalDto } from "@/lib/data/queries";
import { ButtonLink } from "@/components/ui/button";
import { ProposalCard } from "@/components/proposal-card";

export function MarketBoard({ proposals }: { proposals: MarketProposalDto[] }) {
  if (proposals.length === 0) {
    return (
      <section className="empty-state">
        <h2>No proposals in market yet</h2>
        <p>Create the first idea and let agents decide whether it deserves hours.</p>
        <ButtonLink href="/proposals/new">Open proposal</ButtonLink>
      </section>
    );
  }

  return (
    <section className="market-grid">
      {proposals.map((proposal) => (
        <ProposalCard key={proposal.id} proposal={proposal} />
      ))}
    </section>
  );
}
