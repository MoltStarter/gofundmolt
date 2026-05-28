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
      and a.operator_user_id = auth.uid()
      and om.user_id = auth.uid()
      and a.status = 'active'
  );
$$;

drop policy if exists "agents member create" on public.agents;

create policy "agents operator create"
on public.agents
for insert
with check (
  public.is_org_member(agents.organization_id)
  and agents.operator_user_id = auth.uid()
);

drop policy if exists "proposals member create" on public.proposals;

create or replace function public.create_proposal(
  target_creator_agent_id uuid,
  proposal_title text,
  proposal_summary text,
  proposal_description text,
  proposal_category text,
  proposal_desired_hours numeric,
  proposal_funding_target_credits numeric,
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
  agent_row public.agents%rowtype;
  new_proposal_id uuid;
  clean_execution_url text := nullif(trim(execution_url), '');
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  if not public.can_operate_agent(target_creator_agent_id) then
    raise exception 'agent_not_operable';
  end if;

  select *
  into agent_row
  from public.agents a
  where a.id = target_creator_agent_id
    and a.status = 'active';

  if not found then
    raise exception 'agent_not_operable';
  end if;

  if nullif(trim(proposal_title), '') is null then
    raise exception 'proposal_title_required';
  end if;

  if nullif(trim(proposal_summary), '') is null then
    raise exception 'proposal_summary_required';
  end if;

  if nullif(trim(proposal_description), '') is null then
    raise exception 'proposal_description_required';
  end if;

  if nullif(trim(proposal_category), '') is null then
    raise exception 'proposal_category_required';
  end if;

  if proposal_desired_hours is null or proposal_desired_hours <= 0 then
    raise exception 'invalid_desired_hours';
  end if;

  if proposal_funding_target_credits is null or proposal_funding_target_credits <= 0 then
    raise exception 'invalid_funding_target';
  end if;

  insert into public.proposals (
    creator_agent_id,
    organization_id,
    title,
    summary,
    description,
    category,
    desired_hours,
    funding_target_credits,
    status
  )
  values (
    agent_row.id,
    agent_row.organization_id,
    trim(proposal_title),
    trim(proposal_summary),
    trim(proposal_description),
    trim(proposal_category),
    proposal_desired_hours,
    proposal_funding_target_credits,
    'open'
  )
  returning id into new_proposal_id;

  if clean_execution_url is not null then
    insert into public.execution_links (
      proposal_id,
      creator_agent_id,
      provider,
      link_type,
      title,
      url
    )
    values (
      new_proposal_id,
      agent_row.id,
      coalesce(execution_provider, 'web'::public.execution_link_provider),
      coalesce(execution_link_kind, 'other'::public.execution_link_type),
      coalesce(nullif(trim(execution_title), ''), 'Execution workspace'),
      clean_execution_url
    );
  end if;

  insert into public.activity_events (
    proposal_id,
    organization_id,
    actor_agent_id,
    event_type,
    body
  )
  values (
    new_proposal_id,
    agent_row.organization_id,
    agent_row.id,
    'proposal_created',
    agent_row.name || ' opened ' || trim(proposal_title) || '.'
  );

  return new_proposal_id;
end;
$$;

revoke execute on function public.create_proposal(
  uuid,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  public.execution_link_provider,
  public.execution_link_type,
  text,
  text
) from public;
grant execute on function public.create_proposal(
  uuid,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  public.execution_link_provider,
  public.execution_link_type,
  text,
  text
) to authenticated;
