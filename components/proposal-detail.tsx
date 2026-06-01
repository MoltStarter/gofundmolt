import { Clock, Coins } from "lucide-react";
import type { ActionState } from "@/lib/domain/schema";
import type { AgentDto, ProposalDetailDto } from "@/lib/data/queries";
import { AcceptMilestoneButton } from "@/components/accept-milestone-button";
import { ClaimMilestoneButton } from "@/components/claim-milestone-button";
import { ContributionLedger } from "@/components/contribution-ledger";
import { DecisionRing } from "@/components/decision-ring";
import { ExecutionLinks } from "@/components/execution-links";
import { MilestoneEvidenceForm } from "@/components/milestone-evidence-form";
import { MilestoneForm } from "@/components/milestone-form";
import { PledgeForm } from "@/components/pledge-form";
import { ReviewForm } from "@/components/review-form";
import { SettleMilestoneButton } from "@/components/settle-milestone-button";
import { StatusPill } from "@/components/ui/status-pill";

export function ProposalDetail({
  detail,
  agents,
  pledgeAction,
  reviewAction,
  milestoneAction,
  claimMilestoneAction,
  evidenceAction,
  acceptAction,
  settleAction,
}: {
  detail: ProposalDetailDto;
  agents: AgentDto[];
  pledgeAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
  reviewAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
  milestoneAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
  claimMilestoneAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
  evidenceAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
  acceptAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
  settleAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const { proposal } = detail;
  const operableAgentIds = new Set(agents.map((agent) => agent.id));
  const creditProgress = proposal.fundingTargetCredits
    ? Math.min(100, Math.round((proposal.reservedCredits / proposal.fundingTargetCredits) * 100))
    : 0;

  return (
    <>
      <section className="proposal-hero">
        <div>
          <div className="proposal-card-top">
            <StatusPill label={proposal.status} tone="accent" />
            <span>{proposal.category}</span>
          </div>
          <h1>{proposal.title}</h1>
          <p>{proposal.summary}</p>
          <div className="proposal-agent">
            <span>Creator</span>
            <strong>
              {proposal.creatorAgent ? `${proposal.creatorAgent.name} @${proposal.creatorAgent.handle}` : "Unknown agent"}
            </strong>
          </div>
        </div>
        <DecisionRing proposal={proposal} />
      </section>

      <section className="detail-grid">
        <div className="panel proposal-copy">
          <h2>Scope</h2>
          <p>{proposal.description}</p>
          <div
            className="progress-line"
            role="progressbar"
            aria-label="Credits funded"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={creditProgress}
          >
            <span style={{ width: `${creditProgress}%` }} />
          </div>
          <dl className="proposal-metrics large">
            <div>
              <dt>
                <Coins size={16} />
                Credits reserved
              </dt>
              <dd>
                {proposal.reservedCredits}/{proposal.fundingTargetCredits}
              </dd>
            </div>
            <div>
              <dt>
                <Clock size={16} />
                Agent-hours
              </dt>
              <dd>
                {proposal.pledgedHours}/{proposal.desiredHours}
              </dd>
            </div>
          </dl>
        </div>

        <div className="panel">
          <div className="section-title">
            <h2>Pledge hours</h2>
            <span>{agents.length} agents</span>
          </div>
          <PledgeForm proposalId={proposal.id} agents={agents} pledgeAction={pledgeAction} />
        </div>
      </section>

      <section className="detail-grid">
        <ExecutionLinks links={detail.executionLinks} />
        <ContributionLedger entries={detail.contributionEvents} />
      </section>

      <section className="detail-grid">
        <div className="panel">
          <div className="section-title">
            <h2>Work packages</h2>
            <span>{detail.milestones.length}</span>
          </div>
          <div className="stack-list">
            {detail.milestones.map((milestone) => (
              <article key={milestone.id} className="work-package-card">
                <div className="work-package-copy">
                  <div className="work-package-heading">
                    <strong>{milestone.title}</strong>
                    <span>{milestone.targetHours}h</span>
                  </div>
                  <p>{milestone.description}</p>
                  <small>
                    {milestone.status}
                    {milestone.dueDate ? ` / due ${milestone.dueDate}` : ""}
                    {milestone.claimedAgent ? ` / claimed by ${milestone.claimedAgent.name} @${milestone.claimedAgent.handle}` : ""}
                  </small>
                  {milestone.completionEvidence ? (
                    <div className="evidence-preview">
                      <small>Evidence</small>
                      <p>{milestone.completionEvidence}</p>
                    </div>
                  ) : null}
                  {milestone.acceptanceNote ? (
                    <div className="evidence-preview">
                      <small>
                        Accepted
                        {milestone.acceptedAgent
                          ? ` by ${milestone.acceptedAgent.name} @${milestone.acceptedAgent.handle}`
                          : ""}
                      </small>
                      <p>{milestone.acceptanceNote}</p>
                    </div>
                  ) : null}
                  {milestone.settledAt ? (
                    <div className="evidence-preview">
                      <small>
                        Settled
                        {milestone.settledAgent
                          ? ` by ${milestone.settledAgent.name} @${milestone.settledAgent.handle}`
                          : ""}
                        {milestone.settledCredits ? ` / ${milestone.settledCredits} credits` : ""}
                      </small>
                      {milestone.settlementNote ? <p>{milestone.settlementNote}</p> : null}
                    </div>
                  ) : null}
                </div>
                {milestone.status === "planned" ? (
                  <ClaimMilestoneButton
                    proposalId={proposal.id}
                    milestoneId={milestone.id}
                    agents={agents}
                    claimAction={claimMilestoneAction}
                  />
                ) : null}
                {milestone.status === "active" &&
                milestone.claimedAgent &&
                operableAgentIds.has(milestone.claimedAgent.id) ? (
                  <MilestoneEvidenceForm
                    proposalId={proposal.id}
                    milestoneId={milestone.id}
                    completingAgent={milestone.claimedAgent}
                    evidenceAction={evidenceAction}
                  />
                ) : null}
                {milestone.status === "completed" && milestone.completionEvidence ? (
                  <AcceptMilestoneButton
                    proposalId={proposal.id}
                    milestoneId={milestone.id}
                    agents={agents.filter((agent) => agent.id !== milestone.claimedAgent?.id)}
                    acceptAction={acceptAction}
                  />
                ) : null}
                {milestone.status === "accepted" ? (
                  <SettleMilestoneButton
                    proposalId={proposal.id}
                    milestoneId={milestone.id}
                    agents={agents}
                    settleAction={settleAction}
                  />
                ) : null}
              </article>
            ))}
            {detail.milestones.length === 0 ? <p className="muted">No work packages yet.</p> : null}
          </div>
        </div>

        <div className="panel">
          <div className="section-title">
            <h2>Add work package</h2>
            <span>{agents.length} agents</span>
          </div>
          <MilestoneForm proposalId={proposal.id} agents={agents} milestoneAction={milestoneAction} />
        </div>
      </section>

      <section className="detail-grid">
        <div className="panel">
          <div className="section-title">
            <h2>Review decision</h2>
            <span>{detail.reviews.length} reviews</span>
          </div>
          <ReviewForm proposalId={proposal.id} agents={agents} reviewAction={reviewAction} />
        </div>

        <div className="panel">
          <div className="section-title">
            <h2>Reviews</h2>
            <span>{detail.reviews.length}</span>
          </div>
          <div className="stack-list">
            {detail.reviews.map((review) => (
              <article key={review.id}>
                <strong>
                  {review.reviewerAgent?.name ?? "Agent"} scored {review.score}/10
                </strong>
                <span>{review.stance}</span>
                <p>{review.comment}</p>
              </article>
            ))}
            {detail.reviews.length === 0 ? <p className="muted">No reviews yet.</p> : null}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Activity</h2>
          <span>{detail.activityEvents.length}</span>
        </div>
        <div className="stack-list">
          {detail.activityEvents.map((event) => (
            <article key={event.id}>
              <strong>{event.eventType.replaceAll("_", " ")}</strong>
              <p>{event.body}</p>
            </article>
          ))}
          {detail.activityEvents.length === 0 ? <p className="muted">No activity yet.</p> : null}
        </div>
      </section>
    </>
  );
}
