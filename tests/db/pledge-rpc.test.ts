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

  it("releases active pledge reservations back to the wallet", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const title = `Pledge release ${crypto.randomUUID().slice(0, 8)}`;
    const pledgeHours = 0.03;

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
        proposal_summary: "A proposal used to test release of reserved pledge credits.",
        proposal_description:
          "This proposal exists so the pledge release RPC can prove it returns reserved compute to the wallet.",
        proposal_category: "testing",
        proposal_desired_hours: 0.05,
        proposal_funding_target_credits: 0.05,
        execution_provider: null,
        execution_link_kind: null,
        execution_title: null,
        execution_url: null,
      },
    );

    expect(proposalError).toBeNull();

    const { data: pledgeId, error: pledgeError } = await client.rpc(
      "create_pledge",
      {
        target_proposal_id: proposalId,
        target_agent_id: "00000000-0000-0000-0000-000000000403",
        pledge_hours: pledgeHours,
        pledge_note: "Reserve credits that should be released.",
      },
    );

    expect(pledgeError).toBeNull();
    expect(pledgeId).toEqual(expect.any(String));

    const { data: walletBeforeRelease, error: walletBeforeError } = await client
      .from("wallets")
      .select("id,balance_credits,reserved_credits")
      .eq("organization_id", "00000000-0000-0000-0000-000000000201")
      .single();

    expect(walletBeforeError).toBeNull();

    const { data: releasedPledgeId, error: releaseError } = await client.rpc(
      "release_pledge",
      {
        target_pledge_id: pledgeId,
        target_releasing_agent_id: "00000000-0000-0000-0000-000000000403",
        release_note: "Release unused reserved compute.",
      },
    );

    expect(releaseError).toBeNull();
    expect(releasedPledgeId).toBe(pledgeId);

    const [
      { data: pledge, error: releasedPledgeError },
      { data: walletAfterRelease, error: walletAfterError },
      { data: releaseLedger, error: releaseLedgerError },
    ] = await Promise.all([
      client.from("pledges").select("status,reserved_credits").eq("id", pledgeId).single(),
      client
        .from("wallets")
        .select("balance_credits,reserved_credits")
        .eq("id", walletBeforeRelease!.id)
        .single(),
      client
        .from("wallet_ledger_entries")
        .select("entry_type,amount_credits,balance_after,reserved_after,source_table,source_id,memo")
        .eq("wallet_id", walletBeforeRelease!.id)
        .eq("entry_type", "release")
        .eq("source_table", "pledges")
        .eq("source_id", pledgeId),
    ]);

    expect(releasedPledgeError).toBeNull();
    expect(walletAfterError).toBeNull();
    expect(releaseLedgerError).toBeNull();
    expect(pledge).toMatchObject({
      status: "released",
      reserved_credits: pledgeHours,
    });
    expect(Number(walletAfterRelease?.balance_credits)).toBeCloseTo(
      Number(walletBeforeRelease?.balance_credits),
    );
    expect(Number(walletAfterRelease?.reserved_credits)).toBeCloseTo(
      Number(walletBeforeRelease?.reserved_credits) - pledgeHours,
    );
    expect(releaseLedger).toHaveLength(1);
    expect(releaseLedger?.[0]).toMatchObject({
      entry_type: "release",
      source_table: "pledges",
      source_id: pledgeId,
    });
    expect(Number(releaseLedger?.[0]?.amount_credits)).toBe(-pledgeHours);
    expect(Number(releaseLedger?.[0]?.balance_after)).toBeCloseTo(
      Number(walletBeforeRelease?.balance_credits),
    );
    expect(Number(releaseLedger?.[0]?.reserved_after)).toBeCloseTo(
      Number(walletBeforeRelease?.reserved_credits) - pledgeHours,
    );
    expect(releaseLedger?.[0]?.memo).toContain("Release unused reserved compute.");
  });

  it("rejects releasing a pledge once proposal work is in flight", async () => {
    const client = createClient(supabaseUrl, publishableKey!);
    const title = `Pledge locked by work ${crypto.randomUUID().slice(0, 8)}`;
    const pledgeHours = 0.03;

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
        proposal_summary: "A proposal used to test release blocking after work starts.",
        proposal_description:
          "This proposal exists so pledge release cannot free credits after agent work is already in flight.",
        proposal_category: "testing",
        proposal_desired_hours: 0.05,
        proposal_funding_target_credits: 0.05,
        execution_provider: null,
        execution_link_kind: null,
        execution_title: null,
        execution_url: null,
      },
    );

    expect(proposalError).toBeNull();

    const { data: pledgeId, error: pledgeError } = await client.rpc(
      "create_pledge",
      {
        target_proposal_id: proposalId,
        target_agent_id: "00000000-0000-0000-0000-000000000403",
        pledge_hours: pledgeHours,
        pledge_note: "Reserve credits that should remain locked after work starts.",
      },
    );

    expect(pledgeError).toBeNull();

    const { data: milestoneId, error: milestoneError } = await client.rpc(
      "create_milestone",
      {
        target_proposal_id: proposalId,
        target_actor_agent_id: "00000000-0000-0000-0000-000000000402",
        milestone_title: "Work started before release",
        milestone_description: "Create active work so release should be blocked.",
        milestone_target_hours: 0.02,
        milestone_due_date: null,
      },
    );

    expect(milestoneError).toBeNull();

    const { error: claimError } = await client.rpc("claim_milestone", {
      target_milestone_id: milestoneId,
      target_claiming_agent_id: "00000000-0000-0000-0000-000000000403",
    });

    expect(claimError).toBeNull();

    const { data: walletBeforeRelease, error: walletBeforeError } = await client
      .from("wallets")
      .select("id,balance_credits,reserved_credits")
      .eq("organization_id", "00000000-0000-0000-0000-000000000201")
      .single();

    expect(walletBeforeError).toBeNull();

    const { error: releaseError } = await client.rpc("release_pledge", {
      target_pledge_id: pledgeId,
      target_releasing_agent_id: "00000000-0000-0000-0000-000000000403",
      release_note: "This should not release active work escrow.",
    });

    expect(releaseError?.message).toBe("pledge_has_work_exposure");

    const [
      { data: pledge, error: releasedPledgeError },
      { data: walletAfterRelease, error: walletAfterError },
      { data: releaseLedger, error: releaseLedgerError },
    ] = await Promise.all([
      client.from("pledges").select("status").eq("id", pledgeId).single(),
      client
        .from("wallets")
        .select("balance_credits,reserved_credits")
        .eq("id", walletBeforeRelease!.id)
        .single(),
      client
        .from("wallet_ledger_entries")
        .select("id")
        .eq("wallet_id", walletBeforeRelease!.id)
        .eq("entry_type", "release")
        .eq("source_table", "pledges")
        .eq("source_id", pledgeId),
    ]);

    expect(releasedPledgeError).toBeNull();
    expect(walletAfterError).toBeNull();
    expect(releaseLedgerError).toBeNull();
    expect(pledge).toMatchObject({ status: "active" });
    expect(Number(walletAfterRelease?.balance_credits)).toBeCloseTo(
      Number(walletBeforeRelease?.balance_credits),
    );
    expect(Number(walletAfterRelease?.reserved_credits)).toBeCloseTo(
      Number(walletBeforeRelease?.reserved_credits),
    );
    expect(releaseLedger).toEqual([]);
  });
});
