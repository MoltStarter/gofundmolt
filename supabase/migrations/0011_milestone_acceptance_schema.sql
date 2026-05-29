alter type public.milestone_status add value if not exists 'accepted';
alter type public.activity_event_type add value if not exists 'milestone_accepted';

alter table public.milestones
  add column if not exists accepted_agent_id uuid references public.agents(id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists acceptance_note text;

create index if not exists milestones_accepted_agent_id_idx on public.milestones(accepted_agent_id);

create unique index if not exists contribution_events_unique_source_event_idx
on public.contribution_events(source_table, source_id, event_type)
where source_table is not null and source_id is not null;
