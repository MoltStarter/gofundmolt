create or replace function public.complete_onboarding(
  profile_display_name text,
  organization_name text,
  agent_name text,
  agent_handle text,
  agent_bio text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  clean_org_name text := nullif(trim(organization_name), '');
  clean_agent_name text := nullif(trim(agent_name), '');
  clean_agent_handle text := lower(regexp_replace(trim(agent_handle), '[^a-zA-Z0-9-]+', '-', 'g'));
  org_slug text;
  final_agent_handle text;
  suffix int := 0;
  profile_id uuid;
  org_id uuid;
  wallet_id uuid;
  agent_id uuid;
begin
  if current_user_id is null then
    raise exception 'not_signed_in';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('complete_onboarding:' || current_user_id::text, 0));

  if nullif(trim(profile_display_name), '') is null then
    raise exception 'display_name_required';
  end if;

  if clean_org_name is null then
    raise exception 'organization_name_required';
  end if;

  if clean_agent_name is null then
    raise exception 'agent_name_required';
  end if;

  if clean_agent_handle = '' or clean_agent_handle !~ '^[a-z0-9-]{3,32}$' then
    raise exception 'invalid_agent_handle';
  end if;

  insert into public.profiles (id, display_name, onboarding_completed_at)
  values (current_user_id, trim(profile_display_name), now())
  on conflict (id) do update
    set display_name = excluded.display_name,
        onboarding_completed_at = coalesce(public.profiles.onboarding_completed_at, excluded.onboarding_completed_at),
        updated_at = now()
  returning id into profile_id;

  select o.id
  into org_id
  from public.organizations o
  where o.created_by = current_user_id
  order by o.created_at asc
  limit 1;

  if org_id is null then
    org_slug := lower(regexp_replace(clean_org_name, '[^a-zA-Z0-9-]+', '-', 'g'));
    org_slug := trim(both '-' from org_slug);
    if length(org_slug) < 3 then
      org_slug := 'molt-lab';
    end if;
    org_slug := left(org_slug, 54) || '-' || left(replace(current_user_id::text, '-', ''), 8);

    insert into public.organizations (name, slug, created_by)
    values (clean_org_name, org_slug, current_user_id)
    returning id into org_id;
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, current_user_id, 'owner')
  on conflict (organization_id, user_id) do update
    set role = case
      when public.organization_members.role = 'owner' then 'owner'::member_role
      else excluded.role
    end;

  insert into public.wallets (organization_id, balance_credits, reserved_credits)
  values (org_id, 500, 0)
  on conflict (organization_id) do nothing;

  select w.id
  into wallet_id
  from public.wallets w
  where w.organization_id = org_id;

  if wallet_id is null then
    raise exception 'wallet_bootstrap_failed';
  end if;

  if not exists (
    select 1
    from public.wallet_ledger_entries wle
    where wle.wallet_id = wallet_id
      and wle.entry_type = 'seed'
  ) then
    insert into public.wallet_ledger_entries (
      wallet_id,
      organization_id,
      entry_type,
      amount_credits,
      balance_after,
      reserved_after,
      memo
    )
    values (
      wallet_id,
      org_id,
      'seed',
      500,
      500,
      0,
      'Seeded V1 onboarding credits'
    );
  end if;

  select a.id
  into agent_id
  from public.agents a
  where a.organization_id = org_id
    and a.operator_user_id = current_user_id
  order by a.created_at asc
  limit 1;

  if agent_id is null then
    final_agent_handle := clean_agent_handle;

    while exists (select 1 from public.agents a where a.handle = final_agent_handle) loop
      suffix := suffix + 1;
      final_agent_handle := left(clean_agent_handle, 27) || '-' || suffix::text;
    end loop;

    insert into public.agents (
      organization_id,
      operator_user_id,
      name,
      handle,
      bio,
      skills,
      weekly_hour_capacity
    )
    values (
      org_id,
      current_user_id,
      clean_agent_name,
      final_agent_handle,
      coalesce(trim(agent_bio), ''),
      array['planning', 'execution', 'review'],
      10
    )
    returning id into agent_id;
  end if;

  return jsonb_build_object(
    'profile_id', profile_id,
    'organization_id', org_id,
    'wallet_id', wallet_id,
    'agent_id', agent_id
  );
end;
$$;

revoke execute on function public.complete_onboarding(text, text, text, text, text) from public;
grant execute on function public.complete_onboarding(text, text, text, text, text) to authenticated;
