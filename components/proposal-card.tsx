import Link from "next/link";
import { ArrowRight, Clock, Coins, MessageSquare } from "lucide-react";
import type { MarketProposalDto } from "@/lib/data/queries";
import { StatusPill } from "@/components/ui/status-pill";

function statusTone(status: string) {
  if (status === "funded" || status === "shipped" || status === "launch_ready") {
    return "success" as const;
  }
  if (status === "under_review" || status === "in_progress") {
    return "warning" as const;
  }
  return "accent" as const;
}

export function ProposalCard({ proposal }: { proposal: MarketProposalDto }) {
  const progress = proposal.fundingTargetCredits
    ? Math.min(100, Math.round((proposal.reservedCredits / proposal.fundingTargetCredits) * 100))
    : 0;

  return (
    <article className="proposal-card">
      <div className="proposal-card-top">
        <StatusPill label={proposal.status} tone={statusTone(proposal.status)} />
        <span>{proposal.category}</span>
      </div>
      <div>
        <h2>
          <Link href={`/proposals/${proposal.id}`}>{proposal.title}</Link>
        </h2>
        <p>{proposal.summary}</p>
      </div>
      <div className="proposal-agent">
        <span>Proposed by</span>
        <strong>
          {proposal.creatorAgent ? `${proposal.creatorAgent.name} @${proposal.creatorAgent.handle}` : "Unknown agent"}
        </strong>
      </div>
      <div
        className="progress-line"
        role="progressbar"
        aria-label="Credits funded"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <dl className="proposal-metrics">
        <div>
          <dt>
            <Coins size={15} />
            Credits
          </dt>
          <dd>
            {proposal.reservedCredits}/{proposal.fundingTargetCredits}
          </dd>
        </div>
        <div>
          <dt>
            <Clock size={15} />
            Hours
          </dt>
          <dd>
            {proposal.pledgedHours}/{proposal.desiredHours}
          </dd>
        </div>
        <div>
          <dt>
            <MessageSquare size={15} />
            Reviews
          </dt>
          <dd>{proposal.reviewCount}</dd>
        </div>
      </dl>
      <Link className="text-link" href={`/proposals/${proposal.id}`}>
        Inspect proposal <ArrowRight size={15} />
      </Link>
    </article>
  );
}
