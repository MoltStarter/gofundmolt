import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe("create_review rpc", () => {
  beforeAll(() => {
    if (!publishableKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required for db tests.",
      );
    }
  });

  it("rejects unauthenticated review creation", async () => {
    const client = createClient(supabaseUrl, publishableKey!);

    const { error } = await client.rpc("create_review", {
      target_proposal_id: "00000000-0000-0000-0000-000000000501",
      target_reviewer_agent_id: "00000000-0000-0000-0000-000000000402",
      review_score: 8,
      review_stance: "support",
      review_comment: "Anonymous review should not be accepted.",
    });

    expect(error).not.toBeNull();
  });

  it("creates or replaces a review and records activity for the seeded user", async () => {
    const client = createClient(supabaseUrl, publishableKey!);

    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const { count: activityCountBefore, error: activityCountError } = await client
      .from("activity_events")
      .select("id", { count: "exact", head: true })
      .eq("proposal_id", "00000000-0000-0000-0000-000000000501")
      .eq("actor_agent_id", "00000000-0000-0000-0000-000000000402")
      .eq("event_type", "review_created");

    expect(activityCountError).toBeNull();

    const directInsert = await client.from("proposal_reviews").insert({
      proposal_id: "00000000-0000-0000-0000-000000000501",
      reviewer_agent_id: "00000000-0000-0000-0000-000000000402",
      score: 7,
      stance: "concern",
      comment: "Direct review insert should fail.",
    });

    expect(directInsert.error).not.toBeNull();

    const { data: reviewId, error } = await client.rpc("create_review", {
      target_proposal_id: "00000000-0000-0000-0000-000000000501",
      target_reviewer_agent_id: "00000000-0000-0000-0000-000000000402",
      review_score: 8,
      review_stance: "support",
      review_comment: "This proposal is scoped well enough to support.",
    });

    expect(error).toBeNull();
    expect(reviewId).toEqual(expect.any(String));

    const { data: updatedReviewId, error: updateError } = await client.rpc(
      "create_review",
      {
        target_proposal_id: "00000000-0000-0000-0000-000000000501",
        target_reviewer_agent_id: "00000000-0000-0000-0000-000000000402",
        review_score: 6,
        review_stance: "concern",
        review_comment: "Updated review after a closer scope read.",
      },
    );

    expect(updateError).toBeNull();
    expect(updatedReviewId).toEqual(reviewId);

    const [{ data: reviews }, { data: activity }] = await Promise.all([
      client
        .from("proposal_reviews")
        .select("id,score,stance,comment")
        .eq("proposal_id", "00000000-0000-0000-0000-000000000501")
        .eq("reviewer_agent_id", "00000000-0000-0000-0000-000000000402"),
      client
        .from("activity_events")
        .select("event_type", { count: "exact" })
        .eq("proposal_id", "00000000-0000-0000-0000-000000000501")
        .eq("actor_agent_id", "00000000-0000-0000-0000-000000000402")
        .eq("event_type", "review_created"),
    ]);

    expect(reviews).toEqual([
      {
        id: reviewId,
        score: 6,
        stance: "concern",
        comment: "Updated review after a closer scope read.",
      },
    ]);
    expect(activity?.length ?? 0).toBeGreaterThan(activityCountBefore ?? 0);
  });
});
