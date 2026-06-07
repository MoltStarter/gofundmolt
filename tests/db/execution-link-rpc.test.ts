import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const targetProposalId = "00000000-0000-0000-0000-000000000501";
const actorAgentId = "00000000-0000-0000-0000-000000000401";

describe("attach_execution_link rpc", () => {
  beforeAll(() => {
    if (!publishableKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required for db tests.",
      );
    }
  });

  it("attaches a GitHub PR to a work package and records activity", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const milestoneTitle = `Linked milestone ${crypto.randomUUID().slice(0, 8)}`;
    const executionUrl = "https://github.com/water-bear86/gofundmolt/pull/42";

    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const { data: milestoneId, error: createError } = await client.rpc("create_milestone", {
      target_proposal_id: targetProposalId,
      target_actor_agent_id: actorAgentId,
      milestone_title: milestoneTitle,
      milestone_description: "Create a work package that can point to reviewable GitHub execution evidence.",
      milestone_target_hours: 0.5,
      milestone_due_date: null,
    });

    expect(createError).toBeNull();
    expect(milestoneId).toEqual(expect.any(String));

    const directInsert = await client.from("execution_links").insert({
      proposal_id: targetProposalId,
      milestone_id: milestoneId,
      creator_agent_id: actorAgentId,
      provider: "github",
      link_type: "pull_request",
      title: "Direct insert should fail",
      url: executionUrl,
    });

    expect(directInsert.error).not.toBeNull();

    const { data: executionLinkId, error } = await client.rpc("attach_execution_link", {
      target_proposal_id: targetProposalId,
      target_milestone_id: milestoneId,
      target_actor_agent_id: actorAgentId,
      execution_provider: "github",
      execution_link_kind: "pull_request",
      execution_title: "Implementation PR",
      execution_url: executionUrl,
    });

    expect(error).toBeNull();
    expect(executionLinkId).toEqual(expect.any(String));

    const [{ data: links }, { data: activity }] = await Promise.all([
      client
        .from("execution_links")
        .select("proposal_id,milestone_id,creator_agent_id,provider,link_type,title,url")
        .eq("id", executionLinkId),
      client
        .from("activity_events")
        .select("event_type,body,metadata")
        .eq("proposal_id", targetProposalId)
        .eq("actor_agent_id", actorAgentId)
        .eq("event_type", "execution_link_attached")
        .contains("metadata", { execution_link_id: executionLinkId }),
    ]);

    expect(links).toEqual([
      {
        proposal_id: targetProposalId,
        milestone_id: milestoneId,
        creator_agent_id: actorAgentId,
        provider: "github",
        link_type: "pull_request",
        title: "Implementation PR",
        url: executionUrl,
      },
    ]);
    expect(activity).toHaveLength(1);
    expect(activity?.[0]?.body).toContain("attached pull request");
    expect(activity?.[0]?.metadata).toMatchObject({
      execution_link_id: executionLinkId,
      milestone_id: milestoneId,
      link_type: "pull_request",
      provider: "github",
      url: executionUrl,
    });
  });
});
