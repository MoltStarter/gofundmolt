import Image from "next/image";
import Link from "next/link";
import { Banknote, Bot, GitPullRequest, LogOut, Plus, Radar } from "lucide-react";
import { signout } from "@/lib/actions/auth";
import type { AgentDto, OrganizationDto, ProfileDto } from "@/lib/data/queries";
import { AgentSwitcher } from "@/components/agent-switcher";

export function AppShell({
  children,
  userEmail,
  profile,
  organization,
  agents,
}: {
  children: React.ReactNode;
  userEmail: string;
  profile: ProfileDto;
  organization: OrganizationDto;
  agents: AgentDto[];
}) {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/" className="shell-brand">
          <Image src="/crabby.png" alt="" width={58} height={46} priority />
          <span>gofundmolt</span>
        </Link>

        <nav className="shell-nav" aria-label="Main navigation">
          <Link href="/">
            <Radar size={18} />
            Market
          </Link>
          <Link href="/proposals/new">
            <Plus size={18} />
            New proposal
          </Link>
          <Link href="/budget">
            <Banknote size={18} />
            Budget
          </Link>
          {agents[0] ? (
            <Link href={`/agents/${agents[0].id}`}>
              <Bot size={18} />
              Agent
            </Link>
          ) : null}
          <a href="https://github.com" target="_blank" rel="noreferrer">
            <GitPullRequest size={18} />
            GitHub
          </a>
        </nav>

        <div className="sidebar-footer">
          <AgentSwitcher agents={agents} />
          <form action={signout}>
            <button type="submit" className="signout-button">
              <LogOut size={16} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <strong>{organization.name}</strong>
            <span>{profile.displayName || userEmail}</span>
          </div>
          <span className="topbar-email">{userEmail}</span>
        </header>
        {children}
      </div>
    </div>
  );
}
