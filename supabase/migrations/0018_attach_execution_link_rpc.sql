alter type public.activity_event_type add value if not exists 'execution_link_attached';

drop policy if exists "execution links member create" on public.execution_links;

create or replace function public.attach_execution_link(
  target_proposal_id uuid,
  target_milestone_id uuid,
  target_actor_agent_id uuid,
  execution_provider public.execution_link_provider,
  execution_link_kind public.execution_link_type,
  execution_title text,
  execution_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  proposal_row public.proposals%rowtype;
  milestone_row public.milestones%rowtype;
  agent_row public.agents%rowtype;
  clean_title text := trim(coalesce(execution_title, ''));
  clean_url text := trim(coalesce(execution_url, ''));
  new_execution_link_id uuid;
  display_link_kind text;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  if clean_title = '' then
    raise exception 'execution_title_required';
  end if;

  if length(clean_title) > 140 then
    raise exception 'execution_title_too_long';
  end if;

  if clean_url = '' then
    raise exception 'execution_url_required';
  end if;

  if clean_url !~ '^https?://[^[:space:]/?#]+' then
    raise exception 'invalid_execution_url';
  end if;

  select *
  into proposal_row
  from public.proposals p
  where p.id = target_proposal_id
  for update;

  if not found then
    raise exception 'proposal_not_found';
  end if;

  if proposal_row.status = 'archived' then
    raise exception 'proposal_not_open_for_execution_links';
  end if;

  if target_milestone_id is not null then
    select *
    into milestone_row
    from public.milestones m
    where m.id = target_milestone_id
      and m.proposal_id = target_proposal_id
    for update;

    if not found then
      raise exception 'milestone_not_found';
    end if;
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

  insert into public.execution_links (
    proposal_id,
    milestone_id,
    creator_agent_id,
    provider,
    link_type,
    title,
    url
  )
  values (
    target_proposal_id,
    target_milestone_id,
    target_actor_agent_id,
    coalesce(execution_provider, 'web'::public.execution_link_provider),
    coalesce(execution_link_kind, 'other'::public.execution_link_type),
    clean_title,
    clean_url
  )
  returning id
  into new_execution_link_id;

  display_link_kind := replace(coalesce(execution_link_kind, 'other'::public.execution_link_type)::text, '_', ' ');

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
    proposal_row.organization_id,
    target_actor_agent_id,
    'execution_link_attached',
    agent_row.name || ' attached ' || display_link_kind || ' "' || clean_title || '".',
    jsonb_build_object(
      'execution_link_id', new_execution_link_id,
      'milestone_id', target_milestone_id,
      'provider', coalesce(execution_provider, 'web'::public.execution_link_provider),
      'link_type', coalesce(execution_link_kind, 'other'::public.execution_link_type),
      'url', clean_url
    )
  );

  return new_execution_link_id;
end;
$$;

revoke execute on function public.attach_execution_link(
  uuid,
  uuid,
  uuid,
  public.execution_link_provider,
  public.execution_link_type,
  text,
  text
) from public;
grant execute on function public.attach_execution_link(
  uuid,
  uuid,
  uuid,
  public.execution_link_provider,
  public.execution_link_type,
  text,
  text
) to authenticated;
