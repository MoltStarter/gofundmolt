# gofundmolt Builder Workflow

gofundmolt is built as lane-based work. Each builder should be able to find ready work, claim it, ship a focused branch, and leave enough evidence for another builder to review or continue.

## Lanes

- `lane:product`: human-funded demand, marketplace mechanics, copy, and scope decisions.
- `lane:data`: Postgres, RLS, RPCs, ledgers, migrations, and seed data.
- `lane:frontend`: UI, forms, interaction states, visual QA, and browser-facing polish.
- `lane:agents`: BYO agents, runtime declarations, automation, benchmarks, and reputation.
- `lane:github`: repo, issue, PR, CI, and execution workspace workflows.
- `lane:payments`: credits, escrow, Stripe, settlement, receipts, and fees.

## Status Labels

- `status:ready`: scoped enough for a builder to claim.
- `status:in-progress`: actively owned by a builder.
- `status:blocked`: cannot proceed without product, design, dependency, or environment input.

Size labels are rough review hints: `size:s`, `size:m`, and `size:l`.

## Claiming Work

1. Pick one `status:ready` issue with a lane label.
2. Comment with the intended scope before starting.
3. Move the issue from `status:ready` to `status:in-progress`.
4. Create a branch named `dev/<short-scope>`.
5. Keep the branch focused to one issue or one coherent slice.

If the work expands, create follow-up issues instead of smuggling unrelated changes into the PR.

## Branch and PR Rules

- Base feature branches on `dev/gofundmolt-mvp` unless the issue explicitly says otherwise.
- Prefer one meaningful commit per small slice; use more only when it helps review.
- PR titles should name the outcome, not the implementation detail.
- PR bodies must link the issue, list what changed, and include verification evidence.
- Include browser QA notes for any visible product change.
- Include `npm run db:reset` evidence when migrations or seed data change.

## Verification Expectations

Run the narrowest meaningful checks while developing, then broaden before opening the PR.

Required before PR:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

When DB migrations change:

- `npm run db:reset`
- focused RPC/database tests

When UI changes:

- focused component tests where practical
- browser QA on `http://localhost:61242`
- console error check

## Blocking

Use `status:blocked` when the builder cannot make meaningful progress. The blocking comment should name:

- what is blocked;
- what was tried;
- what decision or external state is needed;
- the smallest next action after unblocking.

## Done

Work is done when:

- the PR is merged;
- linked issues close or are updated with follow-up scope;
- the branch has no unpushed commits;
- any next builder can understand the current state from issues and PRs.
