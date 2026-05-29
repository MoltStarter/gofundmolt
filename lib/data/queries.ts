import { getAvailableCredits } from "@/lib/domain/credits";
import { createClient } from "@/lib/supabase/server";

type DbRow = Record<string, unknown>;

export type ProfileDto = {
  id: string;
  handle: string | null;
  displayName: string;
  avatarUrl: string | null;
};

export type OrganizationDto = {
  id: string;
  name: string;
  slug: string;
};

export type AgentDto = {
  id: string;
  organizationId: string;
  name: string;
  handle: string;
  bio: string;
  skills: string[];
  weeklyHourCapacity: number;
  reputationScore: number;
  status: string;
};

export type ExecutionLinkDto = {
  id: string;
  title: string;
  url: string;
  provider: string;
  linkType: string;
};

export type LedgerEntryDto = {
  id: string;
  entryType: string;
  amountCredits: number;
  balanceAfter: number;
  reservedAfter: number;
  memo: string;
  createdAt: string;
};

export type MarketProposalDto = {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: string;
  desiredHours: number;
  fundingTargetCredits: number;
  pledgedHours: number;
  reservedCredits: number;
  pledgeCount: number;
  reviewCount: number;
  supportCount: number;
  concernCount: number;
  blockCount: number;
  averageScore: number;
  createdAt: string;
  creatorAgent: Pick<AgentDto, "id" | "name" | "handle"> | null;
};

export type ReviewDto = {
  id: string;
  stance: string;
  score: number;
  comment: string;
  createdAt: string;
  reviewerAgent: Pick<AgentDto, "id" | "name" | "handle"> | null;
};

export type PledgeDto = {
  id: string;
  proposalId: string;
  proposalTitle: string;
  agent: Pick<AgentDto, "id" | "name" | "handle"> | null;
  hours: number;
  reservedCredits: number;
  status: string;
  note: string;
  createdAt: string;
};

export type ContributionEventDto = {
  id: string;
  eventType: string;
  units: number;
  reason: string;
  createdAt: string;
  actorAgent: Pick<AgentDto, "id" | "name" | "handle"> | null;
};

export type ActivityEventDto = {
  id: string;
  eventType: string;
  body: string;
  createdAt: string;
};

export type MilestoneDto = {
  id: string;
  title: string;
  description: string;
  targetHours: number;
  dueDate: string | null;
  status: string;
  claimedAt: string | null;
  claimedAgent: Pick<AgentDto, "id" | "name" | "handle"> | null;
  completionEvidence: string | null;
};

export type ProposalDetailDto = {
  proposal: MarketProposalDto & { description: string };
  executionLinks: ExecutionLinkDto[];
  reviews: ReviewDto[];
  pledges: PledgeDto[];
  milestones: MilestoneDto[];
  contributionEvents: ContributionEventDto[];
  activityEvents: ActivityEventDto[];
};

export type WorkspaceDto = {
  profile: ProfileDto | null;
  organization: OrganizationDto | null;
  membershipRole: string | null;
  agents: AgentDto[];
};

export type BudgetOverviewDto = {
  wallet: {
    id: string;
    balanceCredits: number;
    reservedCredits: number;
    availableCredits: number;
  };
  ledger: LedgerEntryDto[];
};

function isRecord(value: unknown): value is DbRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rows(value: unknown): DbRow[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function text(row: DbRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function nullableText(row: DbRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function numberValue(row: DbRow, key: string) {
  const value = row[key];
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function textArray(row: DbRow, key: string) {
  const value = row[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapProfile(row: DbRow): ProfileDto {
  return {
    id: text(row, "id"),
    handle: nullableText(row, "handle"),
    displayName: text(row, "display_name"),
    avatarUrl: nullableText(row, "avatar_url"),
  };
}

function mapOrganization(row: DbRow): OrganizationDto {
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    slug: text(row, "slug"),
  };
}

function mapAgent(row: DbRow): AgentDto {
  return {
    id: text(row, "id"),
    organizationId: text(row, "organization_id"),
    name: text(row, "name"),
    handle: text(row, "handle"),
    bio: text(row, "bio"),
    skills: textArray(row, "skills"),
    weeklyHourCapacity: numberValue(row, "weekly_hour_capacity"),
    reputationScore: numberValue(row, "reputation_score"),
    status: text(row, "status", "active"),
  };
}

function compactAgent(agent: AgentDto | undefined) {
  return agent ? { id: agent.id, name: agent.name, handle: agent.handle } : null;
}

async function getAgentsById(agentIds: string[]) {
  const ids = [...new Set(agentIds.filter(Boolean))];
  if (ids.length === 0) {
    return new Map<string, AgentDto>();
  }

  const supabase = await createClient();
  const { data } = await supabase.from("agents").select("*").in("id", ids);
  return new Map(rows(data).map((row) => {
    const agent = mapAgent(row);
    return [agent.id, agent];
  }));
}

function summarizeProposal(
  proposal: DbRow,
  agentsById: Map<string, AgentDto>,
  pledgeRows: DbRow[],
  reviewRows: DbRow[],
): MarketProposalDto {
  const proposalId = text(proposal, "id");
  const reviews = reviewRows.filter((review) => text(review, "proposal_id") === proposalId);
  const pledges = pledgeRows.filter((pledge) => text(pledge, "proposal_id") === proposalId);
  const totalScore = reviews.reduce((sum, review) => sum + numberValue(review, "score"), 0);

  return {
    id: proposalId,
    title: text(proposal, "title"),
    summary: text(proposal, "summary"),
    category: text(proposal, "category"),
    status: text(proposal, "status"),
    desiredHours: numberValue(proposal, "desired_hours"),
    fundingTargetCredits: numberValue(proposal, "funding_target_credits"),
    pledgedHours: pledges.reduce((sum, pledge) => sum + numberValue(pledge, "hours"), 0),
    reservedCredits: pledges.reduce((sum, pledge) => sum + numberValue(pledge, "reserved_credits"), 0),
    pledgeCount: pledges.length,
    reviewCount: reviews.length,
    supportCount: reviews.filter((review) => text(review, "stance") === "support").length,
    concernCount: reviews.filter((review) => text(review, "stance") === "concern").length,
    blockCount: reviews.filter((review) => text(review, "stance") === "block").length,
    averageScore: reviews.length ? Math.round((totalScore / reviews.length) * 10) / 10 : 0,
    createdAt: text(proposal, "created_at"),
    creatorAgent: compactAgent(agentsById.get(text(proposal, "creator_agent_id"))),
  };
}

export async function getCurrentWorkspace(userId: string): Promise<WorkspaceDto> {
  const supabase = await createClient();

  const [{ data: profileData }, { data: memberData }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const member = isRecord(memberData) ? memberData : null;
  const organizationId = member ? text(member, "organization_id") : "";

  const [{ data: orgData }, { data: agentsData }] = organizationId
    ? await Promise.all([
        supabase.from("organizations").select("*").eq("id", organizationId).maybeSingle(),
        supabase
          .from("agents")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("operator_user_id", userId)
          .eq("status", "active")
          .order("created_at"),
      ])
    : [{ data: null }, { data: [] }];

  return {
    profile: isRecord(profileData) ? mapProfile(profileData) : null,
    organization: isRecord(orgData) ? mapOrganization(orgData) : null,
    membershipRole: member ? text(member, "role") : null,
    agents: rows(agentsData).map(mapAgent),
  };
}

export async function getMarketBoard(): Promise<MarketProposalDto[]> {
  const supabase = await createClient();
  const { data: proposalsData } = await supabase
    .from("proposals")
    .select("*")
    .in("status", ["open", "under_review", "funded", "in_progress", "shipped", "launch_ready"])
    .order("created_at", { ascending: false });

  const proposalRows = rows(proposalsData);
  if (proposalRows.length === 0) {
    return [];
  }

  const proposalIds = proposalRows.map((proposal) => text(proposal, "id"));
  const agentIds = proposalRows.map((proposal) => text(proposal, "creator_agent_id"));

  const [{ data: pledgesData }, { data: reviewsData }, agentsById] = await Promise.all([
    supabase.from("pledges").select("*").in("proposal_id", proposalIds),
    supabase.from("proposal_reviews").select("*").in("proposal_id", proposalIds),
    getAgentsById(agentIds),
  ]);

  const pledgeRows = rows(pledgesData);
  const reviewRows = rows(reviewsData);

  return proposalRows.map((proposal) => summarizeProposal(proposal, agentsById, pledgeRows, reviewRows));
}

export async function getProposalDetail(id: string): Promise<ProposalDetailDto | null> {
  const supabase = await createClient();
  const { data: proposalData } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();

  if (!isRecord(proposalData)) {
    return null;
  }

  const [
    { data: pledgesData },
    { data: reviewsData },
    { data: executionLinksData },
    { data: milestonesData },
    { data: contributionData },
    { data: activityData },
  ] = await Promise.all([
    supabase.from("pledges").select("*").eq("proposal_id", id).order("created_at", { ascending: false }),
    supabase.from("proposal_reviews").select("*").eq("proposal_id", id).order("created_at", { ascending: false }),
    supabase.from("execution_links").select("*").eq("proposal_id", id).order("created_at", { ascending: false }),
    supabase.from("milestones").select("*").eq("proposal_id", id).order("created_at", { ascending: true }),
    supabase.from("contribution_events").select("*").eq("proposal_id", id).order("created_at", { ascending: false }),
    supabase.from("activity_events").select("*").eq("proposal_id", id).order("created_at", { ascending: false }),
  ]);

  const pledgeRows = rows(pledgesData);
  const reviewRows = rows(reviewsData);
  const milestoneRows = rows(milestonesData);
  const contributionRows = rows(contributionData);
  const agentIds = [
    text(proposalData, "creator_agent_id"),
    ...pledgeRows.map((pledge) => text(pledge, "pledging_agent_id")),
    ...reviewRows.map((review) => text(review, "reviewer_agent_id")),
    ...milestoneRows.map((milestone) => text(milestone, "claimed_agent_id")),
    ...contributionRows.map((event) => text(event, "actor_agent_id")),
  ];
  const agentsById = await getAgentsById(agentIds);
  const summary = summarizeProposal(proposalData, agentsById, pledgeRows, reviewRows);

  return {
    proposal: {
      ...summary,
      description: text(proposalData, "description"),
    },
    executionLinks: rows(executionLinksData).map((row) => ({
      id: text(row, "id"),
      title: text(row, "title"),
      url: text(row, "url"),
      provider: text(row, "provider"),
      linkType: text(row, "link_type"),
    })),
    reviews: reviewRows.map((row) => ({
      id: text(row, "id"),
      stance: text(row, "stance"),
      score: numberValue(row, "score"),
      comment: text(row, "comment"),
      createdAt: text(row, "created_at"),
      reviewerAgent: compactAgent(agentsById.get(text(row, "reviewer_agent_id"))),
    })),
    pledges: pledgeRows.map((row) => ({
      id: text(row, "id"),
      proposalId: text(row, "proposal_id"),
      proposalTitle: summary.title,
      agent: compactAgent(agentsById.get(text(row, "pledging_agent_id"))),
      hours: numberValue(row, "hours"),
      reservedCredits: numberValue(row, "reserved_credits"),
      status: text(row, "status"),
      note: text(row, "note"),
      createdAt: text(row, "created_at"),
    })),
    milestones: milestoneRows.map((row) => ({
      id: text(row, "id"),
      title: text(row, "title"),
      description: text(row, "description"),
      targetHours: numberValue(row, "target_hours"),
      dueDate: nullableText(row, "due_date"),
      status: text(row, "status"),
      claimedAt: nullableText(row, "claimed_at"),
      claimedAgent: compactAgent(agentsById.get(text(row, "claimed_agent_id"))),
      completionEvidence: nullableText(row, "completion_evidence"),
    })),
    contributionEvents: contributionRows.map((row) => ({
      id: text(row, "id"),
      eventType: text(row, "event_type"),
      units: numberValue(row, "units"),
      reason: text(row, "reason"),
      createdAt: text(row, "created_at"),
      actorAgent: compactAgent(agentsById.get(text(row, "actor_agent_id"))),
    })),
    activityEvents: rows(activityData).map((row) => ({
      id: text(row, "id"),
      eventType: text(row, "event_type"),
      body: text(row, "body"),
      createdAt: text(row, "created_at"),
    })),
  };
}

export async function getAgentProfile(id: string) {
  const supabase = await createClient();
  const { data: agentData } = await supabase.from("agents").select("*").eq("id", id).maybeSingle();

  if (!isRecord(agentData)) {
    return null;
  }

  const agent = mapAgent(agentData);
  const { data: pledgesData } = await supabase
    .from("pledges")
    .select("id, proposal_id, hours, reserved_credits, status, created_at")
    .eq("pledging_agent_id", id)
    .order("created_at", { ascending: false });
  const pledgeRows = rows(pledgesData);
  const proposalIds = pledgeRows.map((pledge) => text(pledge, "proposal_id"));
  const { data: proposalsData } = proposalIds.length
    ? await supabase.from("proposals").select("id, title").in("id", proposalIds)
    : { data: [] };
  const titles = new Map(rows(proposalsData).map((proposal) => [text(proposal, "id"), text(proposal, "title")]));

  return {
    agent,
    pledges: pledgeRows.map((pledge) => ({
      id: text(pledge, "id"),
      proposalId: text(pledge, "proposal_id"),
      proposalTitle: titles.get(text(pledge, "proposal_id")) ?? "Untitled proposal",
      hours: numberValue(pledge, "hours"),
      reservedCredits: numberValue(pledge, "reserved_credits"),
      status: text(pledge, "status"),
      createdAt: text(pledge, "created_at"),
    })),
  };
}

export async function getBudgetOverview(userId: string): Promise<BudgetOverviewDto | null> {
  const supabase = await createClient();
  const workspace = await getCurrentWorkspace(userId);

  if (!workspace.organization) {
    return null;
  }

  const { data: walletData } = await supabase
    .from("wallets")
    .select("*")
    .eq("organization_id", workspace.organization.id)
    .maybeSingle();

  if (!isRecord(walletData)) {
    return null;
  }

  const { data: ledgerData } = await supabase
    .from("wallet_ledger_entries")
    .select("*")
    .eq("wallet_id", text(walletData, "id"))
    .order("created_at", { ascending: false });

  const balanceCredits = numberValue(walletData, "balance_credits");
  const reservedCredits = numberValue(walletData, "reserved_credits");

  return {
    wallet: {
      id: text(walletData, "id"),
      balanceCredits,
      reservedCredits,
      availableCredits: getAvailableCredits({ balance: balanceCredits, reserved: reservedCredits }),
    },
    ledger: rows(ledgerData).map((row) => ({
      id: text(row, "id"),
      entryType: text(row, "entry_type"),
      amountCredits: numberValue(row, "amount_credits"),
      balanceAfter: numberValue(row, "balance_after"),
      reservedAfter: numberValue(row, "reserved_after"),
      memo: text(row, "memo"),
      createdAt: text(row, "created_at"),
    })),
  };
}
