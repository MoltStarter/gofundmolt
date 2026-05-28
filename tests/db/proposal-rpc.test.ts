import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe("create_proposal rpc", () => {
  beforeAll(() => {
    if (!publishableKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required for db tests.",
      );
    }
  });

  it("rejects unauthenticated proposal creation", async () => {
    const client = createClient(supabaseUrl, publishableKey!);

    const { error } = await client.rpc("create_proposal", {
      target_creator_agent_id: "00000000-0000-0000-0000-000000000401",
      proposal_title: "Unauthenticated proposal",
      proposal_summary: "This should not be accepted by the proposal RPC.",
      proposal_description:
        "This proposal has enough body copy to pass shape checks but lacks an authenticated actor.",
      proposal_category: "security",
      proposal_desired_hours: 3,
      proposal_funding_target_credits: 3,
      execution_provider: null,
      execution_link_kind: null,
      execution_title: null,
      execution_url: null,
    });

    expect(error).not.toBeNull();
  });

  it("creates proposal, execution link, and activity in one RPC", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const title = `RPC proposal ${crypto.randomUUID().slice(0, 8)}`;

    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const directInsert = await client.from("proposals").insert({
      creator_agent_id: "00000000-0000-0000-0000-000000000401",
      organization_id: "00000000-0000-0000-0000-000000000201",
      title,
      summary: "Direct proposal insert should be closed to clients.",
      description:
        "Direct proposal inserts would bypass transactional side effects, so clients should use the RPC.",
      category: "security",
      desired_hours: 2,
      funding_target_credits: 2,
      status: "open",
    });

    expect(directInsert.error).not.toBeNull();

    const { data: proposalId, error } = await client.rpc("create_proposal", {
      target_creator_agent_id: "00000000-0000-0000-0000-000000000401",
      proposal_title: title,
      proposal_summary: "A transaction-backed proposal creation test.",
      proposal_description:
        "The proposal RPC should create the proposal, execution link, and activity event together.",
      proposal_category: "security",
      proposal_desired_hours: 2,
      proposal_funding_target_credits: 2,
      execution_provider: "github",
      execution_link_kind: "issue",
      execution_title: "Test execution issue",
      execution_url: "https://github.com/gofundmolt/gofundmolt/issues/1",
    });

    expect(error).toBeNull();
    expect(proposalId).toEqual(expect.any(String));

    const [{ data: proposal }, { data: links }, { data: activity }] =
      await Promise.all([
        client.from("proposals").select("title,status").eq("id", proposalId).single(),
        client.from("execution_links").select("title,url").eq("proposal_id", proposalId),
        client.from("activity_events").select("event_type").eq("proposal_id", proposalId),
      ]);

    expect(proposal).toMatchObject({ title, status: "open" });
    expect(links).toEqual([
      {
        title: "Test execution issue",
        url: "https://github.com/gofundmolt/gofundmolt/issues/1",
      },
    ]);
    expect(activity).toEqual([{ event_type: "proposal_created" }]);
  });
});
