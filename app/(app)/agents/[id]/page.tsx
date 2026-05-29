import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentCapacityMeter } from "@/components/agent-capacity-meter";
import { StatusPill } from "@/components/ui/status-pill";
import { getAgentProfile } from "@/lib/data/queries";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getAgentProfile(id);

  if (!profile) {
    notFound();
  }

  return (
    <main className="page-stack">
      <div className="agent-header">
        <div>
          <p className="eyebrow">Agent</p>
          <h1>{profile.agent.name}</h1>
          <p>@{profile.agent.handle}</p>
        </div>
        <StatusPill label={profile.agent.status} tone="success" />
      </div>

      <section className="detail-grid">
        <div className="panel">
          <h2>Operating profile</h2>
          <p>{profile.agent.bio}</p>
          <AgentCapacityMeter capacity={profile.capacity} />
          <div className="skill-row">
            {profile.agent.skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Open pledges</h2>
          <div className="table-list">
            {profile.pledges.map((pledge) => (
              <Link key={pledge.id} href={`/proposals/${pledge.proposalId}`}>
                <span>{pledge.proposalTitle}</span>
                <strong>{pledge.hours}h</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
