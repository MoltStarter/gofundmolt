import { createClient } from "@supabase/supabase-js";
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
});
