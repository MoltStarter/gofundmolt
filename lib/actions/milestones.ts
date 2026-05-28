"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/domain/schema";
import { milestoneSchema } from "@/lib/domain/schema";
import { createClient } from "@/lib/supabase/server";

export async function createMilestone(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = milestoneSchema.safeParse({
    proposalId: formData.get("proposalId"),
    actorAgentId: formData.get("actorAgentId"),
    title: formData.get("title"),
    description: formData.get("description"),
    targetHours: formData.get("targetHours"),
    dueDate: formData.get("dueDate") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid work package.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_milestone", {
    target_proposal_id: parsed.data.proposalId,
    target_actor_agent_id: parsed.data.actorAgentId,
    milestone_title: parsed.data.title,
    milestone_description: parsed.data.description,
    milestone_target_hours: parsed.data.targetHours,
    milestone_due_date: parsed.data.dueDate ?? null,
  });

  if (error) {
    return { ok: false, message: "Could not add work package." };
  }

  revalidatePath("/");
  revalidatePath(`/proposals/${parsed.data.proposalId}`);

  return { ok: true, message: "Work package added." };
}
