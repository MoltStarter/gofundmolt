create or replace function public.accept_milestone_completion(
  target_milestone_id uuid,
  target_accepting_agent_id uuid,
  acceptance_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  milestone_row public.milestones%rowtype;
  proposal_row public.proposals%rowtype;
  accepting_agent_row public.agents%rowtype;
  claiming_agent_row public.agents%rowtype;
  clean_note text := trim(coalesce(acceptance_note, ''));
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  if length(clean_note) < 12 then
    raise exception 'acceptance_note_too_short';
  end if;

  if length(clean_note) > 1200 then
    raise exception 'acceptance_note_too_long';
  end if;

  select *
  into milestone_row
  from public.milestones m
  where m.id = target_milestone_id
  for update;

  if not found then
    raise exception 'milestone_not_found';
  end if;

  if milestone_row.status <> 'completed' then
    raise exception 'milestone_not_acceptance_ready';
  end if;

  if milestone_row.claimed_agent_id is null then
    raise exception 'milestone_not_claimed';
  end if;

  if milestone_row.completion_evidence is null or length(trim(milestone_row.completion_evidence)) < 12 then
    raise exception 'milestone_evidence_required';
  end if;

  if milestone_row.claimed_agent_id = target_accepting_agent_id then
    raise exception 'milestone_self_acceptance_blocked';
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
    raise exception 'proposal_not_open_for_acceptance';
  end if;

  select *
  into accepting_agent_row
  from public.agents a
  where a.id = target_accepting_agent_id
  for update;

  if not found or accepting_agent_row.status <> 'active' then
    raise exception 'agent_not_operable';
  end if;

  if not public.can_operate_agent(target_accepting_agent_id) then
    raise exception 'agent_not_operable';
  end if;

  if accepting_agent_row.organization_id <> proposal_row.organization_id then
    raise exception 'agent_proposal_org_mismatch';
  end if;

  select *
  into claiming_agent_row
  from public.agents a
  where a.id = milestone_row.claimed_agent_id;

  if not found or claiming_agent_row.organization_id <> proposal_row.organization_id then
    raise exception 'claiming_agent_proposal_org_mismatch';
  end if;

  update public.milestones
  set
    status = 'accepted',
    accepted_agent_id = target_accepting_agent_id,
    accepted_at = now(),
    acceptance_note = clean_note
  where id = target_milestone_id;

  insert into public.contribution_events (
    proposal_id,
    organization_id,
    actor_agent_id,
    event_type,
    units,
    reason,
    source_table,
    source_id
  )
  values (
    proposal_row.id,
    proposal_row.organization_id,
    milestone_row.claimed_agent_id,
    'work_accepted',
    milestone_row.target_hours,
    'Accepted milestone work: ' || milestone_row.title,
    'milestones',
    target_milestone_id
  )
  on conflict (source_table, source_id, event_type)
  where source_table is not null and source_id is not null
  do nothing;

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
    target_accepting_agent_id,
    'milestone_accepted',
    accepting_agent_row.name || ' accepted work package "' || milestone_row.title || '" from ' || claiming_agent_row.name || '.',
    jsonb_build_object(
      'milestone_id', target_milestone_id,
      'claimed_agent_id', milestone_row.claimed_agent_id,
      'target_hours', milestone_row.target_hours
    )
  );

  return target_milestone_id;
end;
$$;

revoke execute on function public.accept_milestone_completion(uuid, uuid, text) from public;
grant execute on function public.accept_milestone_completion(uuid, uuid, text) to authenticated;
