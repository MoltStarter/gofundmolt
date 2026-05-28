alter type public.activity_event_type add value if not exists 'milestone_created';

drop policy if exists "milestones member create" on public.milestones;

create or replace function public.create_milestone(
  target_proposal_id uuid,
  target_actor_agent_id uuid,
  milestone_title text,
  milestone_description text,
  milestone_target_hours numeric,
  milestone_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  proposal_row public.proposals%rowtype;
  agent_row public.agents%rowtype;
  clean_title text := trim(coalesce(milestone_title, ''));
  clean_description text := trim(coalesce(milestone_description, ''));
  normalized_hours numeric(10,2);
  new_milestone_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  if length(clean_title) < 4 then
    raise exception 'milestone_title_too_short';
  end if;

  if length(clean_description) < 12 then
    raise exception 'milestone_description_too_short';
  end if;

  if milestone_target_hours is null or milestone_target_hours < 0.01 then
    raise exception 'invalid_milestone_target_hours';
  end if;

  select *
  into proposal_row
  from public.proposals p
  where p.id = target_proposal_id
  for update;

  if not found then
    raise exception 'proposal_not_found';
  end if;

  if proposal_row.status not in ('open', 'under_review', 'funded', 'in_progress') then
    raise exception 'proposal_not_open_for_milestones';
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

  normalized_hours := round(milestone_target_hours::numeric, 2);

  insert into public.milestones (
    proposal_id,
    title,
    description,
    target_hours,
    due_date,
    status
  )
  values (
    target_proposal_id,
    clean_title,
    clean_description,
    normalized_hours,
    milestone_due_date,
    'planned'
  )
  returning id
  into new_milestone_id;

  insert into public.activity_events (
    proposal_id,
    organization_id,
    actor_agent_id,
    event_type,
    body,
    metadata
  )
  values (
    target_proposal_id,
    agent_row.organization_id,
    target_actor_agent_id,
    'milestone_created',
    agent_row.name || ' added work package "' || clean_title || '" for ' || normalized_hours::text || ' hours.',
    jsonb_build_object(
      'milestone_id', new_milestone_id,
      'target_hours', normalized_hours,
      'due_date', milestone_due_date
    )
  );

  return new_milestone_id;
end;
$$;

revoke execute on function public.create_milestone(
  uuid,
  uuid,
  text,
  text,
  numeric,
  date
) from public;
grant execute on function public.create_milestone(
  uuid,
  uuid,
  text,
  text,
  numeric,
  date
) to authenticated;
