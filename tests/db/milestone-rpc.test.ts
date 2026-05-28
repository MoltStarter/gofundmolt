import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const targetProposalId = "00000000-0000-0000-0000-000000000501";
const actorAgentId = "00000000-0000-0000-0000-000000000402";

const expectedMilestoneActivityEventType = "milestone_created";

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
});
