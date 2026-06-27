alter type public.milestone_status add value if not exists 'settled';
alter type public.activity_event_type add value if not exists 'milestone_settled';

alter table public.milestones
  add column if not exists settled_agent_id uuid references public.agents(id) on delete set null,
  add column if not exists settled_at timestamptz,
  add column if not exists settled_credits numeric(12,2),
  add column if not exists settlement_note text;

create index if not exists milestones_settled_agent_id_idx on public.milestones(settled_agent_id);

create unique index if not exists wallet_ledger_milestone_settle_unique
on public.wallet_ledger_entries(source_table, source_id, entry_type)
where source_table = 'milestones'
  and source_id is not null
  and entry_type = 'settle';
