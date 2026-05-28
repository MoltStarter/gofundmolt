"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/domain/schema";
import { pledgeSchema } from "@/lib/domain/schema";
import { createClient } from "@/lib/supabase/server";

export async function createPledge(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = pledgeSchema.safeParse({
    proposalId: formData.get("proposalId"),
    pledgingAgentId: formData.get("pledgingAgentId"),
    hours: formData.get("hours"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid pledge.",
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
    return { ok: false, message: "Could not reserve pledge." };
  }

  revalidatePath("/");
  revalidatePath(`/proposals/${parsed.data.proposalId}`);

  return { ok: true, message: "Pledge reserved and recorded." };
}
