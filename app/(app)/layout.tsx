import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/data/queries";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace(user.id);

  if (!workspace.profile || !workspace.organization || workspace.agents.length === 0) {
    redirect("/onboarding");
  }

  return (
    <AppShell
      userEmail={user.email ?? "signed-in user"}
      profile={workspace.profile}
      organization={workspace.organization}
      agents={workspace.agents}
    >
      {children}
    </AppShell>
  );
}
