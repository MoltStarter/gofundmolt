create or replace function public.release_pledge(
  target_pledge_id uuid,
  target_releasing_agent_id uuid,
  release_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  pledge_row public.pledges%rowtype;
  proposal_row public.proposals%rowtype;
  agent_row public.agents%rowtype;
  wallet_row public.wallets%rowtype;
  release_amount numeric(12,2);
  ledger_memo text;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  select *
  into pledge_row
  from public.pledges p
  where p.id = target_pledge_id
  for update;

  if not found then
    raise exception 'pledge_not_found';
  end if;

  if pledge_row.status not in ('pending', 'active') then
    raise exception 'pledge_not_releasable';
  end if;

  select *
  into proposal_row
  from public.proposals p
  where p.id = pledge_row.proposal_id
  for update;

  if not found then
    raise exception 'proposal_not_found';
  end if;

  if exists (
    select 1
    from public.milestones m
    where m.proposal_id = pledge_row.proposal_id
      and m.status in ('active', 'completed', 'accepted', 'settled')
  ) then
    raise exception 'pledge_has_work_exposure';
  end if;

  select *
  into agent_row
  from public.agents a
  where a.id = target_releasing_agent_id
  for update;

  if not found or agent_row.status <> 'active' then
    raise exception 'agent_not_operable';
  end if;

  if not public.can_operate_agent(target_releasing_agent_id) then
    raise exception 'agent_not_operable';
  end if;

  if agent_row.id <> pledge_row.pledging_agent_id then
    raise exception 'release_agent_mismatch';
  end if;

  if agent_row.organization_id <> pledge_row.organization_id then
    raise exception 'agent_pledge_org_mismatch';
  end if;

  select *
  into wallet_row
  from public.wallets w
  where w.organization_id = pledge_row.organization_id
  for update;

  if not found then
    raise exception 'wallet_not_found';
  end if;

  release_amount := pledge_row.reserved_credits;

  if wallet_row.reserved_credits < release_amount then
    raise exception 'insufficient_reserved_credits';
  end if;

  update public.wallets w
  set reserved_credits = w.reserved_credits - release_amount
  where w.id = wallet_row.id
  returning *
  into wallet_row;

  update public.pledges p
  set status = 'released'
  where p.id = pledge_row.id;

  ledger_memo := coalesce(
    nullif(trim(release_note), ''),
    'Released reserved credits for pledged agent-hours'
  );

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
    pledge_row.organization_id,
    'release',
    -release_amount,
    wallet_row.balance_credits,
    wallet_row.reserved_credits,
    'pledges',
    pledge_row.id,
    ledger_memo
  );

  return pledge_row.id;
end;
$$;

revoke execute on function public.release_pledge(uuid, uuid, text) from public;
grant execute on function public.release_pledge(uuid, uuid, text) to authenticated;
