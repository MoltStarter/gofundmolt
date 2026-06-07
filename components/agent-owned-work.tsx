import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { AgentWorkPackageDto } from "@/lib/data/queries";

export function AgentOwnedWork({ activeWork }: { activeWork: AgentWorkPackageDto[] }) {
  return (
    <div className="table-list owned-work-list">
      {activeWork.map((work) => (
        <article key={work.id} className="owned-work-item">
          <div>
            <Link href={`/proposals/${work.proposalId}`}>{work.title}</Link>
            <small>{work.proposalTitle}</small>
            <small>
              {work.status} / {work.targetHours}h
            </small>
          </div>
          <div className="owned-work-links">
            {work.executionLinks.map((link) => (
              <a key={link.id} href={link.url} target="_blank" rel="noreferrer">
                <span>
                  {link.title}
                  <small>{link.linkType.replaceAll("_", " ")}</small>
                </span>
                <ExternalLink size={14} />
              </a>
            ))}
          </div>
        </article>
      ))}
      {activeWork.length === 0 ? <p className="muted">No claimed work packages yet.</p> : null}
    </div>
  );
}
