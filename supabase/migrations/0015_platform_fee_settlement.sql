alter type public.wallet_entry_type add value if not exists 'platform_fee';

alter table public.milestones
  add column if not exists net_settlement_credits numeric(12,2),
  add column if not exists platform_fee_credits numeric(12,2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'milestones_net_settlement_credits_positive'
  ) then
    alter table public.milestones
      add constraint milestones_net_settlement_credits_positive
      check (net_settlement_credits is null or net_settlement_credits > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'milestones_platform_fee_credits_nonnegative'
  ) then
    alter table public.milestones
      add constraint milestones_platform_fee_credits_nonnegative
      check (platform_fee_credits is null or platform_fee_credits >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'milestones_settlement_split_consistent'
  ) then
    alter table public.milestones
      add constraint milestones_settlement_split_consistent
      check (
        settled_at is null
        or (
          net_settlement_credits is not null
          and platform_fee_credits is not null
          and settled_credits = net_settlement_credits + platform_fee_credits
        )
      );
  end if;
end;
$$;

create or replace function public.settle_accepted_milestone(
  target_milestone_id uuid,
  target_settling_agent_id uuid,
  settlement_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  milestone_row public.milestones%rowtype;
  proposal_row public.proposals%rowtype;
  settling_agent_row public.agents%rowtype;
  claiming_agent_row public.agents%rowtype;
  wallet_row public.wallets%rowtype;
  clean_note text := trim(coalesce(settlement_note, ''));
  settlement_amount numeric(12,2);
  platform_fee_bps integer := 500;
  platform_fee_amount numeric(12,2);
  net_settlement_amount numeric(12,2);
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  if length(clean_note) > 1200 then
    raise exception 'settlement_note_too_long';
  end if;

  select *
  into milestone_row
  from public.milestones m
  where m.id = target_milestone_id
  for update;

  if not found then
    raise exception 'milestone_not_found';
  end if;

  if milestone_row.status <> 'accepted' then
    if milestone_row.settled_at is not null or milestone_row.status = 'settled' then
      raise exception 'milestone_already_settled';
    end if;

    raise exception 'milestone_not_settlement_ready';
  end if;

  if milestone_row.accepted_agent_id is null or milestone_row.accepted_at is null then
    raise exception 'milestone_acceptance_required';
  end if;

  if milestone_row.claimed_agent_id is null then
    raise exception 'milestone_not_claimed';
  end if;

  if milestone_row.settled_at is not null then
    raise exception 'milestone_already_settled';
  end if;

  settlement_amount := round(milestone_row.target_hours::numeric, 2);
  platform_fee_amount := round((settlement_amount * platform_fee_bps) / 10000, 2);
  net_settlement_amount := settlement_amount - platform_fee_amount;

  if settlement_amount < 0.01 or net_settlement_amount <= 0 then
    raise exception 'invalid_settlement_amount';
  end if;

  select *
  into proposal_row
  from public.proposals p
  where p.id = milestone_row.proposal_id
  for update;

  if not found then
    raise exception 'proposal_not_found';
  end if;

  if proposal_row.status not in ('open', 'under_review', 'funded', 'in_progress', 'shipped', 'launch_ready') then
    raise exception 'proposal_not_open_for_settlement';
  end if;

  select *
  into settling_agent_row
  from public.agents a
  where a.id = target_settling_agent_id
  for update;

  if not found or settling_agent_row.status <> 'active' then
    raise exception 'agent_not_operable';
  end if;

  if not public.can_operate_agent(target_settling_agent_id) then
    raise exception 'agent_not_operable';
  end if;

  if settling_agent_row.organization_id <> proposal_row.organization_id then
    raise exception 'agent_proposal_org_mismatch';
  end if;

  select *
  into claiming_agent_row
  from public.agents a
  where a.id = milestone_row.claimed_agent_id;

  if not found or claiming_agent_row.organization_id <> proposal_row.organization_id then
    raise exception 'claiming_agent_proposal_org_mismatch';
  end if;

  select *
  into wallet_row
  from public.wallets w
  where w.organization_id = proposal_row.organization_id
  for update;

  if not found then
    raise exception 'wallet_not_found';
  end if;

  if wallet_row.reserved_credits < settlement_amount or wallet_row.balance_credits < settlement_amount then
    raise exception 'insufficient_reserved_credits';
  end if;

  update public.wallets w
  set
    balance_credits = w.balance_credits - net_settlement_amount,
    reserved_credits = w.reserved_credits - net_settlement_amount
  where w.id = wallet_row.id
  returning *
  into wallet_row;

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
    proposal_row.organization_id,
    'settle',
    -net_settlement_amount,
    wallet_row.balance_credits,
    wallet_row.reserved_credits,
    'milestones',
    target_milestone_id,
    'Net settlement for accepted agent work: ' || milestone_row.title
  );

  if platform_fee_amount > 0 then
    update public.wallets w
    set
      balance_credits = w.balance_credits - platform_fee_amount,
      reserved_credits = w.reserved_credits - platform_fee_amount
    where w.id = wallet_row.id
    returning *
    into wallet_row;

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
      proposal_row.organization_id,
      'platform_fee',
      -platform_fee_amount,
      wallet_row.balance_credits,
      wallet_row.reserved_credits,
      'milestones',
      target_milestone_id,
      'Platform fee for accepted agent work: ' || milestone_row.title
    );
  end if;

  update public.milestones
  set
    status = 'settled',
    settled_agent_id = target_settling_agent_id,
    settled_at = now(),
    settled_credits = settlement_amount,
    net_settlement_credits = net_settlement_amount,
    platform_fee_credits = platform_fee_amount,
    settlement_note = clean_note
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
    target_settling_agent_id,
    'milestone_settled',
    settling_agent_row.name || ' settled ' || net_settlement_amount::text || ' net credits for "' || milestone_row.title || '" to ' || claiming_agent_row.name || ' with ' || platform_fee_amount::text || ' credits in platform fees.',
    jsonb_build_object(
      'milestone_id', target_milestone_id,
      'claimed_agent_id', milestone_row.claimed_agent_id,
      'settlement_credits', settlement_amount,
      'net_settlement_credits', net_settlement_amount,
      'platform_fee_credits', platform_fee_amount,
      'platform_fee_bps', platform_fee_bps
    )
  );

  return target_milestone_id;
end;
$$;

revoke execute on function public.settle_accepted_milestone(uuid, uuid, text) from public;
grant execute on function public.settle_accepted_milestone(uuid, uuid, text) to authenticated;
