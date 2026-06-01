import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe("create_pledge rpc", () => {
  beforeAll(() => {
    if (!publishableKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required for db tests.",
      );
    }
  });

  it("rejects unauthenticated pledge creation", async () => {
    const client = createClient(supabaseUrl, publishableKey!);

    const { error } = await client.rpc("create_pledge", {
      target_proposal_id: "00000000-0000-0000-0000-000000000501",
      target_agent_id: "00000000-0000-0000-0000-000000000403",
      pledge_hours: 1,
      pledge_note: "Anonymous pledge",
    });

    expect(error).not.toBeNull();
  });

  it("reserves credits and creates an active pledge for the seeded user", async () => {
    const client = createClient(supabaseUrl, publishableKey!);

    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const directInsert = await client.from("pledges").insert({
      proposal_id: "00000000-0000-0000-0000-000000000501",
      pledging_agent_id: "00000000-0000-0000-0000-000000000403",
      organization_id: "00000000-0000-0000-0000-000000000201",
      hours: 1,
      reserved_credits: 1,
      note: "Direct insert should fail",
    });

    expect(directInsert.error).not.toBeNull();

    const { data: pledgeId, error } = await client.rpc("create_pledge", {
      target_proposal_id: "00000000-0000-0000-0000-000000000501",
      target_agent_id: "00000000-0000-0000-0000-000000000403",
      pledge_hours: 4.5,
      pledge_note: "Integration test pledge",
    });

    expect(error).toBeNull();
    expect(pledgeId).toEqual(expect.any(String));

    const { data: pledge, error: pledgeError } = await client
      .from("pledges")
      .select("hours,reserved_credits,status")
      .eq("id", pledgeId)
      .single();

    expect(pledgeError).toBeNull();
    expect(pledge).toMatchObject({
      hours: 4.5,
      reserved_credits: 4.5,
      status: "active",
    });
  });

  it("rejects pledges that would exceed the proposal funding target", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const title = `Pledge cap ${crypto.randomUUID().slice(0, 8)}`;

    const signIn = await client.auth.signInWithPassword({
      email: "operator@gofundmolt.local",
      password: "password123",
    });

    expect(signIn.error).toBeNull();

    const { data: proposalId, error: proposalError } = await client.rpc(
      "create_proposal",
      {
        target_creator_agent_id: "00000000-0000-0000-0000-000000000401",
        proposal_title: title,
        proposal_summary: "A small proposal used to test pledge funding caps.",
        proposal_description:
          "This proposal exists so the pledge RPC can prove it rejects reservations above the project budget.",
        proposal_category: "testing",
        proposal_desired_hours: 0.02,
        proposal_funding_target_credits: 0.02,
        execution_provider: null,
        execution_link_kind: null,
        execution_title: null,
        execution_url: null,
      },
    );

    expect(proposalError).toBeNull();
    expect(proposalId).toEqual(expect.any(String));

    const { error: firstPledgeError } = await client.rpc("create_pledge", {
      target_proposal_id: proposalId,
      target_agent_id: "00000000-0000-0000-0000-000000000403",
      pledge_hours: 0.01,
      pledge_note: "Within the funding cap",
    });

    expect(firstPledgeError).toBeNull();

    const { data: walletBeforeFailure, error: walletBeforeError } = await client
      .from("wallets")
      .select("id,balance_credits,reserved_credits")
      .eq("organization_id", "00000000-0000-0000-0000-000000000201")
      .single();

    expect(walletBeforeError).toBeNull();

    const { error: overCapError } = await client.rpc("create_pledge", {
      target_proposal_id: proposalId,
      target_agent_id: "00000000-0000-0000-0000-000000000403",
      pledge_hours: 0.02,
      pledge_note: "This should exceed the funding cap",
    });

    expect(overCapError?.message).toBe("proposal_funding_target_exceeded");

    const [
      { data: pledges, error: pledgesError },
      { data: walletAfterFailure, error: walletAfterError },
    ] = await Promise.all([
      client
        .from("pledges")
        .select("id,reserved_credits")
        .eq("proposal_id", proposalId),
      client
        .from("wallets")
        .select("balance_credits,reserved_credits")
        .eq("id", walletBeforeFailure!.id)
        .single(),
    ]);

    expect(pledgesError).toBeNull();
    expect(walletAfterError).toBeNull();
    expect(pledges).toHaveLength(1);
    expect(Number(pledges?.[0]?.reserved_credits)).toBeCloseTo(0.01);

    const { data: reserveLedger, error: reserveLedgerError } = await client
      .from("wallet_ledger_entries")
      .select("entry_type,amount_credits")
      .eq("wallet_id", walletBeforeFailure!.id)
      .eq("source_table", "pledges")
      .in(
        "source_id",
        pledges!.map((pledge) => pledge.id),
      )
      .order("created_at", { ascending: false });

    expect(reserveLedgerError).toBeNull();
    expect(reserveLedger).toEqual([
      {
        entry_type: "reserve",
        amount_credits: 0.01,
      },
    ]);
    expect(Number(walletAfterFailure?.balance_credits)).toBeCloseTo(
      Number(walletBeforeFailure?.balance_credits),
    );
    expect(Number(walletAfterFailure?.reserved_credits)).toBeCloseTo(
      Number(walletBeforeFailure?.reserved_credits),
    );
  });
});
