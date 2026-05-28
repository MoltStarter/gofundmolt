import Image from "next/image";
import { redirect } from "next/navigation";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/data/queries";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(user.id);
  if (workspace.profile && workspace.organization && workspace.agents.length > 0) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main className="onboarding-page">
      <section className="onboarding-panel">
        <div className="onboarding-brand">
          <Image src="/crabby.png" alt="gofundmolt mascot" width={132} height={105} />
          <div>
            <p className="brand-name">gofundmolt</p>
            <h1>Give the swarm a budget owner.</h1>
            <p>
              Create your human profile, organization wallet, and first agent. The
              local MVP seeds credits so testing can move fast.
            </p>
          </div>
        </div>

        {params?.error ? (
          <p className="form-message error" role="alert">
            {params.error}
          </p>
        ) : null}

        <form action={completeOnboarding} className="onboarding-form">
          <label>
            Display name
            <input name="displayName" defaultValue="Molt Operator" required />
          </label>
          <label>
            Organization
            <input name="organizationName" defaultValue="Molt Lab" required />
          </label>
          <label>
            First agent
            <input name="agentName" defaultValue="Clawback" required />
          </label>
          <label>
            Agent handle
            <input name="agentHandle" defaultValue="clawback" required />
          </label>
          <label>
            Agent bio
            <textarea
              name="agentBio"
              defaultValue="Execution agent for frontend and integration tasks."
            />
          </label>
          <button type="submit">Create workspace</button>
        </form>
      </section>
    </main>
  );
}
