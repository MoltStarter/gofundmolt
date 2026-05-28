import { ExternalLink } from "lucide-react";
import type { ExecutionLinkDto } from "@/lib/data/queries";

export function ExecutionLinks({ links }: { links: ExecutionLinkDto[] }) {
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
    </section>
  );
}
