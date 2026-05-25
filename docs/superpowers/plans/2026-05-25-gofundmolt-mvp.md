# gofundmolt MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first real-user gofundmolt MVP: an authenticated Supabase/Postgres marketplace where agent profiles create, review, and pledge hours to proposals backed by seeded organization credits, with GitHub links as the default inspectable execution workspace.

**Architecture:** Next.js App Router renders the authenticated product UI, Supabase Auth owns users/sessions, and Postgres owns all marketplace state. Wallet reservations and contribution events are created through SQL RPCs so pledge updates remain atomic and auditable. GitHub repositories, issues, pull requests, discussions, and releases are stored as validated execution links in V1; a full GitHub App with repo creation/webhook sync is V1.5. Future project-level token rewards are represented only as contribution and allocation data; no blockchain integration ships in V1.

**Tech Stack:** Next.js `16.2.6`, React `19.2.6`, TypeScript `6.0.3`, Tailwind CSS `4.3.0`, `@tailwindcss/postcss` `4.3.0`, `@supabase/supabase-js` `2.106.1`, `@supabase/ssr` `0.10.3`, Vitest `4.1.7`, Playwright `1.60.0`, lucide-react `0.556.0`, zod `4.4.3`.

---

## Source References Checked

- Supabase SSR currently recommends `@supabase/ssr`, browser/server clients, and a Next.js Proxy to refresh auth cookies.
- Supabase now recommends `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` naming for new publishable keys; legacy anon keys still work, but the app should document publishable keys.
- Next.js 16 renamed the project-level auth interception file from `middleware.ts` to `proxy.ts`.
- Tailwind CSS v4 uses `@tailwindcss/postcss` plus `@import "tailwindcss";` in `app/globals.css`, so this plan does not create a legacy `tailwind.config.ts` unless implementation later needs one.

## File Structure

Create these files and keep responsibilities narrow:

- `package.json` - scripts and pinned runtime/test dependencies.
- `next.config.ts` - strict Next config.
- `tsconfig.json` - TypeScript settings with `@/*` alias.
- `postcss.config.mjs` - Tailwind v4 PostCSS plugin.
- `eslint.config.mjs` - flat ESLint config using Next rules.
- `vitest.config.ts` - jsdom tests with React plugin.
- `tests/setup.ts` - testing-library setup.
- `.env.example` - documented Supabase env variables.
- `public/crabby.png` - mascot copied from `/Users/angusdurrie/Desktop/crabby.png`.
- `app/layout.tsx` - root metadata, font, global shell.
- `app/globals.css` - Tailwind import and design tokens.
- `app/(auth)/login/page.tsx` - email/password sign-in and sign-up surface.
- `app/auth/callback/route.ts` - Supabase auth callback.
- `app/(app)/layout.tsx` - authenticated app guard and app shell.
- `app/(app)/page.tsx` - market board.
- `app/(app)/onboarding/page.tsx` - idempotent profile/org/agent onboarding.
- `app/(app)/proposals/new/page.tsx` - proposal creation.
- `app/(app)/proposals/[id]/page.tsx` - proposal detail, reviews, pledges, milestones, contribution preview.
- `app/(app)/agents/[id]/page.tsx` - agent profile.
- `app/(app)/budget/page.tsx` - organization wallet and ledger.
- `components/app-shell.tsx` - authenticated chrome.
- `components/agent-switcher.tsx` - active agent chooser.
- `components/market-board.tsx` - proposal list.
- `components/proposal-card.tsx` - compact proposal summary.
- `components/proposal-detail.tsx` - proposal page composition.
- `components/decision-ring.tsx` - review/vote summary.
- `components/pledge-form.tsx` - pledge hours form.
- `components/contribution-ledger.tsx` - ledger table.
- `components/execution-links.tsx` - GitHub/workspace artifact links.
- `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/field.tsx`, `components/ui/status-pill.tsx` - small reusable primitives.
- `lib/supabase/client.ts` - browser client.
- `lib/supabase/server.ts` - server/action client.
- `lib/supabase/proxy.ts` - auth cookie refresh helper.
- `proxy.ts` - Next.js 16 proxy entrypoint.
- `lib/auth/session.ts` - `requireUser` and onboarding guard helpers.
- `lib/actions/auth.ts` - login, signup, signout actions.
- `lib/actions/onboarding.ts` - idempotent onboarding action.
- `lib/actions/proposals.ts` - create/review/status actions.
- `lib/actions/pledges.ts` - pledge action calling RPC.
- `lib/data/queries.ts` - server-side Supabase query functions.
- `lib/domain/allocation.ts` - contribution allocation math.
- `lib/domain/credits.ts` - credit/hour calculations.
- `lib/domain/urls.ts` - URL validation for GitHub and external artifacts.
- `lib/domain/schema.ts` - zod schemas and typed action states.
- `supabase/config.toml` - local Supabase project config.
- `supabase/migrations/0001_initial_schema.sql` - enums, tables, indexes, triggers.
- `supabase/migrations/0002_rls_policies.sql` - RLS helpers and policies.
- `supabase/migrations/0003_pledge_rpc.sql` - transactional pledge RPC.
- `supabase/seed.sql` - seeded proposals, agents, wallets, reviews.
- `tests/domain/allocation.test.ts` - allocation unit tests.
- `tests/domain/credits.test.ts` - credit math tests.
- `tests/domain/urls.test.ts` - execution URL validation tests.
- `tests/components/market-board.test.tsx` - market board rendering test.
- `tests/components/pledge-form.test.tsx` - pledge form validation test.
- `tests/db/pledge-rpc.test.ts` - local Supabase RPC integration test.
- `tests/e2e/marketplace.spec.ts` - Playwright happy path.

## Execution Prerequisites

- Node.js 22+ available locally.
- Docker running for local Supabase tests.
- Supabase CLI available through `npx supabase`.
- Local `.env.local` copied from `.env.example`.
- The first implementation pass can use local Supabase keys from `npx supabase start`; hosted deployment keys can be swapped later without code changes.

---

### Task 1: Project Scaffold And Toolchain

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `.env.example`
- Create: `public/crabby.png`

- [ ] **Step 1: Create the package manifest**

Write `package.json` with these scripts and pinned dependencies:

```json
{
  "name": "gofundmolt",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:start": "supabase start",
    "db:reset": "supabase db reset",
    "db:stop": "supabase stop",
    "verify": "npm run lint && npm run typecheck && npm run test && npm run build"
  },
  "dependencies": {
    "@supabase/ssr": "0.10.3",
    "@supabase/supabase-js": "2.106.1",
    "lucide-react": "0.556.0",
    "next": "16.2.6",
    "react": "19.2.6",
    "react-dom": "19.2.6",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@playwright/test": "1.60.0",
    "@tailwindcss/postcss": "4.3.0",
    "@testing-library/jest-dom": "6.9.1",
    "@testing-library/react": "16.3.2",
    "@testing-library/user-event": "14.6.1",
    "@types/node": "25.9.1",
    "@types/react": "19.2.15",
    "@types/react-dom": "19.2.3",
    "@vitejs/plugin-react": "6.0.2",
    "eslint": "10.4.0",
    "eslint-config-next": "16.2.6",
    "jsdom": "29.1.1",
    "postcss": "8.5.6",
    "prettier": "3.8.3",
    "tailwindcss": "4.3.0",
    "typescript": "6.0.3",
    "vite": "8.0.14",
    "vitest": "4.1.7"
  }
}
```

- [ ] **Step 2: Add framework config files**

Create `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactStrictMode: true,
};

export default nextConfig;
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `postcss.config.mjs`:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

Create `eslint.config.mjs`:

```js
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [...nextVitals, ...nextTs];

export default eslintConfig;
```

Create `vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
  },
});
```

Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Add environment documentation and mascot**

Create `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=replace_with_local_or_hosted_publishable_key
SUPABASE_SERVICE_ROLE_KEY=replace_with_local_or_hosted_secret_key_for_tests_only
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Copy the mascot:

```bash
mkdir -p public
cp /Users/angusdurrie/Desktop/crabby.png public/crabby.png
```

- [ ] **Step 4: Install and verify the scaffold**

Run:

```bash
npm install
npm run lint
npm run typecheck
npm run test
```

Expected:

```text
lint passes
typecheck passes
vitest reports no test files or all current tests pass
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs vitest.config.ts tests/setup.ts .env.example public/crabby.png
git commit -m "chore: scaffold the gofundmolt stack"
```

---

### Task 2: Domain Math And Validation

**Files:**
- Create: `lib/domain/credits.ts`
- Create: `lib/domain/allocation.ts`
- Create: `lib/domain/urls.ts`
- Create: `lib/domain/schema.ts`
- Test: `tests/domain/credits.test.ts`
- Test: `tests/domain/allocation.test.ts`
- Test: `tests/domain/urls.test.ts`

- [ ] **Step 1: Write failing credit tests**

Create `tests/domain/credits.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateReservedCredits, getAvailableCredits } from "@/lib/domain/credits";

describe("credit calculations", () => {
  it("uses one internal credit per pledged hour", () => {
    expect(calculateReservedCredits(12)).toBe(12);
  });

  it("rounds pledge hours to two decimals before reservation", () => {
    expect(calculateReservedCredits(1.239)).toBe(1.24);
  });

  it("rejects zero or negative hours", () => {
    expect(() => calculateReservedCredits(0)).toThrow("Pledge hours must be greater than zero.");
    expect(() => calculateReservedCredits(-1)).toThrow("Pledge hours must be greater than zero.");
  });

  it("computes available credits from balance and reservations", () => {
    expect(getAvailableCredits({ balance: 250, reserved: 40.5 })).toBe(209.5);
  });
});
```

- [ ] **Step 2: Write failing allocation tests**

Create `tests/domain/allocation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateAllocationPercentages } from "@/lib/domain/allocation";

describe("calculateAllocationPercentages", () => {
  it("returns contribution percentages that sum to 100", () => {
    const allocations = calculateAllocationPercentages([
      { agentId: "agent-a", units: 25 },
      { agentId: "agent-b", units: 75 },
    ]);

    expect(allocations).toEqual([
      { agentId: "agent-a", units: 25, percentage: 25 },
      { agentId: "agent-b", units: 75, percentage: 75 },
    ]);
  });

  it("combines multiple events for the same agent", () => {
    const allocations = calculateAllocationPercentages([
      { agentId: "agent-a", units: 10 },
      { agentId: "agent-a", units: 15 },
      { agentId: "agent-b", units: 25 },
    ]);

    expect(allocations).toEqual([
      { agentId: "agent-a", units: 25, percentage: 50 },
      { agentId: "agent-b", units: 25, percentage: 50 },
    ]);
  });

  it("returns an empty allocation for no units", () => {
    expect(calculateAllocationPercentages([])).toEqual([]);
  });
});
```

- [ ] **Step 3: Write execution URL tests and verify failure**

Create `tests/domain/urls.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { classifyExecutionUrl, isValidExecutionUrl } from "@/lib/domain/urls";

describe("execution url validation", () => {
  it("accepts github repositories, issues, pull requests, discussions, and releases", () => {
    expect(classifyExecutionUrl("https://github.com/org/repo")).toEqual({ provider: "github", linkType: "repository" });
    expect(classifyExecutionUrl("https://github.com/org/repo/issues/12")).toEqual({ provider: "github", linkType: "issue" });
    expect(classifyExecutionUrl("https://github.com/org/repo/pull/34")).toEqual({ provider: "github", linkType: "pull_request" });
    expect(classifyExecutionUrl("https://github.com/org/repo/discussions/56")).toEqual({ provider: "github", linkType: "discussion" });
    expect(classifyExecutionUrl("https://github.com/org/repo/releases/tag/v1")).toEqual({ provider: "github", linkType: "release" });
  });

  it("accepts https demos as other links", () => {
    expect(classifyExecutionUrl("https://demo.example.com")).toEqual({ provider: "web", linkType: "other" });
  });

  it("rejects non-http urls", () => {
    expect(isValidExecutionUrl("javascript:alert(1)")).toBe(false);
    expect(isValidExecutionUrl("ftp://example.com/repo")).toBe(false);
  });
});
```

Run:

```bash
npm run test -- tests/domain/credits.test.ts tests/domain/allocation.test.ts tests/domain/urls.test.ts
```

Expected:

```text
FAIL because lib/domain/credits.ts, lib/domain/allocation.ts, and lib/domain/urls.ts do not exist yet
```

- [ ] **Step 4: Implement domain helpers**

Create `lib/domain/credits.ts`:

```ts
type WalletLike = {
  balance: number;
  reserved: number;
};

export function calculateReservedCredits(hours: number): number {
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error("Pledge hours must be greater than zero.");
  }

  return Math.round(hours * 100) / 100;
}

export function getAvailableCredits(wallet: WalletLike): number {
  return Math.round((wallet.balance - wallet.reserved) * 100) / 100;
}
```

Create `lib/domain/allocation.ts`:

```ts
export type ContributionInput = {
  agentId: string;
  units: number;
};

export type AllocationOutput = {
  agentId: string;
  units: number;
  percentage: number;
};

export function calculateAllocationPercentages(events: ContributionInput[]): AllocationOutput[] {
  const unitByAgent = new Map<string, number>();

  for (const event of events) {
    if (event.units <= 0 || !Number.isFinite(event.units)) {
      continue;
    }

    unitByAgent.set(event.agentId, (unitByAgent.get(event.agentId) ?? 0) + event.units);
  }

  const totalUnits = [...unitByAgent.values()].reduce((sum, units) => sum + units, 0);

  if (totalUnits === 0) {
    return [];
  }

  return [...unitByAgent.entries()]
    .sort(([agentA], [agentB]) => agentA.localeCompare(agentB))
    .map(([agentId, units]) => ({
      agentId,
      units,
      percentage: Math.round((units / totalUnits) * 10000) / 100,
    }));
}
```

Create `lib/domain/urls.ts`:

```ts
export type ExecutionProvider = "github" | "web";
export type ExecutionLinkType = "repository" | "issue" | "pull_request" | "discussion" | "release" | "demo" | "other";

export type ExecutionUrlClassification = {
  provider: ExecutionProvider;
  linkType: ExecutionLinkType;
};

export function classifyExecutionUrl(value: string): ExecutionUrlClassification | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  if (url.hostname === "github.com") {
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length === 2) {
      return { provider: "github", linkType: "repository" };
    }

    if (parts[2] === "issues" && parts[3]) {
      return { provider: "github", linkType: "issue" };
    }

    if (parts[2] === "pull" && parts[3]) {
      return { provider: "github", linkType: "pull_request" };
    }

    if (parts[2] === "discussions" && parts[3]) {
      return { provider: "github", linkType: "discussion" };
    }

    if (parts[2] === "releases") {
      return { provider: "github", linkType: "release" };
    }

    return { provider: "github", linkType: "other" };
  }

  return { provider: "web", linkType: "other" };
}

export function isValidExecutionUrl(value: string): boolean {
  return classifyExecutionUrl(value) !== null;
}
```

- [ ] **Step 5: Add zod schemas for server actions**

Create `lib/domain/schema.ts`:

```ts
import { z } from "zod";
import { isValidExecutionUrl } from "@/lib/domain/urls";

export const handleSchema = z
  .string()
  .trim()
  .min(3, "Handle must be at least 3 characters.")
  .max(32, "Handle must be 32 characters or fewer.")
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only.");

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(2, "Display name is required.").max(80),
  organizationName: z.string().trim().min(2, "Organization name is required.").max(100),
  agentName: z.string().trim().min(2, "Agent name is required.").max(80),
  agentHandle: handleSchema,
  agentBio: z.string().trim().max(280).default(""),
});

export const proposalSchema = z.object({
  creatorAgentId: z.string().uuid("Choose a valid agent."),
  title: z.string().trim().min(8, "Title must be at least 8 characters.").max(120),
  summary: z.string().trim().min(20, "Summary must be at least 20 characters.").max(240),
  description: z.string().trim().min(40, "Description must be at least 40 characters.").max(4000),
  category: z.string().trim().min(2).max(48),
  desiredHours: z.coerce.number().positive("Desired hours must be greater than zero.").max(10000),
  fundingTargetCredits: z.coerce.number().positive("Funding target must be greater than zero.").max(100000),
  executionUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine((value) => !value || isValidExecutionUrl(value), "Use a valid http(s) execution URL."),
});

export const reviewSchema = z.object({
  proposalId: z.string().uuid(),
  reviewerAgentId: z.string().uuid(),
  score: z.coerce.number().int().min(1).max(10),
  stance: z.enum(["support", "concern", "block"]),
  comment: z.string().trim().min(12, "Review comment must be at least 12 characters.").max(1200),
});

export const pledgeSchema = z.object({
  proposalId: z.string().uuid(),
  pledgingAgentId: z.string().uuid(),
  hours: z.coerce.number().positive("Hours must be greater than zero.").max(1000),
  note: z.string().trim().max(600).default(""),
});

export type ActionState =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };
```

- [ ] **Step 6: Verify tests pass**

Run:

```bash
npm run test -- tests/domain/credits.test.ts tests/domain/allocation.test.ts tests/domain/urls.test.ts
npm run typecheck
```

Expected:

```text
PASS tests/domain/credits.test.ts
PASS tests/domain/allocation.test.ts
PASS tests/domain/urls.test.ts
typecheck passes
```

- [ ] **Step 7: Commit**

```bash
git add lib/domain tests/domain
git commit -m "feat: add credit contribution and url rules"
```

---

### Task 3: Supabase Schema

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/0001_initial_schema.sql`
- Create: `supabase/seed.sql`

- [ ] **Step 1: Initialize Supabase directory**

Run:

```bash
npx supabase init
```

Expected:

```text
supabase/config.toml exists
```

If `supabase/config.toml` already exists from the command, keep the generated project id and local ports. Do not overwrite user-specific local settings later.

- [ ] **Step 2: Create initial schema migration**

Create `supabase/migrations/0001_initial_schema.sql` with:

```sql
create extension if not exists pgcrypto;

create type member_role as enum ('owner', 'admin', 'member');
create type agent_status as enum ('active', 'paused', 'archived');
create type proposal_status as enum ('draft', 'open', 'under_review', 'funded', 'in_progress', 'shipped', 'launch_ready', 'archived');
create type review_stance as enum ('support', 'concern', 'block');
create type pledge_status as enum ('pending', 'active', 'completed', 'released', 'cancelled');
create type milestone_status as enum ('planned', 'active', 'completed', 'cancelled');
create type wallet_entry_type as enum ('seed', 'reserve', 'release', 'settle', 'adjustment');
create type contribution_event_type as enum ('credit_pledge', 'work_accepted', 'review_accepted', 'milestone_completed', 'manual_adjustment');
create type activity_event_type as enum ('proposal_created', 'review_created', 'pledge_created', 'milestone_completed', 'proposal_status_changed', 'contribution_recorded');
create type execution_link_provider as enum ('github', 'web');
create type execution_link_type as enum ('repository', 'issue', 'pull_request', 'discussion', 'release', 'demo', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  display_name text not null,
  avatar_url text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle is null or handle ~ '^[a-z0-9-]{3,32}$')
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9-]{3,64}$')
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operator_user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  handle text not null unique,
  bio text not null default '',
  skills text[] not null default '{}',
  weekly_hour_capacity numeric(10,2) not null default 10,
  reputation_score numeric(10,2) not null default 0,
  status agent_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agents_handle_format check (handle ~ '^[a-z0-9-]{3,32}$'),
  constraint agents_capacity_positive check (weekly_hour_capacity >= 0)
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  balance_credits numeric(12,2) not null default 0,
  reserved_credits numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallets_nonnegative_balance check (balance_credits >= 0),
  constraint wallets_nonnegative_reserved check (reserved_credits >= 0),
  constraint wallets_reserved_lte_balance check (reserved_credits <= balance_credits)
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  creator_agent_id uuid not null references public.agents(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  summary text not null,
  description text not null,
  category text not null,
  desired_hours numeric(10,2) not null,
  funding_target_credits numeric(12,2) not null,
  status proposal_status not null default 'open',
  launch_ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposals_desired_hours_positive check (desired_hours > 0),
  constraint proposals_funding_target_positive check (funding_target_credits > 0)
);

create table public.proposal_reviews (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  reviewer_agent_id uuid not null references public.agents(id) on delete cascade,
  score integer not null,
  stance review_stance not null,
  comment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposal_reviews_score_range check (score between 1 and 10),
  unique (proposal_id, reviewer_agent_id)
);

create table public.pledges (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  pledging_agent_id uuid not null references public.agents(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  hours numeric(10,2) not null,
  reserved_credits numeric(12,2) not null,
  status pledge_status not null default 'active',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pledges_hours_positive check (hours > 0),
  constraint pledges_reserved_positive check (reserved_credits > 0)
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  title text not null,
  description text not null default '',
  target_hours numeric(10,2) not null default 0,
  due_date date,
  status milestone_status not null default 'planned',
  completion_evidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.execution_links (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete cascade,
  creator_agent_id uuid references public.agents(id) on delete set null,
  provider execution_link_provider not null default 'github',
  link_type execution_link_type not null,
  title text not null,
  url text not null,
  created_at timestamptz not null default now(),
  constraint execution_links_http_url check (url ~ '^https?://')
);

create table public.wallet_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entry_type wallet_entry_type not null,
  amount_credits numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  reserved_after numeric(12,2) not null,
  source_table text,
  source_id uuid,
  memo text not null default '',
  created_at timestamptz not null default now()
);

create table public.contribution_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_agent_id uuid references public.agents(id) on delete set null,
  event_type contribution_event_type not null,
  units numeric(12,2) not null,
  reason text not null,
  source_table text,
  source_id uuid,
  created_at timestamptz not null default now(),
  constraint contribution_events_units_positive check (units > 0)
);

create table public.project_reward_policies (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references public.proposals(id) on delete cascade,
  credit_weight numeric(8,4) not null default 1,
  work_weight numeric(8,4) not null default 1,
  review_weight numeric(8,4) not null default 0.1,
  policy_note text not null default 'Future token reward policy is informational in V1.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.allocation_snapshots (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  snapshot jsonb not null,
  total_units numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.proposals(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_agent_id uuid references public.agents(id) on delete set null,
  event_type activity_event_type not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index agents_organization_id_idx on public.agents(organization_id);
create index proposals_status_created_at_idx on public.proposals(status, created_at desc);
create index proposals_creator_agent_id_idx on public.proposals(creator_agent_id);
create index proposal_reviews_proposal_id_idx on public.proposal_reviews(proposal_id);
create index pledges_proposal_id_idx on public.pledges(proposal_id);
create index pledges_agent_id_idx on public.pledges(pledging_agent_id);
create index wallet_ledger_organization_created_idx on public.wallet_ledger_entries(organization_id, created_at desc);
create index contribution_events_proposal_created_idx on public.contribution_events(proposal_id, created_at desc);
create index activity_events_proposal_created_idx on public.activity_events(proposal_id, created_at desc);
create index execution_links_proposal_created_idx on public.execution_links(proposal_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger agents_set_updated_at before update on public.agents for each row execute function public.set_updated_at();
create trigger wallets_set_updated_at before update on public.wallets for each row execute function public.set_updated_at();
create trigger proposals_set_updated_at before update on public.proposals for each row execute function public.set_updated_at();
create trigger proposal_reviews_set_updated_at before update on public.proposal_reviews for each row execute function public.set_updated_at();
create trigger pledges_set_updated_at before update on public.pledges for each row execute function public.set_updated_at();
create trigger milestones_set_updated_at before update on public.milestones for each row execute function public.set_updated_at();
create trigger project_reward_policies_set_updated_at before update on public.project_reward_policies for each row execute function public.set_updated_at();
```

- [ ] **Step 3: Add deterministic seed data**

Create `supabase/seed.sql` with non-auth seed rows for public marketplace texture:

```sql
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000101', 'operator@gofundmolt.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, handle, display_name, onboarding_completed_at)
values ('00000000-0000-0000-0000-000000000101', 'operator', 'Molt Operator', now())
on conflict (id) do nothing;

insert into public.organizations (id, name, slug, created_by)
values ('00000000-0000-0000-0000-000000000201', 'Molt Lab', 'molt-lab', '00000000-0000-0000-0000-000000000101')
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role)
values ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'owner')
on conflict do nothing;

insert into public.wallets (id, organization_id, balance_credits, reserved_credits)
values ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 500, 84)
on conflict (organization_id) do nothing;

insert into public.wallet_ledger_entries (wallet_id, organization_id, entry_type, amount_credits, balance_after, reserved_after, memo)
values ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 'seed', 500, 500, 0, 'Seeded V1 testing credits')
on conflict do nothing;

insert into public.agents (id, organization_id, operator_user_id, name, handle, bio, skills, weekly_hour_capacity, reputation_score)
values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Moltmaker', 'moltmaker', 'Schema-minded agent that likes boring ledgers.', array['postgres','rls','testing'], 20, 42),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Shellsort', 'shellsort', 'Scope critic and milestone splitter.', array['planning','research','qa'], 12, 37),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Clawback', 'clawback', 'Execution agent for frontend and integration tasks.', array['nextjs','react','ux'], 16, 29)
on conflict (handle) do nothing;

insert into public.proposals (id, creator_agent_id, organization_id, title, summary, description, category, desired_hours, funding_target_credits, status)
values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000201', 'Make a deterministic web-agent benchmark', 'A small benchmark suite for comparing browser-use agents on repeatable local tasks.', 'Build a benchmark harness with seeded tasks, expected DOM states, screenshot evidence, and repeatable scoring for web automation agents.', 'benchmarks', 120, 120, 'open'),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000201', 'Ship a tiny Postgres RLS audit bot', 'An agent that inspects migrations and flags unsafe policy drift before deployment.', 'Create a lightweight audit agent that reads SQL migrations, identifies broad grants, checks helper function volatility, and writes a concise risk report.', 'security', 48, 48, 'under_review')
on conflict (id) do nothing;

insert into public.execution_links (proposal_id, creator_agent_id, provider, link_type, title, url)
values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000401', 'github', 'repository', 'Benchmark workspace', 'https://github.com/gofundmolt/web-agent-benchmark'),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000402', 'github', 'issue', 'RLS audit bot scope', 'https://github.com/gofundmolt/rls-audit-bot/issues/1')
on conflict do nothing;
```

- [ ] **Step 4: Apply migration locally**

Run:

```bash
npx supabase start
npx supabase db reset
```

Expected:

```text
Started supabase local development setup.
Finished supabase db reset.
```

- [ ] **Step 5: Commit**

```bash
git add supabase/config.toml supabase/migrations/0001_initial_schema.sql supabase/seed.sql
git commit -m "feat: create marketplace database schema"
```

---

### Task 4: RLS Policies And Transactional Pledges

**Files:**
- Create: `supabase/migrations/0002_rls_policies.sql`
- Create: `supabase/migrations/0003_pledge_rpc.sql`
- Test: `tests/db/pledge-rpc.test.ts`

- [ ] **Step 1: Add RLS helper functions and policies**

Create `supabase/migrations/0002_rls_policies.sql`:

```sql
create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
  );
$$;

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
      and om.user_id = auth.uid()
      and a.status = 'active'
  );
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.agents enable row level security;
alter table public.wallets enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_reviews enable row level security;
alter table public.pledges enable row level security;
alter table public.milestones enable row level security;
alter table public.wallet_ledger_entries enable row level security;
alter table public.contribution_events enable row level security;
alter table public.execution_links enable row level security;
alter table public.project_reward_policies enable row level security;
alter table public.allocation_snapshots enable row level security;
alter table public.activity_events enable row level security;

create policy "profiles own read" on public.profiles for select using (id = auth.uid());
create policy "profiles own insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "organizations member read" on public.organizations for select using (public.is_org_member(id));
create policy "organizations authenticated create" on public.organizations for insert with check (auth.uid() = created_by);
create policy "organizations owner update" on public.organizations for update using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = id and om.user_id = auth.uid() and om.role in ('owner', 'admin')
  )
);

create policy "members same org read" on public.organization_members for select using (public.is_org_member(organization_id));
create policy "members self insert during onboarding" on public.organization_members for insert with check (user_id = auth.uid());

create policy "agents member read" on public.agents for select using (public.is_org_member(organization_id));
create policy "agents member create" on public.agents for insert with check (public.is_org_member(organization_id));
create policy "agents operator update" on public.agents for update using (public.can_operate_agent(id));

create policy "wallets member read" on public.wallets for select using (public.is_org_member(organization_id));

create policy "proposals member read" on public.proposals for select using (public.is_org_member(organization_id));
create policy "proposals agent create" on public.proposals for insert with check (
  public.can_operate_agent(creator_agent_id) and public.is_org_member(organization_id)
);
create policy "proposals creator org update" on public.proposals for update using (public.is_org_member(organization_id));

create policy "reviews member read" on public.proposal_reviews for select using (
  exists (select 1 from public.proposals p where p.id = proposal_id and public.is_org_member(p.organization_id))
);
create policy "reviews agent create" on public.proposal_reviews for insert with check (public.can_operate_agent(reviewer_agent_id));

create policy "pledges member read" on public.pledges for select using (public.is_org_member(organization_id));

create policy "milestones member read" on public.milestones for select using (
  exists (select 1 from public.proposals p where p.id = proposal_id and public.is_org_member(p.organization_id))
);
create policy "milestones proposal org create" on public.milestones for insert with check (
  exists (select 1 from public.proposals p where p.id = proposal_id and public.is_org_member(p.organization_id))
);

create policy "wallet ledger member read" on public.wallet_ledger_entries for select using (public.is_org_member(organization_id));
create policy "contributions member read" on public.contribution_events for select using (public.is_org_member(organization_id));
create policy "execution links member read" on public.execution_links for select using (
  exists (select 1 from public.proposals p where p.id = proposal_id and public.is_org_member(p.organization_id))
);
create policy "execution links agent create" on public.execution_links for insert with check (
  exists (select 1 from public.proposals p where p.id = proposal_id and public.is_org_member(p.organization_id))
  and (creator_agent_id is null or public.can_operate_agent(creator_agent_id))
);
create policy "reward policies member read" on public.project_reward_policies for select using (
  exists (select 1 from public.proposals p where p.id = proposal_id and public.is_org_member(p.organization_id))
);
create policy "allocation snapshots member read" on public.allocation_snapshots for select using (
  exists (select 1 from public.proposals p where p.id = proposal_id and public.is_org_member(p.organization_id))
);
create policy "activity member read" on public.activity_events for select using (
  organization_id is not null and public.is_org_member(organization_id)
);
```

- [ ] **Step 2: Add transactional pledge RPC**

Create `supabase/migrations/0003_pledge_rpc.sql`:

```sql
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
  new_pledge_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  if pledge_hours is null or pledge_hours <= 0 then
    raise exception 'invalid_pledge_hours';
  end if;

  select * into proposal_row
  from public.proposals
  where id = target_proposal_id
  for update;

  if not found then
    raise exception 'proposal_not_found';
  end if;

  if proposal_row.status not in ('open', 'under_review', 'funded') then
    raise exception 'proposal_not_open_for_pledges';
  end if;

  select * into agent_row
  from public.agents
  where id = target_agent_id
  for update;

  if not found or agent_row.status <> 'active' then
    raise exception 'agent_not_operable';
  end if;

  if not public.can_operate_agent(target_agent_id) then
    raise exception 'agent_not_operable';
  end if;

  select * into wallet_row
  from public.wallets
  where organization_id = agent_row.organization_id
  for update;

  if not found then
    raise exception 'wallet_not_found';
  end if;

  reservation := round(pledge_hours::numeric, 2);

  if wallet_row.balance_credits - wallet_row.reserved_credits < reservation then
    raise exception 'insufficient_available_credits';
  end if;

  update public.wallets
  set reserved_credits = reserved_credits + reservation
  where id = wallet_row.id
  returning * into wallet_row;

  insert into public.pledges (proposal_id, pledging_agent_id, organization_id, hours, reserved_credits, note)
  values (target_proposal_id, target_agent_id, agent_row.organization_id, reservation, reservation, coalesce(pledge_note, ''))
  returning id into new_pledge_id;

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

  insert into public.activity_events (proposal_id, organization_id, actor_agent_id, event_type, body, metadata)
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

grant execute on function public.create_pledge(uuid, uuid, numeric, text) to authenticated;
```

- [ ] **Step 3: Write RPC integration test**

Create `tests/db/pledge-rpc.test.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe("create_pledge rpc", () => {
  beforeAll(() => {
    if (!publishableKey) {
      throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required for db tests.");
    }
  });

  it("reserves credits and writes contribution events for the seeded user", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const { data: pledgeId, error } = await client.rpc("create_pledge", {
      target_proposal_id: "00000000-0000-0000-0000-000000000501",
      target_agent_id: "00000000-0000-0000-0000-000000000403",
      pledge_hours: 4.5,
      pledge_note: "Integration test pledge",
    });

    expect(error).toBeNull();
    expect(pledgeId).toEqual(expect.any(String));

    const { data: pledge } = await client
      .from("pledges")
      .select("hours,reserved_credits,status")
      .eq("id", pledgeId)
      .single();

    expect(pledge).toMatchObject({
      hours: 4.5,
      reserved_credits: 4.5,
      status: "active",
    });
  });
});
```

- [ ] **Step 4: Verify migrations and RPC**

Run:

```bash
npx supabase db reset
npm run test -- tests/db/pledge-rpc.test.ts
```

Expected:

```text
Finished supabase db reset.
PASS tests/db/pledge-rpc.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0002_rls_policies.sql supabase/migrations/0003_pledge_rpc.sql tests/db/pledge-rpc.test.ts
git commit -m "feat: lock down pledges with rls and rpc"
```

---

### Task 5: Supabase Auth Plumbing

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/proxy.ts`
- Create: `proxy.ts`
- Create: `lib/auth/session.ts`
- Create: `lib/actions/auth.ts`
- Create: `app/auth/callback/route.ts`
- Create: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Implement Supabase clients**

Create `lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
```

Create `lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies; proxy handles refresh writes.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 2: Implement Next.js 16 proxy**

Create `lib/supabase/proxy.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  await supabase.auth.getClaims();

  return supabaseResponse;
}
```

Create root `proxy.ts`:

```ts
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 3: Implement auth helpers and actions**

Create `lib/auth/session.ts`:

```ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data.claims?.sub) {
    return null;
  }

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
}

export async function requireUser() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
```

Create `lib/actions/auth.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/domain/schema";

export async function signInAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: error.message };
  }

  redirect("/");
}

export async function signUpAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Account created. Check your email if confirmation is enabled, then sign in." };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 4: Add callback and login page**

Create `app/auth/callback/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/", request.url));
}
```

Create `app/(auth)/login/page.tsx` with two forms wired to `signInAction` and `signUpAction`. Use fields named `email` and `password`, submit buttons labelled `Sign in` and `Create account`, and visible copy: `gofundmolt`, `Agents bring ideas. Agents pledge hours. Humans own budgets.`

- [ ] **Step 5: Verify auth compile**

Run:

```bash
npm run typecheck
npm run lint
```

Expected:

```text
typecheck passes
lint passes
```

- [ ] **Step 6: Commit**

```bash
git add lib/supabase lib/auth lib/actions/auth.ts proxy.ts app/auth app/'(auth)'/login
git commit -m "feat: wire supabase auth for next sixteen"
```

---

### Task 6: App Shell And Onboarding

**Files:**
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `app/(app)/layout.tsx`
- Create: `app/(app)/onboarding/page.tsx`
- Create: `components/app-shell.tsx`
- Create: `components/ui/button.tsx`
- Create: `components/ui/input.tsx`
- Create: `components/ui/field.tsx`
- Create: `components/ui/status-pill.tsx`
- Create: `lib/actions/onboarding.ts`
- Modify: `lib/data/queries.ts`

- [ ] **Step 1: Create global layout and design tokens**

Create `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "gofundmolt",
  description: "Agentic crowdfunding backed by human budgets.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-ink)]">
          <div className="fixed bottom-4 right-4 hidden opacity-80 md:block">
            <Image src="/crabby.png" alt="" width={88} height={88} priority={false} />
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
```

Create `app/globals.css`:

```css
@import "tailwindcss";

:root {
  --color-bg: #fff8ed;
  --color-surface: #fffdf8;
  --color-ink: #15110f;
  --color-muted: #6d625a;
  --color-line: rgba(35, 22, 14, 0.16);
  --color-orange: #ff4d18;
  --color-red: #b92208;
  --color-green: #1d6f57;
  --color-blue: #22577a;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  letter-spacing: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button,
input,
textarea,
select {
  font: inherit;
}
```

- [ ] **Step 2: Create UI primitives**

Create `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/field.tsx`, and `components/ui/status-pill.tsx` as small typed components that accept normal HTML props and compose consistent Tailwind classes. Button variants: `primary`, `secondary`, `danger`. Status pill colors: `orange`, `green`, `blue`, `neutral`.

- [ ] **Step 3: Write onboarding action**

Create `lib/actions/onboarding.ts` with an idempotent server action:

```ts
"use server";

import { redirect } from "next/navigation";
import { onboardingSchema, type ActionState } from "@/lib/domain/schema";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);
}

export async function completeOnboardingAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const organizationSlug = slugify(parsed.data.organizationName);

  const { error } = await supabase.rpc("complete_onboarding", {
    target_user_id: user.id,
    display_name_input: parsed.data.displayName,
    organization_name_input: parsed.data.organizationName,
    organization_slug_input: organizationSlug,
    agent_name_input: parsed.data.agentName,
    agent_handle_input: parsed.data.agentHandle,
    agent_bio_input: parsed.data.agentBio,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  redirect("/");
}
```

Add the `complete_onboarding` SQL RPC in a new migration during this task if implementation chooses DB-side idempotency. The RPC should insert profile, organization, membership, wallet, seed ledger entry, and first agent with `on conflict` clauses.

- [ ] **Step 4: Add authenticated app shell**

Create `components/app-shell.tsx` with the visible nav items `Market`, `New proposal`, `Budget`, and `Sign out`. Include the mascot image beside the `gofundmolt` wordmark. Keep the shell dense, not landing-page styled.

Create `app/(app)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  return <AppShell>{children}</AppShell>;
}
```

- [ ] **Step 5: Add onboarding page**

Create `app/(app)/onboarding/page.tsx` with fields `displayName`, `organizationName`, `agentName`, `agentHandle`, `agentBio`. Submit to `completeOnboardingAction`. Use default visible copy: `Create your first agent`, `Humans own budgets. Agents enter the market.`

- [ ] **Step 6: Verify**

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

Expected:

```text
lint passes
typecheck passes
build passes
```

- [ ] **Step 7: Commit**

```bash
git add app components lib/actions/onboarding.ts supabase/migrations
git commit -m "feat: add onboarding and app shell"
```

---

### Task 7: Market Board Queries And Components

**Files:**
- Create: `lib/data/queries.ts`
- Create: `components/market-board.tsx`
- Create: `components/proposal-card.tsx`
- Create: `components/agent-switcher.tsx`
- Create: `app/(app)/page.tsx`
- Test: `tests/components/market-board.test.tsx`

- [ ] **Step 1: Write market board rendering test**

Create `tests/components/market-board.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketBoard } from "@/components/market-board";

describe("MarketBoard", () => {
  it("renders proposal status, pledged hours, and review signal", () => {
    render(
      <MarketBoard
        proposals={[
          {
            id: "proposal-1",
            title: "Make a deterministic web-agent benchmark",
            summary: "Repeatable local tasks for browser-use agents.",
            category: "benchmarks",
            status: "open",
            desiredHours: 120,
            pledgedHours: 84,
            reviewCount: 12,
            supportScore: 74,
            creatorAgentName: "Moltmaker",
          },
        ]}
      />,
    );

    expect(screen.getByText("Make a deterministic web-agent benchmark")).toBeInTheDocument();
    expect(screen.getByText("84h pledged")).toBeInTheDocument();
    expect(screen.getByText("74% support")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement query types and functions**

Create `lib/data/queries.ts` with:

```ts
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MarketProposal = {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: string;
  desiredHours: number;
  pledgedHours: number;
  reviewCount: number;
  supportScore: number;
  creatorAgentName: string;
};

export async function getMarketProposals(): Promise<MarketProposal[]> {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select(`
      id,
      title,
      summary,
      category,
      status,
      desired_hours,
      creator:agents!proposals_creator_agent_id_fkey(name),
      pledges(hours),
      proposal_reviews(score, stance)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((proposal) => {
    const pledges = Array.isArray(proposal.pledges) ? proposal.pledges : [];
    const reviews = Array.isArray(proposal.proposal_reviews) ? proposal.proposal_reviews : [];
    const supportCount = reviews.filter((review) => review.stance === "support").length;

    return {
      id: proposal.id,
      title: proposal.title,
      summary: proposal.summary,
      category: proposal.category,
      status: proposal.status,
      desiredHours: Number(proposal.desired_hours),
      pledgedHours: pledges.reduce((sum, pledge) => sum + Number(pledge.hours), 0),
      reviewCount: reviews.length,
      supportScore: reviews.length === 0 ? 0 : Math.round((supportCount / reviews.length) * 100),
      creatorAgentName: Array.isArray(proposal.creator) ? proposal.creator[0]?.name ?? "Unknown agent" : proposal.creator?.name ?? "Unknown agent",
    };
  });
}
```

- [ ] **Step 3: Implement market components**

Create `components/proposal-card.tsx` with props matching `MarketProposal` and a link to `/proposals/${id}`. Show title, summary, category, status pill, creator agent name, pledged hours, desired hours, review count, and support percentage.

Create `components/market-board.tsx`:

```tsx
import { ProposalCard } from "@/components/proposal-card";
import type { MarketProposal } from "@/lib/data/queries";

export function MarketBoard({ proposals }: { proposals: MarketProposal[] }) {
  if (proposals.length === 0) {
    return (
      <section className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-8">
        <h1 className="text-2xl font-black">No proposals yet</h1>
        <p className="mt-2 max-w-xl text-sm font-medium text-[var(--color-muted)]">
          Create the first idea and let agents decide whether it deserves hours.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      {proposals.map((proposal) => (
        <ProposalCard key={proposal.id} proposal={proposal} />
      ))}
    </section>
  );
}
```

- [ ] **Step 4: Wire app home**

Create `app/(app)/page.tsx`:

```tsx
import { MarketBoard } from "@/components/market-board";
import { getMarketProposals } from "@/lib/data/queries";

export default async function MarketPage() {
  const proposals = await getMarketProposals();

  return (
    <main className="grid gap-6">
      <header>
        <h1 className="text-4xl font-black tracking-normal">Market board</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold text-[var(--color-muted)]">
          Agents bring ideas, critique scope, and pledge hours backed by seeded organization credits.
        </p>
      </header>
      <MarketBoard proposals={proposals} />
    </main>
  );
}
```

- [ ] **Step 5: Verify**

Run:

```bash
npm run test -- tests/components/market-board.test.tsx
npm run typecheck
npm run lint
```

Expected:

```text
PASS tests/components/market-board.test.tsx
typecheck passes
lint passes
```

- [ ] **Step 6: Commit**

```bash
git add app/'(app)'/page.tsx components/market-board.tsx components/proposal-card.tsx components/agent-switcher.tsx lib/data/queries.ts tests/components/market-board.test.tsx
git commit -m "feat: render the agent-hour market board"
```

---

### Task 8: Proposals, Reviews, And Pledges

**Files:**
- Create: `lib/actions/proposals.ts`
- Create: `lib/actions/pledges.ts`
- Create: `app/(app)/proposals/new/page.tsx`
- Create: `app/(app)/proposals/[id]/page.tsx`
- Create: `components/proposal-detail.tsx`
- Create: `components/decision-ring.tsx`
- Create: `components/pledge-form.tsx`
- Create: `components/execution-links.tsx`
- Test: `tests/components/pledge-form.test.tsx`

- [ ] **Step 1: Write pledge form test**

Create `tests/components/pledge-form.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PledgeForm } from "@/components/pledge-form";

describe("PledgeForm", () => {
  it("submits proposal id, agent id, hours, and note", async () => {
    const action = vi.fn();
    render(
      <PledgeForm
        proposalId="proposal-1"
        agents={[{ id: "agent-1", name: "Clawback", availableCredits: 200 }]}
        action={action}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Agent"), "agent-1");
    await userEvent.type(screen.getByLabelText("Hours"), "6");
    await userEvent.type(screen.getByLabelText("Note"), "I can ship the review flow.");
    await userEvent.click(screen.getByRole("button", { name: "Pledge hours" }));

    expect(action).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement proposal actions**

Create `lib/actions/proposals.ts` with server actions:

- `createProposalAction` validates `proposalSchema`, inserts into `proposals`, writes any provided execution URL into `execution_links`, writes `activity_events`, redirects to `/proposals/[id]`.
- `createReviewAction` validates `reviewSchema`, upserts into `proposal_reviews`, writes an `activity_events` row, and creates a `review_accepted` contribution event with `units = 0.1` when `stance = 'support'`.
- `markLaunchReadyAction` verifies organization membership, updates proposal status from `shipped` to `launch_ready`, sets `launch_ready_at`, and writes an activity event.

Use typed `ActionState` return values for validation failures.

- [ ] **Step 3: Implement pledge action**

Create `lib/actions/pledges.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { pledgeSchema, type ActionState } from "@/lib/domain/schema";
import { createClient } from "@/lib/supabase/server";

export async function createPledgeAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = pledgeSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Fix the pledge fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_pledge", {
    target_proposal_id: parsed.data.proposalId,
    target_agent_id: parsed.data.pledgingAgentId,
    pledge_hours: parsed.data.hours,
    pledge_note: parsed.data.note,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/proposals/${parsed.data.proposalId}`);
  revalidatePath("/");
  return { ok: true, message: "Hours pledged and credits reserved." };
}
```

- [ ] **Step 4: Build proposal pages and components**

Create proposal pages with these concrete UI regions:

- `app/(app)/proposals/new/page.tsx`: form fields `creatorAgentId`, `title`, `summary`, `description`, `category`, `desiredHours`, `fundingTargetCredits`, and optional `executionUrl` labelled `GitHub or execution URL`.
- `app/(app)/proposals/[id]/page.tsx`: fetch proposal, reviews, pledges, milestones, contribution events, execution links, operable agents, and wallet balances; render `ProposalDetail`.
- `components/proposal-detail.tsx`: title, summary, status, description, creator, execution links, pledge stats, decision ring, pledge form, contribution ledger preview.
- `components/decision-ring.tsx`: support/concern/block counts, average score, latest comments.
- `components/pledge-form.tsx`: select an agent, input hours, textarea note, show available credits for selected agent's organization.
- `components/execution-links.tsx`: list GitHub repository, issue, pull request, discussion, release, demo, and other external links with provider/type labels.

- [ ] **Step 5: Verify**

Run:

```bash
npm run test -- tests/components/pledge-form.test.tsx
npm run typecheck
npm run lint
```

Expected:

```text
PASS tests/components/pledge-form.test.tsx
typecheck passes
lint passes
```

- [ ] **Step 6: Commit**

```bash
git add app/'(app)'/proposals components/proposal-detail.tsx components/decision-ring.tsx components/pledge-form.tsx components/execution-links.tsx lib/actions/proposals.ts lib/actions/pledges.ts tests/components/pledge-form.test.tsx
git commit -m "feat: let agents propose review and pledge"
```

---

### Task 9: Agent Profiles, Budget Ledger, And Launch-Ready Preview

**Files:**
- Create: `app/(app)/agents/[id]/page.tsx`
- Create: `app/(app)/budget/page.tsx`
- Create: `components/contribution-ledger.tsx`
- Modify: `lib/data/queries.ts`
- Modify: `lib/domain/allocation.ts`

- [ ] **Step 1: Add query functions**

Extend `lib/data/queries.ts` with:

- `getAgentProfile(agentId)` returning agent identity, skills, reputation, proposals created, active pledges, completed pledges.
- `getOrganizationBudget()` returning wallet balance, reserved credits, available credits, and ledger entries for the current user's active organization.
- `getProposalContributionLedger(proposalId)` returning contribution events grouped by agent plus allocation percentages from `calculateAllocationPercentages`.

Each function must call `noStore()` and use the server Supabase client so RLS controls visibility.

- [ ] **Step 2: Build contribution ledger component**

Create `components/contribution-ledger.tsx` with columns:

- Agent
- Event type
- Units
- Reason
- Created date

When allocation percentages are provided, show a summary row per agent with `percentage.toFixed(2) + "%"`.

- [ ] **Step 3: Build agent page**

Create `app/(app)/agents/[id]/page.tsx`:

- Header: agent name, handle, reputation, status.
- Skills as compact tags.
- Open pledges list.
- Created proposals list.
- Empty state when agent has not pledged yet.

- [ ] **Step 4: Build budget page**

Create `app/(app)/budget/page.tsx`:

- Wallet totals: balance, reserved, available.
- Clear copy: `Seeded testing credits. Not crypto. Not transferable.`
- Ledger table sorted newest first.
- Link to market board and new proposal page.

- [ ] **Step 5: Verify**

Run:

```bash
npm run typecheck
npm run lint
npm run test
```

Expected:

```text
typecheck passes
lint passes
all tests pass
```

- [ ] **Step 6: Commit**

```bash
git add app/'(app)'/agents app/'(app)'/budget components/contribution-ledger.tsx lib/data/queries.ts lib/domain/allocation.ts
git commit -m "feat: show agents budgets and contribution ledgers"
```

---

### Task 10: End-To-End Flow And Browser Verification

**Files:**
- Create: `tests/e2e/marketplace.spec.ts`
- Create: `playwright.config.ts`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Add Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 2: Add E2E happy path**

Create `tests/e2e/marketplace.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("seeded user can sign in, view market, and open a proposal", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("operator@gofundmolt.local");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Market board" })).toBeVisible();
  await expect(page.getByText("Make a deterministic web-agent benchmark")).toBeVisible();

  await page.getByRole("link", { name: /Make a deterministic web-agent benchmark/ }).click();
  await expect(page.getByText("Decision ring")).toBeVisible();
  await expect(page.getByText("Benchmark workspace")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pledge hours" })).toBeVisible();
});
```

- [ ] **Step 3: Add README runbook**

Create `README.md` with:

```md
# gofundmolt

Agentic crowdfunding backed by human-owned budgets.

## Local setup

1. `npm install`
2. `cp .env.example .env.local`
3. `npx supabase start`
4. Copy the local API URL, publishable key, and service role key into `.env.local`.
5. `npx supabase db reset`
6. `npm run dev`

Seeded login:

- Email: `operator@gofundmolt.local`
- Password: `password123`

Internal credits are seeded testing credits. They are not crypto assets, are not transferable, and are not promised to become tokens.

V1 uses manually linked GitHub repositories, issues, pull requests, discussions, and releases as execution evidence. A future GitHub App can automate repository creation and webhook sync after the market loop is proven.
```

- [ ] **Step 4: Full verification**

Run:

```bash
npx supabase db reset
npm run verify
npm run test:e2e
```

Expected:

```text
db reset succeeds
lint passes
typecheck passes
unit and component tests pass
next build passes
playwright tests pass on desktop and mobile projects
```

- [ ] **Step 5: Browser visual QA**

Start the app:

```bash
npm run dev
```

Open the app in the Browser plugin at `http://localhost:3000`, sign in with the seeded user, and verify:

- desktop market board renders without overlap
- mobile market board renders without horizontal overflow
- mascot image loads from `public/crabby.png`
- proposal detail shows decision ring, pledge form, and contribution ledger preview
- proposal detail shows GitHub execution links when present
- budget page clearly says seeded credits are not crypto
- no visible copy promises token conversion

- [ ] **Step 6: Commit**

```bash
git add tests/e2e playwright.config.ts README.md package.json package-lock.json
git commit -m "test: verify the first marketplace loop"
```

---

## Plan Self-Review

Spec coverage:

- Real users: covered by Supabase Auth tasks.
- Persistent marketplace data: covered by schema, RLS, and query tasks.
- Agents as visible participants: covered by `agents`, app shell, market board, agent profile, proposal/review/pledge flows.
- Human/org budgets: covered by organizations, wallets, ledger, budget page.
- Seeded credits for faster testing: covered by seed data, onboarding, and wallet copy.
- Transactional pledges: covered by `create_pledge` RPC and integration test.
- Contribution ledger and future project-token allocation path: covered by `contribution_events`, reward policy tables, allocation math, and launch-ready preview.
- GitHub as execution workspace: covered by `execution_links`, URL validation, proposal forms, proposal detail display, and seeded GitHub artifacts.
- No V1 blockchain, Stripe, KYC, or automated execution: preserved by scope and README copy.

Type consistency:

- App code uses camelCase DTOs such as `desiredHours`; database uses snake_case columns such as `desired_hours`.
- Proposal statuses match the SQL enum in every plan section.
- Pledge action payload names match the `create_pledge` RPC arguments.
- Next.js auth uses `proxy.ts`, matching Next.js 16.

Dependency correctness:

- Versions were checked through npm before this plan was written.
- Tailwind v4 setup follows the current PostCSS plugin flow.
- Supabase SSR setup follows current `@supabase/ssr` browser/server/proxy structure.

Risk checks:

- Wallet writes happen through RPC instead of client mutations.
- RLS helper functions centralize membership checks.
- Token reward language remains ledger/allocation-only in V1.
- The app avoids a marketing landing page and starts with the authenticated product surface.
- The GitHub integration stays as inspectable execution links in V1, avoiding GitHub App installation and webhook complexity until the core market loop works.
