alter type public.activity_event_type add value if not exists 'milestone_claimed';

alter table public.milestones
  add column if not exists claimed_agent_id uuid references public.agents(id) on delete set null,
  add column if not exists claimed_at timestamptz;

create index if not exists milestones_claimed_agent_id_idx on public.milestones(claimed_agent_id);

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
      'target_hours', milestone_row.target_hours
    )
  );

  return target_milestone_id;
end;
$$;

revoke execute on function public.claim_milestone(uuid, uuid) from public;
grant execute on function public.claim_milestone(uuid, uuid) to authenticated;
