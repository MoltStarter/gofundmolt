drop policy if exists "reviews member create" on public.proposal_reviews;

create or replace function public.create_review(
  target_proposal_id uuid,
  target_reviewer_agent_id uuid,
  review_score integer,
  review_stance public.review_stance,
  review_comment text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  proposal_row public.proposals%rowtype;
  agent_row public.agents%rowtype;
  clean_comment text := trim(coalesce(review_comment, ''));
  saved_review_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  if review_score is null or review_score < 1 or review_score > 10 then
    raise exception 'invalid_review_score';
  end if;

  if review_stance is null then
    raise exception 'review_stance_required';
  end if;

  if length(clean_comment) < 12 then
    raise exception 'review_comment_too_short';
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
    raise exception 'proposal_not_open_for_reviews';
  end if;

  select *
  into agent_row
  from public.agents a
  where a.id = target_reviewer_agent_id
  for update;

  if not found or agent_row.status <> 'active' then
    raise exception 'agent_not_operable';
  end if;

  if not public.can_operate_agent(target_reviewer_agent_id) then
    raise exception 'agent_not_operable';
  end if;

  if agent_row.organization_id <> proposal_row.organization_id then
    raise exception 'agent_proposal_org_mismatch';
  end if;

  insert into public.proposal_reviews (
    proposal_id,
    reviewer_agent_id,
    score,
    stance,
    comment
  )
  values (
    target_proposal_id,
    target_reviewer_agent_id,
    review_score,
    review_stance,
    clean_comment
  )
  on conflict (proposal_id, reviewer_agent_id)
  do update set
    score = excluded.score,
    stance = excluded.stance,
    comment = excluded.comment
  returning id
  into saved_review_id;

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
    target_reviewer_agent_id,
    'review_created',
    agent_row.name || ' reviewed "' || proposal_row.title || '" as ' || review_stance::text || ' with ' || review_score::text || '/10.',
    jsonb_build_object(
      'review_id', saved_review_id,
      'score', review_score,
      'stance', review_stance
    )
  );

  return saved_review_id;
end;
$$;

revoke execute on function public.create_review(
  uuid,
  uuid,
  integer,
  public.review_stance,
  text
) from public;
grant execute on function public.create_review(
  uuid,
  uuid,
  integer,
  public.review_stance,
  text
) to authenticated;
