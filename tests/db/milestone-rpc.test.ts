import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const targetProposalId = "00000000-0000-0000-0000-000000000501";
const actorAgentId = "00000000-0000-0000-0000-000000000402";
const successfulClaimingAgentId = "00000000-0000-0000-0000-000000000401";
const claimingAgentId = "00000000-0000-0000-0000-000000000403";

const expectedMilestoneActivityEventType = "milestone_created";
const expectedClaimActivityEventType = "milestone_claimed";
const expectedCompletionActivityEventType = "milestone_completed";
const expectedAcceptanceActivityEventType = "milestone_accepted";
const expectedSettlementActivityEventType = "milestone_settled";
const expectedWorkAcceptedEventType = "work_accepted";
const expectedSettleLedgerEntryType = "settle";

type TestDatabase = {
  public: {
    Tables: Record<
      string,
      {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      }
    >;
    Views: Record<string, never>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, never>;
  };
};
type TestSupabaseClient = SupabaseClient<TestDatabase>;

async function createAcceptedMilestone({
  client,
  title,
  targetHours,
  claimingAgentId: targetClaimingAgentId = claimingAgentId,
  acceptingAgentId = actorAgentId,
}: {
  client: TestSupabaseClient;
  title: string;
  targetHours: number;
  claimingAgentId?: string;
  acceptingAgentId?: string;
}) {
  const completionEvidence =
    "Delivered in https://github.com/water-bear86/gofundmolt/pull/102 with settlement-ready evidence.";
  const acceptanceNote = "Reviewed evidence and accepted this work package for settlement.";

  const { data: milestoneId, error: createError } = await client.rpc("create_milestone", {
    target_proposal_id: targetProposalId,
    target_actor_agent_id: actorAgentId,
    milestone_title: title,
    milestone_description: "Produce accepted work that can be settled from reserved credits.",
    milestone_target_hours: targetHours,
    milestone_due_date: null,
  });

  expect(createError).toBeNull();
  expect(milestoneId).toEqual(expect.any(String));

  const { error: claimError } = await client.rpc("claim_milestone", {
    target_milestone_id: milestoneId,
    target_claiming_agent_id: targetClaimingAgentId,
  });

  expect(claimError).toBeNull();

  const { error: completeError } = await client.rpc("submit_milestone_evidence", {
    target_milestone_id: milestoneId,
    target_actor_agent_id: targetClaimingAgentId,
    completion_evidence: completionEvidence,
  });

  expect(completeError).toBeNull();

  const { error: acceptError } = await client.rpc("accept_milestone_completion", {
    target_milestone_id: milestoneId,
    target_accepting_agent_id: acceptingAgentId,
    acceptance_note: acceptanceNote,
  });

  expect(acceptError).toBeNull();

  return milestoneId as string;
}

async function getSeedWallet(client: TestSupabaseClient) {
  const { data, error } = await client
    .from("wallets")
    .select("id,balance_credits,reserved_credits")
    .eq("organization_id", "00000000-0000-0000-0000-000000000201")
    .single();

  expect(error).toBeNull();
  expect(data).not.toBeNull();

  return {
    id: String(data!.id),
    balanceCredits: Number(data!.balance_credits),
    reservedCredits: Number(data!.reserved_credits),
  };
}

describe("create_milestone rpc", () => {
  beforeAll(() => {
    if (!publishableKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required for db tests.",
      );
    }
  });

  it("rejects unauthenticated milestone creation", async () => {
    const client = createClient(supabaseUrl, publishableKey!);

    const { error } = await client.rpc("create_milestone", {
      target_proposal_id: targetProposalId,
      target_actor_agent_id: actorAgentId,
      milestone_title: "Unauthenticated milestone",
      milestone_description:
        "Anonymous milestone creation should not be accepted.",
      milestone_target_hours: 3,
      milestone_due_date: null,
    });

    expect(error).not.toBeNull();
  });

  it("creates a planned milestone and records activity for the seeded operator", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const title = `RPC milestone ${crypto.randomUUID().slice(0, 8)}`;

    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const { count: activityCountBefore, error: activityCountError } = await client
      .from("activity_events")
      .select("id", { count: "exact", head: true })
      .eq("proposal_id", targetProposalId)
      .eq("actor_agent_id", actorAgentId)
      .eq("event_type", expectedMilestoneActivityEventType);

    expect(activityCountError).toBeNull();

    const directInsert = await client.from("milestones").insert({
      proposal_id: targetProposalId,
      title: "Direct milestone insert should fail",
      description:
        "Direct milestone inserts would bypass transactional side effects, so clients should use the RPC.",
      target_hours: 1,
    });

    expect(directInsert.error).not.toBeNull();

    const { data: milestoneId, error } = await client.rpc("create_milestone", {
      target_proposal_id: targetProposalId,
      target_actor_agent_id: actorAgentId,
      milestone_title: title,
      milestone_description:
        "Split the benchmark work into an inspectable implementation milestone.",
      milestone_target_hours: 6.5,
      milestone_due_date: "2026-06-15",
    });

    expect(error).toBeNull();
    expect(milestoneId).toEqual(expect.any(String));

    const [{ data: milestone, error: milestoneError }, { data: activity }] =
      await Promise.all([
        client
          .from("milestones")
          .select("proposal_id,title,description,target_hours,due_date,status")
          .eq("id", milestoneId)
          .single(),
        client
          .from("activity_events")
          .select("event_type", { count: "exact" })
          .eq("proposal_id", targetProposalId)
          .eq("actor_agent_id", actorAgentId)
          .eq("event_type", expectedMilestoneActivityEventType),
      ]);

    expect(milestoneError).toBeNull();
    expect(milestone).toMatchObject({
      proposal_id: targetProposalId,
      title,
      description:
        "Split the benchmark work into an inspectable implementation milestone.",
      target_hours: 6.5,
      due_date: "2026-06-15",
      status: "planned",
    });
    expect(activity?.length ?? 0).toBeGreaterThan(activityCountBefore ?? 0);
  });

  it("claims a planned milestone and records the assigned agent", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const title = `Claimable milestone ${crypto.randomUUID().slice(0, 8)}`;

    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const { data: milestoneId, error: createError } = await client.rpc("create_milestone", {
      target_proposal_id: targetProposalId,
      target_actor_agent_id: actorAgentId,
      milestone_title: title,
      milestone_description: "Prepare the runnable task harness and acceptance checks.",
      milestone_target_hours: 3.25,
      milestone_due_date: null,
    });

    expect(createError).toBeNull();
    expect(milestoneId).toEqual(expect.any(String));

    const directUpdate = await client
      .from("milestones")
      .update({ status: "active" })
      .eq("id", milestoneId)
      .select("status");

    expect(directUpdate.error).toBeNull();
    expect(directUpdate.data).toEqual([]);

    const { data: milestoneAfterDirectUpdate, error: milestoneAfterDirectUpdateError } = await client
      .from("milestones")
      .select("status")
      .eq("id", milestoneId)
      .single();

    expect(milestoneAfterDirectUpdateError).toBeNull();
    expect(milestoneAfterDirectUpdate?.status).toBe("planned");

    const { data: claimedMilestoneId, error: claimError } = await client.rpc("claim_milestone", {
      target_milestone_id: milestoneId,
      target_claiming_agent_id: successfulClaimingAgentId,
    });

    expect(claimError).toBeNull();
    expect(claimedMilestoneId).toBe(milestoneId);

    const [{ data: milestone, error: milestoneError }, { data: activity }] =
      await Promise.all([
        client
          .from("milestones")
          .select("status,claimed_agent_id,claimed_at")
          .eq("id", milestoneId)
          .single(),
        client
          .from("activity_events")
          .select("event_type", { count: "exact" })
          .eq("proposal_id", targetProposalId)
          .eq("actor_agent_id", successfulClaimingAgentId)
          .eq("event_type", expectedClaimActivityEventType)
          .contains("metadata", { milestone_id: milestoneId }),
      ]);

    expect(milestoneError).toBeNull();
    expect(milestone).toMatchObject({
      status: "active",
      claimed_agent_id: successfulClaimingAgentId,
    });
    expect(milestone?.claimed_at).toEqual(expect.any(String));
    expect(activity).toHaveLength(1);
  });

  it("rejects claims that exceed the agent's surplus compute capacity", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const title = `Oversized milestone ${crypto.randomUUID().slice(0, 8)}`;

    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const { data: milestoneId, error: createError } = await client.rpc("create_milestone", {
      target_proposal_id: targetProposalId,
      target_actor_agent_id: actorAgentId,
      milestone_title: title,
      milestone_description: "Attempt to overdraw the claiming agent's surplus compute pool.",
      milestone_target_hours: 8,
      milestone_due_date: null,
    });

    expect(createError).toBeNull();
    expect(milestoneId).toEqual(expect.any(String));

    const { error: claimError } = await client.rpc("claim_milestone", {
      target_milestone_id: milestoneId,
      target_claiming_agent_id: claimingAgentId,
    });

    expect(claimError).not.toBeNull();
    expect(claimError?.message).toBe("agent_surplus_capacity_exceeded");

    const { data: milestone, error: milestoneError } = await client
      .from("milestones")
      .select("status,claimed_agent_id,claimed_at")
      .eq("id", milestoneId)
      .single();

    expect(milestoneError).toBeNull();
    expect(milestone).toMatchObject({
      status: "planned",
      claimed_agent_id: null,
      claimed_at: null,
    });
  });

  it("submits completion evidence for the claimed milestone and records activity", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const title = `Completable milestone ${crypto.randomUUID().slice(0, 8)}`;
    const completionEvidence =
      "Implemented in https://github.com/water-bear86/gofundmolt/pull/99 with tests and browser QA.";

    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const { data: milestoneId, error: createError } = await client.rpc("create_milestone", {
      target_proposal_id: targetProposalId,
      target_actor_agent_id: actorAgentId,
      milestone_title: title,
      milestone_description: "Deliver a verifiable implementation package with reviewable evidence.",
      milestone_target_hours: 0.01,
      milestone_due_date: null,
    });

    expect(createError).toBeNull();
    expect(milestoneId).toEqual(expect.any(String));

    const { error: claimError } = await client.rpc("claim_milestone", {
      target_milestone_id: milestoneId,
      target_claiming_agent_id: claimingAgentId,
    });

    expect(claimError).toBeNull();

    const directUpdate = await client
      .from("milestones")
      .update({ status: "completed", completion_evidence: completionEvidence })
      .eq("id", milestoneId)
      .select("status,completion_evidence");

    expect(directUpdate.error).toBeNull();
    expect(directUpdate.data).toEqual([]);

    const { data: completedMilestoneId, error: completeError } = await client.rpc("submit_milestone_evidence", {
      target_milestone_id: milestoneId,
      target_actor_agent_id: claimingAgentId,
      completion_evidence: completionEvidence,
    });

    expect(completeError).toBeNull();
    expect(completedMilestoneId).toBe(milestoneId);

    const [{ data: milestone, error: milestoneError }, { data: activity }] =
      await Promise.all([
        client
          .from("milestones")
          .select("status,claimed_agent_id,completion_evidence")
          .eq("id", milestoneId)
          .single(),
        client
          .from("activity_events")
          .select("event_type", { count: "exact" })
          .eq("proposal_id", targetProposalId)
          .eq("actor_agent_id", claimingAgentId)
          .eq("event_type", expectedCompletionActivityEventType)
          .contains("metadata", { milestone_id: milestoneId }),
      ]);

    expect(milestoneError).toBeNull();
    expect(milestone).toMatchObject({
      status: "completed",
      claimed_agent_id: claimingAgentId,
      completion_evidence: completionEvidence,
    });
    expect(activity).toHaveLength(1);
  });

  it("accepts completed milestone evidence and records accepted work contribution units", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const title = `Acceptable milestone ${crypto.randomUUID().slice(0, 8)}`;
    const completionEvidence =
      "Delivered in https://github.com/water-bear86/gofundmolt/pull/100 with acceptance notes.";
    const acceptanceNote = "Reviewed evidence, tests, and browser behavior. Work accepted.";
    const targetHours = 0.02;

    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const { data: milestoneId, error: createError } = await client.rpc("create_milestone", {
      target_proposal_id: targetProposalId,
      target_actor_agent_id: actorAgentId,
      milestone_title: title,
      milestone_description: "Produce a finished package that another agent can accept.",
      milestone_target_hours: targetHours,
      milestone_due_date: null,
    });

    expect(createError).toBeNull();
    expect(milestoneId).toEqual(expect.any(String));

    const { error: claimError } = await client.rpc("claim_milestone", {
      target_milestone_id: milestoneId,
      target_claiming_agent_id: claimingAgentId,
    });

    expect(claimError).toBeNull();

    const { error: completeError } = await client.rpc("submit_milestone_evidence", {
      target_milestone_id: milestoneId,
      target_actor_agent_id: claimingAgentId,
      completion_evidence: completionEvidence,
    });

    expect(completeError).toBeNull();

    const directUpdate = await client
      .from("milestones")
      .update({ status: "accepted", acceptance_note: acceptanceNote })
      .eq("id", milestoneId)
      .select("status,acceptance_note");

    expect(directUpdate.error).toBeNull();
    expect(directUpdate.data).toEqual([]);

    const { data: acceptedMilestoneId, error: acceptError } = await client.rpc("accept_milestone_completion", {
      target_milestone_id: milestoneId,
      target_accepting_agent_id: actorAgentId,
      acceptance_note: acceptanceNote,
    });

    expect(acceptError).toBeNull();
    expect(acceptedMilestoneId).toBe(milestoneId);

    const [
      { data: milestone, error: milestoneError },
      { data: contributions, error: contributionError },
      { data: activity, error: activityError },
    ] = await Promise.all([
      client
        .from("milestones")
        .select("status,claimed_agent_id,accepted_agent_id,accepted_at,acceptance_note")
        .eq("id", milestoneId)
        .single(),
      client
        .from("contribution_events")
        .select("event_type,actor_agent_id,units,source_table,source_id")
        .eq("proposal_id", targetProposalId)
        .eq("actor_agent_id", claimingAgentId)
        .eq("event_type", expectedWorkAcceptedEventType)
        .eq("source_table", "milestones")
        .eq("source_id", milestoneId),
      client
        .from("activity_events")
        .select("event_type")
        .eq("proposal_id", targetProposalId)
        .eq("actor_agent_id", actorAgentId)
        .eq("event_type", expectedAcceptanceActivityEventType)
        .contains("metadata", { milestone_id: milestoneId }),
    ]);

    expect(milestoneError).toBeNull();
    expect(contributionError).toBeNull();
    expect(activityError).toBeNull();
    expect(milestone).toMatchObject({
      status: "accepted",
      claimed_agent_id: claimingAgentId,
      accepted_agent_id: actorAgentId,
      acceptance_note: acceptanceNote,
    });
    expect(milestone?.accepted_at).toEqual(expect.any(String));
    expect(contributions).toHaveLength(1);
    expect(contributions?.[0]).toMatchObject({
      event_type: expectedWorkAcceptedEventType,
      actor_agent_id: claimingAgentId,
      source_table: "milestones",
      source_id: milestoneId,
    });
    expect(Number(contributions?.[0]?.units)).toBe(targetHours);
    expect(activity).toHaveLength(1);
  });

  it("rejects acceptance by the same agent that claimed the work", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const title = `Self acceptance guard ${crypto.randomUUID().slice(0, 8)}`;
    const completionEvidence =
      "Delivered in https://github.com/water-bear86/gofundmolt/pull/101 with self-acceptance guard coverage.";

    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const { data: milestoneId, error: createError } = await client.rpc("create_milestone", {
      target_proposal_id: targetProposalId,
      target_actor_agent_id: actorAgentId,
      milestone_title: title,
      milestone_description: "Produce a completed package that must be accepted by another agent.",
      milestone_target_hours: 0.01,
      milestone_due_date: null,
    });

    expect(createError).toBeNull();
    expect(milestoneId).toEqual(expect.any(String));

    const { error: claimError } = await client.rpc("claim_milestone", {
      target_milestone_id: milestoneId,
      target_claiming_agent_id: claimingAgentId,
    });

    expect(claimError).toBeNull();

    const { error: completeError } = await client.rpc("submit_milestone_evidence", {
      target_milestone_id: milestoneId,
      target_actor_agent_id: claimingAgentId,
      completion_evidence: completionEvidence,
    });

    expect(completeError).toBeNull();

    const { error: acceptError } = await client.rpc("accept_milestone_completion", {
      target_milestone_id: milestoneId,
      target_accepting_agent_id: claimingAgentId,
      acceptance_note: "Trying to accept my own work should be blocked.",
    });

    expect(acceptError).not.toBeNull();
    expect(acceptError?.message).toBe("milestone_self_acceptance_blocked");

    const [{ data: milestone, error: milestoneError }, { data: contributions, error: contributionError }] =
      await Promise.all([
        client.from("milestones").select("status,accepted_agent_id,accepted_at").eq("id", milestoneId).single(),
        client
          .from("contribution_events")
          .select("event_type")
          .eq("proposal_id", targetProposalId)
          .eq("event_type", expectedWorkAcceptedEventType)
          .eq("source_table", "milestones")
          .eq("source_id", milestoneId),
      ]);

    expect(milestoneError).toBeNull();
    expect(contributionError).toBeNull();
    expect(milestone).toMatchObject({
      status: "completed",
      accepted_agent_id: null,
      accepted_at: null,
    });
    expect(contributions).toEqual([]);
  });

  it("rejects settlement before a milestone is accepted", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const title = `Premature settlement guard ${crypto.randomUUID().slice(0, 8)}`;

    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const { data: milestoneId, error: createError } = await client.rpc("create_milestone", {
      target_proposal_id: targetProposalId,
      target_actor_agent_id: actorAgentId,
      milestone_title: title,
      milestone_description: "Create work that should not settle before acceptance.",
      milestone_target_hours: 0.03,
      milestone_due_date: null,
    });

    expect(createError).toBeNull();
    expect(milestoneId).toEqual(expect.any(String));

    const { error: settleError } = await client.rpc("settle_accepted_milestone", {
      target_milestone_id: milestoneId,
      target_settling_agent_id: actorAgentId,
      settlement_note: "Premature settlement should be blocked.",
    });

    expect(settleError).not.toBeNull();
    expect(settleError?.message).toBe("milestone_not_settlement_ready");

    const { data: milestone, error: milestoneError } = await client
      .from("milestones")
      .select("status,settled_agent_id,settled_at,settled_credits")
      .eq("id", milestoneId)
      .single();

    expect(milestoneError).toBeNull();
    expect(milestone).toMatchObject({
      status: "planned",
      settled_agent_id: null,
      settled_at: null,
      settled_credits: null,
    });
  });

  it("settles accepted milestone work from reserved credits and records the ledger trail", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const targetHours = 0.04;
    const title = `Settlement happy path ${crypto.randomUUID().slice(0, 8)}`;
    const settlementNote = "Settlement approved after accepted evidence review.";

    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const { error: pledgeError } = await client.rpc("create_pledge", {
      target_proposal_id: targetProposalId,
      target_agent_id: actorAgentId,
      pledge_hours: targetHours,
      pledge_note: "Reserve credits for settlement test.",
    });

    expect(pledgeError).toBeNull();

    const walletBeforeSettlement = await getSeedWallet(client);
    const milestoneId = await createAcceptedMilestone({ client, title, targetHours });

    const directUpdate = await client
      .from("milestones")
      .update({
        status: "settled",
        settled_agent_id: actorAgentId,
        settled_credits: targetHours,
      })
      .eq("id", milestoneId)
      .select("status,settled_agent_id,settled_credits");

    expect(directUpdate.error).toBeNull();
    expect(directUpdate.data).toEqual([]);

    const { data: settledMilestoneId, error: settleError } = await client.rpc("settle_accepted_milestone", {
      target_milestone_id: milestoneId,
      target_settling_agent_id: actorAgentId,
      settlement_note: settlementNote,
    });

    expect(settleError).toBeNull();
    expect(settledMilestoneId).toBe(milestoneId);

    const [
      { data: milestone, error: milestoneError },
      { data: wallet, error: walletError },
      { data: ledger, error: ledgerError },
      { data: activity, error: activityError },
    ] = await Promise.all([
      client
        .from("milestones")
        .select("status,settled_agent_id,settled_at,settled_credits,settlement_note")
        .eq("id", milestoneId)
        .single(),
      client
        .from("wallets")
        .select("balance_credits,reserved_credits")
        .eq("id", walletBeforeSettlement.id)
        .single(),
      client
        .from("wallet_ledger_entries")
        .select("entry_type,amount_credits,balance_after,reserved_after,source_table,source_id,memo")
        .eq("wallet_id", walletBeforeSettlement.id)
        .eq("entry_type", expectedSettleLedgerEntryType)
        .eq("source_table", "milestones")
        .eq("source_id", milestoneId),
      client
        .from("activity_events")
        .select("event_type")
        .eq("proposal_id", targetProposalId)
        .eq("actor_agent_id", actorAgentId)
        .eq("event_type", expectedSettlementActivityEventType)
        .contains("metadata", { milestone_id: milestoneId }),
    ]);

    expect(milestoneError).toBeNull();
    expect(walletError).toBeNull();
    expect(ledgerError).toBeNull();
    expect(activityError).toBeNull();
    expect(milestone).toMatchObject({
      status: "settled",
      settled_agent_id: actorAgentId,
      settlement_note: settlementNote,
    });
    expect(milestone?.settled_at).toEqual(expect.any(String));
    expect(Number(milestone?.settled_credits)).toBe(targetHours);
    expect(Number(wallet?.balance_credits)).toBeCloseTo(walletBeforeSettlement.balanceCredits - targetHours);
    expect(Number(wallet?.reserved_credits)).toBeCloseTo(walletBeforeSettlement.reservedCredits - targetHours);
    expect(ledger).toHaveLength(1);
    expect(ledger?.[0]).toMatchObject({
      entry_type: expectedSettleLedgerEntryType,
      source_table: "milestones",
      source_id: milestoneId,
    });
    expect(Number(ledger?.[0]?.amount_credits)).toBe(-targetHours);
    expect(Number(ledger?.[0]?.balance_after)).toBeCloseTo(walletBeforeSettlement.balanceCredits - targetHours);
    expect(Number(ledger?.[0]?.reserved_after)).toBeCloseTo(walletBeforeSettlement.reservedCredits - targetHours);
    expect(ledger?.[0]?.memo).toContain(title);
    expect(activity).toHaveLength(1);
  });

  it("rejects settling the same accepted milestone twice", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const targetHours = 0.03;
    const title = `Double settlement guard ${crypto.randomUUID().slice(0, 8)}`;

    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const { error: pledgeError } = await client.rpc("create_pledge", {
      target_proposal_id: targetProposalId,
      target_agent_id: actorAgentId,
      pledge_hours: targetHours,
      pledge_note: "Reserve credits for double-settlement test.",
    });

    expect(pledgeError).toBeNull();

    const walletBeforeSettlement = await getSeedWallet(client);
    const milestoneId = await createAcceptedMilestone({ client, title, targetHours });

    const firstSettlement = await client.rpc("settle_accepted_milestone", {
      target_milestone_id: milestoneId,
      target_settling_agent_id: actorAgentId,
      settlement_note: "First settlement should succeed.",
    });

    expect(firstSettlement.error).toBeNull();

    const secondSettlement = await client.rpc("settle_accepted_milestone", {
      target_milestone_id: milestoneId,
      target_settling_agent_id: actorAgentId,
      settlement_note: "Second settlement should be blocked.",
    });

    expect(secondSettlement.error).not.toBeNull();
    expect(secondSettlement.error?.message).toBe("milestone_already_settled");

    const [{ data: wallet, error: walletError }, { data: ledger, error: ledgerError }] = await Promise.all([
      client.from("wallets").select("balance_credits,reserved_credits").eq("id", walletBeforeSettlement.id).single(),
      client
        .from("wallet_ledger_entries")
        .select("id")
        .eq("wallet_id", walletBeforeSettlement.id)
        .eq("entry_type", expectedSettleLedgerEntryType)
        .eq("source_table", "milestones")
        .eq("source_id", milestoneId),
    ]);

    expect(walletError).toBeNull();
    expect(ledgerError).toBeNull();
    expect(Number(wallet?.balance_credits)).toBeCloseTo(walletBeforeSettlement.balanceCredits - targetHours);
    expect(Number(wallet?.reserved_credits)).toBeCloseTo(walletBeforeSettlement.reservedCredits - targetHours);
    expect(ledger).toHaveLength(1);
  });

  it("rejects settlement when escrow does not have enough reserved credits", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const targetHours = 5.5;
    const title = `Insufficient escrow guard ${crypto.randomUUID().slice(0, 8)}`;

    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const walletBeforeSettlement = await getSeedWallet(client);
    const milestoneId = await createAcceptedMilestone({
      client,
      title,
      targetHours,
      claimingAgentId: actorAgentId,
      acceptingAgentId: successfulClaimingAgentId,
    });

    expect(walletBeforeSettlement.reservedCredits).toBeLessThan(targetHours);

    const { error: settleError } = await client.rpc("settle_accepted_milestone", {
      target_milestone_id: milestoneId,
      target_settling_agent_id: actorAgentId,
      settlement_note: "Settlement should fail without reserved credits.",
    });

    expect(settleError).not.toBeNull();
    expect(settleError?.message).toBe("insufficient_reserved_credits");

    const [{ data: milestone, error: milestoneError }, { data: wallet, error: walletError }] = await Promise.all([
      client
        .from("milestones")
        .select("status,settled_agent_id,settled_at,settled_credits")
        .eq("id", milestoneId)
        .single(),
      client.from("wallets").select("balance_credits,reserved_credits").eq("id", walletBeforeSettlement.id).single(),
    ]);

    expect(milestoneError).toBeNull();
    expect(walletError).toBeNull();
    expect(milestone).toMatchObject({
      status: "accepted",
      settled_agent_id: null,
      settled_at: null,
      settled_credits: null,
    });
    expect(Number(wallet?.balance_credits)).toBeCloseTo(walletBeforeSettlement.balanceCredits);
    expect(Number(wallet?.reserved_credits)).toBeCloseTo(walletBeforeSettlement.reservedCredits);
  });
});
