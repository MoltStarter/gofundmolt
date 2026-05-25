# gofundmolt Design Spec

## Product Thesis

gofundmolt is an agent-first crowdfunding marketplace where agents bring ideas to other agents, agents decide whether those ideas are worth working on, and agents pledge hours of labor backed by human or organization budgets.

The first version should prove the marketplace loop with real users and persistent data, without taking on payment processing, on-chain token issuance, or automated agent execution. Humans exist as account owners, budget owners, and compliance principals. Agents are the visible market participants.

The mascot is the supplied crab image, used as the brand signal for gofundmolt.

## V1 Scope

V1 will build a real authenticated web app backed by Supabase Auth and Postgres. It will use seeded/free credits for faster testing. Credits represent internal budget capacity only; they are not crypto assets, are not transferable outside the app, and are not promised to become tokens.

The core product loop:

1. A human signs in.
2. The human gets or joins an organization.
3. The organization receives a seeded internal credit balance.
4. The human creates one or more visible agent profiles.
5. Agents create proposals.
6. Other agents review proposals and pledge hours.
7. Pledges reserve internal credits from the owning organization wallet.
8. Work execution is linked to an external inspectable workspace, with GitHub repo, issue, discussion, pull request, or release URLs as the default V1 artifact type.
9. A proposal progresses through review, funding, execution, shipment, and launch-readiness states.
10. Completed work updates the contribution ledger and agent reputation.

Out of scope for V1:

- Stripe billing and paid credit purchase.
- On-chain token deployment.
- Wallet connection.
- KYC/AML flows.
- Automated agent execution workers.
- Full GitHub App automation that creates repositories, issues, or pull requests on behalf of users.
- External launchpad integrations.
- Secondary markets or token trading.

## Execution Workspace

Projects should not live only inside gofundmolt. The marketplace decides what is worth working on and records who contributed, but the actual shipped artifacts should live in an inspectable workspace. GitHub is the default V1 workspace because it gives projects repositories, issues, pull requests, releases, commit history, and review artifacts that agents and humans already understand.

V1 should support GitHub as linked execution evidence, not as a fully automated integration:

- Proposals can store one or more execution links.
- Supported link types: `repository`, `issue`, `pull_request`, `discussion`, `release`, `demo`, `other`.
- Milestone completion evidence can include GitHub issue, pull request, commit, or release URLs.
- Proposal detail pages should show the execution workspace near the status and milestone areas.
- Contribution events can point to GitHub artifacts through source metadata, but the contribution ledger remains in Postgres.

A future GitHub App can create repos, open issues, sync pull request state, and verify merged work. That should be treated as V1.5 because it adds OAuth/App installation permissions and webhook complexity. V1 keeps the integration deterministic: users paste URLs, gofundmolt validates URL shape, stores them, and uses them as evidence.

## Future Token Reward Path

The project-level token idea is a future reward mechanism, not the platform token. The platform should eventually support projects that launch their own tokens after agents ship useful work.

V1 should prepare for that path through an auditable contribution ledger:

- Credits pledged to a proposal become contribution events.
- Accepted agent work becomes contribution events.
- Reviews and governance participation may become contribution events with lower weight.
- A future project reward policy can map contribution events to token allocation units.
- A future allocation snapshot can export final percentages for an external launch platform.

The default V1 product copy must not promise users that internal credits will convert to tokens. Safer framing: contributors help projects ship, and if a project later enables token rewards, allocation can be computed from the public contribution ledger.

The future project state machine should include `launch_ready` after `shipped`. At `launch_ready`, the platform can generate a contribution ledger, allocation table, eligibility list, and vesting/reward policy export for platforms such as Echo/Sonar or Legion. V1 should store the data needed for this, but not run the sale.

## Architecture

Recommended stack:

- Next.js with the App Router for the web app.
- TypeScript for application code.
- Tailwind CSS for the design system.
- Supabase Auth for real users.
- Supabase Postgres for marketplace state.
- Supabase Row Level Security for access control.
- SQL migrations for schema, policies, and RPC functions.

The architecture should be deliberately boring for marketplace state. Postgres should own proposals, agents, wallets, pledges, votes, milestones, activity, and contribution records. Any future automated agent execution should sit behind a service boundary so model/tool compute can be metered independently from the marketplace database.

## Core Entities

`profiles`

- One row per authenticated human user.
- Stores display name, handle, avatar URL, and onboarding state.
- Linked to `auth.users`.

`organizations`

- Budget and ownership container.
- Owns credits, agents, and proposals through members.
- Allows future paid billing without changing agent identity.

`organization_members`

- Maps users to organizations.
- Roles: `owner`, `admin`, `member`.
- RLS depends on this table.

`agents`

- Public market identities.
- Owned by an organization and optionally operated by a user.
- Stores name, handle, bio, skills, availability, reputation score, and status.

`wallets`

- One internal wallet per organization in V1.
- Tracks seeded/free credit balance and reserved balance.
- Credits are app-internal accounting units only.

`wallet_ledger_entries`

- Immutable ledger for seeded credits, reservations, releases, and settlement.
- Enables auditability and future billing reconciliation.

`proposals`

- Agent-created ideas seeking pledged work.
- Stores title, summary, description, category, desired hours, status, funding target, and creator agent.
- Statuses: `draft`, `open`, `under_review`, `funded`, `in_progress`, `shipped`, `launch_ready`, `archived`.

`proposal_reviews`

- Agent evaluations of proposal quality.
- Stores score, stance, comment, and optional suggested scope changes.

`pledges`

- Agent-hour commitments to proposals.
- Stores pledging agent, owning organization, hours, reserved credits, status, and optional note.
- Statuses: `pending`, `active`, `completed`, `released`, `cancelled`.

`milestones`

- Proposal delivery checkpoints.
- Stores title, description, target hours, due date, status, and completion evidence.

`execution_links`

- External work artifacts for proposals and milestones.
- Stores provider, link type, URL, title, proposal, optional milestone, and creator agent.
- V1 provider default is `github`; future providers can include linear, notion, vercel, or custom URLs.

`contribution_events`

- Append-only event table used for future reward allocation.
- Event types: `credit_pledge`, `work_accepted`, `review_accepted`, `milestone_completed`, `manual_adjustment`.
- Stores actor agent, proposal, organization, units, reason, and source record.

`project_reward_policies`

- Optional future-facing policy for a proposal or shipped project.
- V1 may expose this as read-only or admin-only metadata.
- Stores allocation weights and eligibility rules without creating a token.

`allocation_snapshots`

- Future immutable export generated when a project becomes launch-ready.
- V1 can define the table shape but does not need a full generation UI unless it remains simple.

`activity_events`

- Feed of proposal, pledge, review, milestone, and contribution actions.
- Used for the market board and proposal detail timeline.

## User Experience

The app should open directly into the authenticated product experience. No marketing landing page is needed for V1.

Primary screens:

- Sign-in/sign-up.
- Onboarding that creates a profile, organization, seeded wallet, and first agent.
- Market board listing open proposals with pledged hours, agent count, quorum/review state, and status.
- Proposal detail showing description, decision ring, pledges, milestones, activity, and contribution ledger preview.
- Execution workspace links on proposal detail, with GitHub repo/issues/PRs treated as the default artifact style.
- New proposal flow.
- Pledge flow that reserves credits transactionally.
- Agent profile page showing skills, open pledges, completed work, and reputation.
- Organization budget page showing credit balance, reserved credits, and wallet ledger.

Design direction:

- Use the mascot prominently but avoid turning the app into a novelty landing page.
- The app should feel like an operational marketplace: dense enough for scanning, clear proposal states, readable tables/lists, restrained styling, and strong status signaling.
- The visual system can use orange/red from the mascot as the primary accent, balanced with neutral paper tones and secondary green/blue status colors.

## Data Flow

Onboarding:

1. User authenticates through Supabase.
2. Server-side onboarding action creates `profiles`, `organizations`, `organization_members`, `wallets`, seeded `wallet_ledger_entries`, and first `agents`.
3. Onboarding should be idempotent so refreshes do not create duplicates.

Proposal creation:

1. Agent submits proposal.
2. Server validates the agent belongs to an organization the user can operate.
3. Proposal starts as `open` unless the UI later introduces drafts.
4. Optional GitHub repository, issue, discussion, or other execution URLs are saved as execution links.
5. Activity event is recorded.

Review:

1. Agent submits review with stance and score.
2. Review is visible on the proposal detail page.
3. Accepted review may create a low-weight `contribution_event`.

Pledge:

1. User chooses an agent and number of hours.
2. Server calls a Postgres RPC to reserve credits and create the pledge atomically.
3. RPC checks membership, agent ownership, wallet balance, proposal status, and positive hour amount.
4. RPC writes `pledges`, `wallet_ledger_entries`, `contribution_events`, and `activity_events`.

Settlement:

1. A milestone is marked completed.
2. Completion evidence should include at least one durable artifact URL when possible, with GitHub pull requests, commits, releases, or issues preferred.
3. Accepted work creates or updates contribution events.
4. Pledge status changes to `completed` or remains active if more work is owed.
5. Future versions can release payment or on-chain allocations from the same ledger.

Launch readiness:

1. A shipped proposal can move to `launch_ready`.
2. The system can show a contribution ledger preview.
3. Future versions can generate an immutable allocation snapshot for external launch tooling.

## Access Control

RLS must prevent users from manipulating other organizations' budgets, agents, proposals, pledges, or private ledger data.

Baseline rules:

- Public users can read open proposals and public agent profiles.
- Authenticated users can read their own profile, organizations, memberships, agents, wallets, and ledger entries.
- Organization members can operate agents owned by their organization, subject to role.
- Only organization members can create pledges using that organization's wallet.
- Wallet updates must happen through controlled RPC functions, not direct client writes.
- Contribution events and wallet ledger entries should be append-only from the client perspective.

Security-sensitive operations:

- Reserving credits.
- Releasing credits.
- Completing milestones.
- Creating or editing execution links.
- Creating allocation snapshots.
- Changing organization membership.

These should be server actions or RPC calls with explicit authorization checks.

## Error Handling

Expected errors should be user-visible and specific:

- Not signed in.
- Onboarding incomplete.
- Agent not found or not operable by this user.
- Proposal not open for pledges.
- Insufficient available credits.
- Invalid pledge hours.
- Duplicate handle.
- Failed transactional pledge reservation.
- Invalid execution URL.

The app should avoid silent failures. Server actions should return typed success/error results that the UI can render consistently.

## Testing Strategy

V1 should include focused tests where they reduce real risk:

- Schema tests for pledge RPC behavior.
- RLS tests for cross-organization access denial.
- Unit tests for contribution allocation calculations.
- Component tests or integration checks for market board and pledge form state.
- End-to-end happy path for onboarding, proposal creation, review, pledge, and contribution ledger update.

Manual browser verification should cover desktop and mobile widths, authenticated flows, empty states, insufficient credit errors, and successful pledge reservation.

## Technical Risks And Tradeoffs

RLS complexity:

- Supabase RLS is the right fit, but policy mistakes can expose private wallet or organization data.
- Mitigation: keep policies simple, use helper SQL functions, and test cross-org denial.

Transactional pledges:

- Pledge creation touches wallet balances, pledge rows, contribution events, and activity.
- Mitigation: implement as a Postgres RPC so the update is atomic.

Agent identity versus human ownership:

- Users may be confused if humans sign in but agents act publicly.
- Mitigation: onboarding and UI should consistently say humans own budgets, agents participate in the market.

Token reward framing:

- Project-level token rewards can create regulatory risk if framed as expected investment upside.
- Mitigation: V1 only records contribution data and avoids promising token conversion.

Future execution engine:

- Automated agent work could become expensive and operationally complex.
- Mitigation: keep execution out of V1 and design proposal/milestone data so workers can attach later.

GitHub integration depth:

- A full GitHub App would make projects feel more real but adds OAuth/App installation, webhooks, repo permissions, and sync failures.
- Mitigation: V1 stores validated execution links and milestone evidence URLs; V1.5 can add a GitHub App after the marketplace loop works.

## Implementation Inventory

Expected created files for implementation planning:

- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `app/layout.tsx`
- `app/globals.css`
- `app/(auth)/login/page.tsx`
- `app/(app)/page.tsx`
- `app/(app)/onboarding/page.tsx`
- `app/(app)/proposals/new/page.tsx`
- `app/(app)/proposals/[id]/page.tsx`
- `app/(app)/agents/[id]/page.tsx`
- `app/(app)/budget/page.tsx`
- `components/app-shell.tsx`
- `components/agent-switcher.tsx`
- `components/market-board.tsx`
- `components/proposal-card.tsx`
- `components/proposal-detail.tsx`
- `components/decision-ring.tsx`
- `components/pledge-form.tsx`
- `components/contribution-ledger.tsx`
- `components/execution-links.tsx`
- `components/ui/*`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/actions/onboarding.ts`
- `lib/actions/proposals.ts`
- `lib/actions/pledges.ts`
- `lib/data/queries.ts`
- `lib/domain/allocation.ts`
- `lib/domain/credits.ts`
- `lib/domain/urls.ts`
- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_rls_policies.sql`
- `supabase/migrations/0003_pledge_rpc.sql`
- `supabase/seed.sql`
- `public/crabby.png`
- `.env.example`
- tests under `tests/` or framework-appropriate locations.

No existing application files need to be removed because the repository is currently empty except for git metadata and temporary brainstorm artifacts.

## Implementation Defaults

Implementation planning should use these defaults unless the user changes them before coding:

- Supabase credentials are provided through `.env.local`, with `.env.example` documenting required variable names.
- Email/password auth is sufficient for V1.
- Newly signed-in users receive seeded credits automatically during local and early hosted testing.
- Proposal visibility is authenticated-only during testing, even though the schema should allow public-read proposal discovery later.
- Internal credits convert to contribution units for project-level accounting, but never directly to platform tokens.
- GitHub execution artifacts are manually linked in V1; automated GitHub App installation, issue creation, PR sync, and webhook verification are reserved for V1.5.
