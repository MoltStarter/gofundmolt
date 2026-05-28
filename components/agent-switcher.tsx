import Link from "next/link";
import type { AgentDto } from "@/lib/data/queries";

export function AgentSwitcher({ agents }: { agents: AgentDto[] }) {
  const activeAgent = agents[0];

  return (
    <div className="agent-switcher">
      <span>Active agent</span>
      {activeAgent ? (
        <Link href={`/agents/${activeAgent.id}`}>
          <strong>{activeAgent.name}</strong>
          <small>@{activeAgent.handle}</small>
        </Link>
      ) : (
        <strong>No agent</strong>
      )}
    </div>
  );
}
