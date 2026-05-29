alter table public.agents
  add column if not exists reserved_owner_hours numeric(10,2) not null default 0,
  add column if not exists credit_rate_per_hour numeric(10,2) not null default 20,
  add column if not exists benchmark_score numeric(5,2) not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'agents_reserved_owner_hours_valid'
  ) then
    alter table public.agents
      add constraint agents_reserved_owner_hours_valid
      check (reserved_owner_hours >= 0 and reserved_owner_hours <= weekly_hour_capacity);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'agents_credit_rate_per_hour_nonnegative'
  ) then
    alter table public.agents
      add constraint agents_credit_rate_per_hour_nonnegative
      check (credit_rate_per_hour >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'agents_benchmark_score_range'
  ) then
    alter table public.agents
      add constraint agents_benchmark_score_range
      check (benchmark_score >= 0 and benchmark_score <= 100);
  end if;
end;
$$;

create or replace function public.claim_milestone(
  target_milestone_id uuid,
  target_claiming_agent_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  milestone_row public.milestones%rowtype;
  proposal_row public.proposals%rowtype;
  agent_row public.agents%rowtype;
  active_market_hours numeric(10,2);
  surplus_market_hours numeric(10,2);
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  select *
  into milestone_row
  from public.milestones m
  where m.id = target_milestone_id
  for update;

  if not found then
    raise exception 'milestone_not_found';
  end if;

  if milestone_row.status <> 'planned' then
    raise exception 'milestone_not_claimable';
  end if;

  if milestone_row.claimed_agent_id is not null or milestone_row.claimed_at is not null then
    raise exception 'milestone_already_claimed';
  end if;

  select *
  into proposal_row
  from public.proposals p
  where p.id = milestone_row.proposal_id
  for update;

  if not found then
    raise exception 'proposal_not_found';
  end if;

  if proposal_row.status not in ('open', 'under_review', 'funded', 'in_progress') then
    raise exception 'proposal_not_open_for_claims';
  end if;

  select *
  into agent_row
  from public.agents a
  where a.id = target_claiming_agent_id
  for update;

  if not found or agent_row.status <> 'active' then
    raise exception 'agent_not_operable';
  end if;

  if not public.can_operate_agent(target_claiming_agent_id) then
    raise exception 'agent_not_operable';
  end if;

  if agent_row.organization_id <> proposal_row.organization_id then
    raise exception 'agent_proposal_org_mismatch';
  end if;

  select coalesce(sum(m.target_hours), 0)
  into active_market_hours
  from public.milestones m
  where m.claimed_agent_id = target_claiming_agent_id
    and m.status = 'active';

  surplus_market_hours := greatest(
    agent_row.weekly_hour_capacity - agent_row.reserved_owner_hours - active_market_hours,
    0
  );

  if milestone_row.target_hours > surplus_market_hours then
    raise exception 'agent_surplus_capacity_exceeded';
  end if;

  update public.milestones
  set
    status = 'active',
    claimed_agent_id = target_claiming_agent_id,
    claimed_at = now()
  where id = target_milestone_id;

  insert into public.activity_events (
    proposal_id,
    organization_id,
    actor_agent_id,
    event_type,
    body,
    metadata
  )
  values (
    proposal_row.id,
    proposal_row.organization_id,
    target_claiming_agent_id,
    'milestone_claimed',
    agent_row.name || ' claimed work package "' || milestone_row.title || '" for ' || milestone_row.target_hours::text || ' hours.',
    jsonb_build_object(
      'milestone_id', target_milestone_id,
      'target_hours', milestone_row.target_hours,
      'surplus_hours_before_claim', surplus_market_hours
    )
  );

  return target_milestone_id;
end;
$$;

revoke execute on function public.claim_milestone(uuid, uuid) from public;
grant execute on function public.claim_milestone(uuid, uuid) to authenticated;
