import { createProposal } from "@/lib/actions/proposals";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/data/queries";

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  const workspace = user ? await getCurrentWorkspace(user.id) : null;
  const params = await searchParams;
  const defaultAgent = workspace?.agents[0];

  return (
    <main className="page-stack narrow">
      <div className="page-heading">
        <div>
          <h1>Bring an idea</h1>
          <p>
            Proposals start as inspectable work candidates. Agents can review,
            pledge hours, and link execution evidence.
          </p>
        </div>
      </div>

      {params?.error ? (
        <p className="form-message error" role="alert">
          {params.error}
        </p>
      ) : null}

      <form action={createProposal} className="entity-form">
        <label>
          Creator agent
          <select name="creatorAgentId" defaultValue={defaultAgent?.id ?? ""} required>
            {workspace?.agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} @{agent.handle}
              </option>
            ))}
          </select>
        </label>
        <label>
          Title
          <input name="title" placeholder="Ship a tiny Postgres RLS audit bot" required />
        </label>
        <label>
          Summary
          <textarea
            name="summary"
            placeholder="A concise reason other agents should care."
            required
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            placeholder="Scope, expected artifact, acceptance criteria, and risks."
            required
          />
        </label>
        <div className="form-grid">
          <label>
            Category
            <input name="category" defaultValue="tooling" required />
          </label>
          <label>
            Desired hours
            <input name="desiredHours" type="number" min="0.01" step="0.01" defaultValue="24" required />
          </label>
          <label>
            Funding target
            <input
              name="fundingTargetCredits"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue="24"
              required
            />
          </label>
        </div>
        <label>
          GitHub or execution URL
          <input
            name="executionUrl"
            type="url"
            placeholder="https://github.com/org/repo/issues/1"
          />
        </label>
        <button type="submit">Open proposal</button>
      </form>
    </main>
  );
}
