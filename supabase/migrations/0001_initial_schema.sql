create extension if not exists pgcrypto;

create type member_role as enum ('owner', 'admin', 'member');
create type agent_status as enum ('active', 'paused', 'archived');
create type proposal_status as enum ('draft', 'open', 'under_review', 'funded', 'in_progress', 'shipped', 'launch_ready', 'archived');
create type review_stance as enum ('support', 'concern', 'block');
create type pledge_status as enum ('pending', 'active', 'completed', 'released', 'cancelled');
create type milestone_status as enum ('planned', 'active', 'completed', 'cancelled');
create type wallet_entry_type as enum ('seed', 'reserve', 'release', 'settle', 'adjustment');
create type contribution_event_type as enum ('credit_pledge', 'work_accepted', 'review_accepted', 'milestone_completed', 'manual_adjustment');
create type activity_event_type as enum ('proposal_created', 'review_created', 'pledge_created', 'milestone_completed', 'proposal_status_changed', 'contribution_recorded');
create type execution_link_provider as enum ('github', 'web');
create type execution_link_type as enum ('repository', 'issue', 'pull_request', 'discussion', 'release', 'demo', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  display_name text not null,
  avatar_url text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle is null or handle ~ '^[a-z0-9-]{3,32}$')
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9-]{3,64}$')
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operator_user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  handle text not null unique,
  bio text not null default '',
  skills text[] not null default '{}',
  weekly_hour_capacity numeric(10,2) not null default 10,
  reputation_score numeric(10,2) not null default 0,
  status agent_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agents_handle_format check (handle ~ '^[a-z0-9-]{3,32}$'),
  constraint agents_capacity_positive check (weekly_hour_capacity >= 0),
  constraint agents_id_organization_unique unique (id, organization_id)
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  balance_credits numeric(12,2) not null default 0,
  reserved_credits numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallets_nonnegative_balance check (balance_credits >= 0),
  constraint wallets_nonnegative_reserved check (reserved_credits >= 0),
  constraint wallets_reserved_lte_balance check (reserved_credits <= balance_credits),
  constraint wallets_id_organization_unique unique (id, organization_id)
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  creator_agent_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  summary text not null,
  description text not null,
  category text not null,
  desired_hours numeric(10,2) not null,
  funding_target_credits numeric(12,2) not null,
  status proposal_status not null default 'open',
  launch_ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposals_desired_hours_positive check (desired_hours > 0),
  constraint proposals_funding_target_positive check (funding_target_credits > 0),
  constraint proposals_id_organization_unique unique (id, organization_id),
  constraint proposals_creator_agent_org_fk foreign key (creator_agent_id, organization_id) references public.agents(id, organization_id) on delete restrict
);

create table public.proposal_reviews (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  reviewer_agent_id uuid not null references public.agents(id) on delete cascade,
  score integer not null,
  stance review_stance not null,
  comment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposal_reviews_score_range check (score between 1 and 10),
  unique (proposal_id, reviewer_agent_id)
);

create table public.pledges (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null,
  pledging_agent_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  hours numeric(10,2) not null,
  reserved_credits numeric(12,2) not null,
  status pledge_status not null default 'active',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pledges_hours_positive check (hours > 0),
  constraint pledges_reserved_positive check (reserved_credits > 0),
  constraint pledges_proposal_org_fk foreign key (proposal_id, organization_id) references public.proposals(id, organization_id) on delete cascade,
  constraint pledges_agent_org_fk foreign key (pledging_agent_id, organization_id) references public.agents(id, organization_id) on delete cascade
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  title text not null,
  description text not null default '',
  target_hours numeric(10,2) not null default 0,
  due_date date,
  status milestone_status not null default 'planned',
  completion_evidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint milestones_target_hours_nonnegative check (target_hours >= 0),
  constraint milestones_id_proposal_unique unique (id, proposal_id)
);

create table public.execution_links (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  milestone_id uuid,
  creator_agent_id uuid references public.agents(id) on delete set null,
  provider execution_link_provider not null default 'github',
  link_type execution_link_type not null,
  title text not null,
  url text not null,
  created_at timestamptz not null default now(),
  constraint execution_links_http_url check (url ~ '^https?://[^[:space:]/?#]+'),
  constraint execution_links_milestone_proposal_fk foreign key (milestone_id, proposal_id) references public.milestones(id, proposal_id) on delete cascade
);

create table public.wallet_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entry_type wallet_entry_type not null,
  amount_credits numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  reserved_after numeric(12,2) not null,
  source_table text,
  source_id uuid,
  memo text not null default '',
  created_at timestamptz not null default now(),
  constraint wallet_ledger_balance_after_nonnegative check (balance_after >= 0),
  constraint wallet_ledger_reserved_after_nonnegative check (reserved_after >= 0),
  constraint wallet_ledger_wallet_org_fk foreign key (wallet_id, organization_id) references public.wallets(id, organization_id) on delete cascade
);

create table public.contribution_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_agent_id uuid references public.agents(id) on delete set null,
  event_type contribution_event_type not null,
  units numeric(12,2) not null,
  reason text not null,
  source_table text,
  source_id uuid,
  created_at timestamptz not null default now(),
  constraint contribution_events_units_positive check (units > 0),
  constraint contribution_events_proposal_org_fk foreign key (proposal_id, organization_id) references public.proposals(id, organization_id) on delete cascade
);

create table public.project_reward_policies (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references public.proposals(id) on delete cascade,
  credit_weight numeric(8,4) not null default 1,
  work_weight numeric(8,4) not null default 1,
  review_weight numeric(8,4) not null default 0.1,
  policy_note text not null default 'Future token reward policy is informational in V1.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_reward_policies_credit_weight_nonnegative check (credit_weight >= 0),
  constraint project_reward_policies_work_weight_nonnegative check (work_weight >= 0),
  constraint project_reward_policies_review_weight_nonnegative check (review_weight >= 0)
);

create table public.allocation_snapshots (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  snapshot jsonb not null,
  total_units numeric(14,2) not null,
  created_at timestamptz not null default now(),
  constraint allocation_snapshots_total_units_nonnegative check (total_units >= 0),
  constraint allocation_snapshots_snapshot_object check (jsonb_typeof(snapshot) = 'object')
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid,
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_agent_id uuid references public.agents(id) on delete set null,
  event_type activity_event_type not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activity_events_proposal_has_org check (proposal_id is null or organization_id is not null),
  constraint activity_events_actor_has_org check (actor_agent_id is null or organization_id is not null),
  constraint activity_events_proposal_org_fk foreign key (proposal_id, organization_id) references public.proposals(id, organization_id) on delete cascade
);

create index agents_organization_id_idx on public.agents(organization_id);
create index organization_members_user_id_idx on public.organization_members(user_id);
create index proposals_status_created_at_idx on public.proposals(status, created_at desc);
create index proposals_organization_status_created_idx on public.proposals(organization_id, status, created_at desc);
create index proposals_creator_agent_id_idx on public.proposals(creator_agent_id);
create index proposal_reviews_proposal_id_idx on public.proposal_reviews(proposal_id);
create index pledges_proposal_id_idx on public.pledges(proposal_id);
create index pledges_agent_id_idx on public.pledges(pledging_agent_id);
create index milestones_proposal_id_idx on public.milestones(proposal_id);
create index wallet_ledger_organization_created_idx on public.wallet_ledger_entries(organization_id, created_at desc);
create index contribution_events_proposal_created_idx on public.contribution_events(proposal_id, created_at desc);
create index contribution_events_organization_created_idx on public.contribution_events(organization_id, created_at desc);
create index activity_events_proposal_created_idx on public.activity_events(proposal_id, created_at desc);
create index activity_events_organization_created_idx on public.activity_events(organization_id, created_at desc);
create index execution_links_proposal_created_idx on public.execution_links(proposal_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.ensure_proposal_review_org_consistency()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.proposals p
    join public.agents a on a.id = new.reviewer_agent_id
    where p.id = new.proposal_id
      and a.organization_id = p.organization_id
  ) then
    raise exception 'proposal review reviewer must belong to the proposal organization';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_contribution_event_org_consistency()
returns trigger
language plpgsql
as $$
begin
  if new.actor_agent_id is not null and not exists (
    select 1
    from public.agents a
    where a.id = new.actor_agent_id
      and a.organization_id = new.organization_id
  ) then
    raise exception 'contribution event actor must belong to the event organization';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_activity_event_org_consistency()
returns trigger
language plpgsql
as $$
begin
  if new.actor_agent_id is not null and not exists (
    select 1
    from public.agents a
    where a.id = new.actor_agent_id
      and a.organization_id = new.organization_id
  ) then
    raise exception 'activity event actor must belong to the event organization';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_execution_link_org_consistency()
returns trigger
language plpgsql
as $$
begin
  if new.creator_agent_id is not null and not exists (
    select 1
    from public.proposals p
    join public.agents a on a.id = new.creator_agent_id
    where p.id = new.proposal_id
      and a.organization_id = p.organization_id
  ) then
    raise exception 'execution link creator must belong to the proposal organization';
  end if;

  return new;
end;
$$;

create trigger proposal_reviews_org_consistency before insert or update on public.proposal_reviews for each row execute function public.ensure_proposal_review_org_consistency();
create trigger contribution_events_org_consistency before insert or update on public.contribution_events for each row execute function public.ensure_contribution_event_org_consistency();
create trigger activity_events_org_consistency before insert or update on public.activity_events for each row execute function public.ensure_activity_event_org_consistency();
create trigger execution_links_org_consistency before insert or update on public.execution_links for each row execute function public.ensure_execution_link_org_consistency();

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger agents_set_updated_at before update on public.agents for each row execute function public.set_updated_at();
create trigger wallets_set_updated_at before update on public.wallets for each row execute function public.set_updated_at();
create trigger proposals_set_updated_at before update on public.proposals for each row execute function public.set_updated_at();
create trigger proposal_reviews_set_updated_at before update on public.proposal_reviews for each row execute function public.set_updated_at();
create trigger pledges_set_updated_at before update on public.pledges for each row execute function public.set_updated_at();
create trigger milestones_set_updated_at before update on public.milestones for each row execute function public.set_updated_at();
create trigger project_reward_policies_set_updated_at before update on public.project_reward_policies for each row execute function public.set_updated_at();
