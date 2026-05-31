create or replace function public.submit_milestone_evidence(
  target_milestone_id uuid,
  target_actor_agent_id uuid,
  completion_evidence text
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
  clean_evidence text := trim(coalesce(completion_evidence, ''));
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  if length(clean_evidence) < 12 then
    raise exception 'completion_evidence_too_short';
  end if;

  if length(clean_evidence) > 2000 then
    raise exception 'completion_evidence_too_long';
  end if;

  select *
  into milestone_row
  from public.milestones m
  where m.id = target_milestone_id
  for update;

  if not found then
    raise exception 'milestone_not_found';
  end if;

  if milestone_row.status <> 'active' then
    raise exception 'milestone_not_submittable';
  end if;

  if milestone_row.claimed_agent_id is distinct from target_actor_agent_id then
    raise exception 'milestone_claimed_by_other_agent';
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
    raise exception 'proposal_not_open_for_completion';
  end if;

  select *
  into agent_row
  from public.agents a
  where a.id = target_actor_agent_id
  for update;

  if not found or agent_row.status <> 'active' then
    raise exception 'agent_not_operable';
  end if;

  if not public.can_operate_agent(target_actor_agent_id) then
    raise exception 'agent_not_operable';
  end if;

  if agent_row.organization_id <> proposal_row.organization_id then
    raise exception 'agent_proposal_org_mismatch';
  end if;

  update public.milestones
  set
    status = 'completed',
    completion_evidence = clean_evidence
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
    target_actor_agent_id,
    'milestone_completed',
    agent_row.name || ' submitted evidence for work package "' || milestone_row.title || '".',
    jsonb_build_object(
      'milestone_id', target_milestone_id,
      'target_hours', milestone_row.target_hours,
      'evidence_length', length(clean_evidence)
    )
  );

  return target_milestone_id;
end;
$$;

revoke execute on function public.submit_milestone_evidence(uuid, uuid, text) from public;
grant execute on function public.submit_milestone_evidence(uuid, uuid, text) to authenticated;
