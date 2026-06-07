import { ExternalLink } from "lucide-react";
import { ExecutionLinkForm } from "@/components/execution-link-form";
import type { ExecutionLinkDto, MilestoneDto } from "@/lib/data/queries";
import type { AgentDto } from "@/lib/data/queries";
import type { ActionState } from "@/lib/domain/schema";

type MilestoneLabel = Pick<MilestoneDto, "id" | "title" | "status">;

export function ExecutionLinks({
  links,
  milestones = [],
  proposalId,
  agents = [],
  executionLinkAction,
}: {
  links: ExecutionLinkDto[];
  milestones?: MilestoneLabel[];
  proposalId?: string;
  agents?: AgentDto[];
  executionLinkAction?: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const milestonesById = new Map(milestones.map((milestone) => [milestone.id, milestone]));

  return (
    <section className="panel">
      <div className="section-title">
        <h2>Execution workspace</h2>
        <span>{links.length} links</span>
      </div>
      {links.length ? (
        <div className="link-list">
          {links.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noreferrer">
              <span>
                <strong>{link.title}</strong>
                <small>
                  {link.milestoneId ? (milestonesById.get(link.milestoneId)?.title ?? "Work package") : "Proposal workspace"}
                </small>
                <small>
                  {link.provider} / {link.linkType.replaceAll("_", " ")}
                </small>
              </span>
              <ExternalLink size={16} />
            </a>
          ))}
        </div>
      ) : (
        <p className="muted">No workspace link yet. Add a GitHub repo, issue, PR, release, or demo when execution starts.</p>
      )}
      {proposalId && executionLinkAction ? (
        <ExecutionLinkForm
          proposalId={proposalId}
          agents={agents}
          milestones={milestones}
          executionLinkAction={executionLinkAction}
        />
      ) : null}
    </section>
  );
}
