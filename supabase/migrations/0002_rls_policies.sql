create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.can_operate_agent(target_agent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agents a
    join public.organization_members om on om.organization_id = a.organization_id
    where a.id = target_agent_id
      and om.user_id = auth.uid()
      and a.status = 'active'
  );
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.agents enable row level security;
alter table public.wallets enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_reviews enable row level security;
alter table public.pledges enable row level security;
alter table public.milestones enable row level security;
alter table public.wallet_ledger_entries enable row level security;
alter table public.contribution_events enable row level security;
alter table public.execution_links enable row level security;
alter table public.project_reward_policies enable row level security;
alter table public.allocation_snapshots enable row level security;
alter table public.activity_events enable row level security;

create policy "profiles own read"
on public.profiles
for select
using (profiles.id = auth.uid());

create policy "profiles own insert"
on public.profiles
for insert
with check (profiles.id = auth.uid());

create policy "profiles own update"
on public.profiles
for update
using (profiles.id = auth.uid())
with check (profiles.id = auth.uid());

create policy "organizations member read"
on public.organizations
for select
using (public.is_org_member(organizations.id));

create policy "organizations authenticated create"
on public.organizations
for insert
with check (auth.uid() = organizations.created_by);

create policy "organizations owner/admin update"
on public.organizations
for update
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organizations.id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organizations.id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
  )
);

create policy "organization members same-org read"
on public.organization_members
for select
using (public.is_org_member(organization_members.organization_id));

create policy "organization members owner/admin insert"
on public.organization_members
for insert
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organization_members.organization_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
  )
);

create policy "agents member read"
on public.agents
for select
using (public.is_org_member(agents.organization_id));

create policy "agents member create"
on public.agents
for insert
with check (public.is_org_member(agents.organization_id));

create policy "agents operator update"
on public.agents
for update
using (public.can_operate_agent(agents.id))
with check (public.can_operate_agent(agents.id));

create policy "wallets member read"
on public.wallets
for select
using (public.is_org_member(wallets.organization_id));

create policy "proposals member read"
on public.proposals
for select
using (public.is_org_member(proposals.organization_id));

create policy "proposals member create"
on public.proposals
for insert
with check (
  public.can_operate_agent(proposals.creator_agent_id)
  and public.is_org_member(proposals.organization_id)
);

create policy "proposals member update"
on public.proposals
for update
using (public.is_org_member(proposals.organization_id))
with check (public.is_org_member(proposals.organization_id));

create policy "reviews member read"
on public.proposal_reviews
for select
using (
  exists (
    select 1
    from public.proposals p
    where p.id = proposal_reviews.proposal_id
      and public.is_org_member(p.organization_id)
  )
);

create policy "reviews member create"
on public.proposal_reviews
for insert
with check (
  public.can_operate_agent(proposal_reviews.reviewer_agent_id)
  and exists (
    select 1
    from public.proposals p
    where p.id = proposal_reviews.proposal_id
      and public.is_org_member(p.organization_id)
  )
);

create policy "pledges member read"
on public.pledges
for select
using (public.is_org_member(pledges.organization_id));

create policy "milestones member read"
on public.milestones
for select
using (
  exists (
    select 1
    from public.proposals p
    where p.id = milestones.proposal_id
      and public.is_org_member(p.organization_id)
  )
);

create policy "milestones member create"
on public.milestones
for insert
with check (
  exists (
    select 1
    from public.proposals p
    where p.id = milestones.proposal_id
      and public.is_org_member(p.organization_id)
  )
);

create policy "wallet ledger member read"
on public.wallet_ledger_entries
for select
using (public.is_org_member(wallet_ledger_entries.organization_id));

create policy "contributions member read"
on public.contribution_events
for select
using (public.is_org_member(contribution_events.organization_id));

create policy "execution links member read"
on public.execution_links
for select
using (
  exists (
    select 1
    from public.proposals p
    where p.id = execution_links.proposal_id
      and public.is_org_member(p.organization_id)
  )
);

create policy "execution links member create"
on public.execution_links
for insert
with check (
  exists (
    select 1
    from public.proposals p
    where p.id = execution_links.proposal_id
      and public.is_org_member(p.organization_id)
  )
  and (
    execution_links.creator_agent_id is null
    or public.can_operate_agent(execution_links.creator_agent_id)
  )
);

create policy "reward policies member read"
on public.project_reward_policies
for select
using (
  exists (
    select 1
    from public.proposals p
    where p.id = project_reward_policies.proposal_id
      and public.is_org_member(p.organization_id)
  )
);

create policy "allocation snapshots member read"
on public.allocation_snapshots
for select
using (
  exists (
    select 1
    from public.proposals p
    where p.id = allocation_snapshots.proposal_id
      and public.is_org_member(p.organization_id)
  )
);

create policy "activity member read"
on public.activity_events
for select
using (
  activity_events.organization_id is not null
  and public.is_org_member(activity_events.organization_id)
);
