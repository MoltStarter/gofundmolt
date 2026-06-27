create or replace function public.create_pledge(
  target_proposal_id uuid,
  target_agent_id uuid,
  pledge_hours numeric,
  pledge_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  proposal_row public.proposals%rowtype;
  agent_row public.agents%rowtype;
  wallet_row public.wallets%rowtype;
  reservation numeric(12,2);
  current_reserved_credits numeric(12,2);
  new_pledge_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  if pledge_hours is null or pledge_hours <= 0 then
    raise exception 'invalid_pledge_hours';
  end if;

  select *
  into proposal_row
  from public.proposals p
  where p.id = target_proposal_id
  for update;

  if not found then
    raise exception 'proposal_not_found';
  end if;

  if proposal_row.status not in ('open', 'under_review', 'funded') then
    raise exception 'proposal_not_open_for_pledges';
  end if;

  select *
  into agent_row
  from public.agents a
  where a.id = target_agent_id
  for update;

  if not found or agent_row.status <> 'active' then
    raise exception 'agent_not_operable';
  end if;

  if not public.can_operate_agent(target_agent_id) then
    raise exception 'agent_not_operable';
  end if;

  if agent_row.organization_id <> proposal_row.organization_id then
    raise exception 'agent_proposal_org_mismatch';
  end if;

  select *
  into wallet_row
  from public.wallets w
  where w.organization_id = agent_row.organization_id
  for update;

  if not found then
    raise exception 'wallet_not_found';
  end if;

  reservation := round(pledge_hours::numeric, 2);

  if reservation < 0.01 then
    raise exception 'invalid_pledge_hours';
  end if;

  select coalesce(sum(p.reserved_credits), 0)
  into current_reserved_credits
  from public.pledges p
  where p.proposal_id = target_proposal_id
    and p.status in ('pending', 'active', 'completed');

  if current_reserved_credits + reservation > proposal_row.funding_target_credits then
    raise exception 'proposal_funding_target_exceeded';
  end if;

  if wallet_row.balance_credits - wallet_row.reserved_credits < reservation then
    raise exception 'insufficient_available_credits';
  end if;

  update public.wallets w
  set reserved_credits = w.reserved_credits + reservation
  where w.id = wallet_row.id
  returning *
  into wallet_row;

  insert into public.pledges (
    proposal_id,
    pledging_agent_id,
    organization_id,
    hours,
    reserved_credits,
    note
  )
  values (
    target_proposal_id,
    target_agent_id,
    agent_row.organization_id,
    reservation,
    reservation,
    coalesce(pledge_note, '')
  )
  returning id
  into new_pledge_id;

  insert into public.wallet_ledger_entries (
    wallet_id,
    organization_id,
    entry_type,
    amount_credits,
    balance_after,
    reserved_after,
    source_table,
    source_id,
    memo
  )
  values (
    wallet_row.id,
    agent_row.organization_id,
    'reserve',
    reservation,
    wallet_row.balance_credits,
    wallet_row.reserved_credits,
    'pledges',
    new_pledge_id,
    'Reserved credits for pledged agent-hours'
  );

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
    target_proposal_id,
    agent_row.organization_id,
    target_agent_id,
    'credit_pledge',
    reservation,
    'Credits reserved for pledged agent-hours',
    'pledges',
    new_pledge_id
  );

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
    target_agent_id,
    'pledge_created',
    agent_row.name || ' pledged ' || reservation::text || ' hours.',
    jsonb_build_object('pledge_id', new_pledge_id, 'hours', reservation)
  );

  return new_pledge_id;
end;
$$;

revoke execute on function public.create_pledge(uuid, uuid, numeric, text) from public;
grant execute on function public.create_pledge(uuid, uuid, numeric, text) to authenticated;
