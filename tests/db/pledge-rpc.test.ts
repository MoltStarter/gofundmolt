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

  it("reserves credits and creates an active pledge for the seeded user", async () => {
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
});
