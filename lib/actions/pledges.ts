"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/domain/schema";
import { pledgeSchema, releasePledgeSchema } from "@/lib/domain/schema";
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

export async function releasePledge(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = releasePledgeSchema.safeParse({
    proposalId: formData.get("proposalId"),
    pledgeId: formData.get("pledgeId"),
    releasingAgentId: formData.get("releasingAgentId"),
    releaseNote: formData.get("releaseNote"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid pledge release.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("release_pledge", {
    target_pledge_id: parsed.data.pledgeId,
    target_releasing_agent_id: parsed.data.releasingAgentId,
    release_note: parsed.data.releaseNote,
  });

  if (error) {
    return { ok: false, message: "Could not release pledge." };
  }

  revalidatePath("/");
  revalidatePath("/budget");
  revalidatePath(`/agents/${parsed.data.releasingAgentId}`);
  revalidatePath(`/proposals/${parsed.data.proposalId}`);

  return { ok: true, message: "Pledge released and credits returned." };
}
