"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/domain/schema";
import { claimMilestoneSchema, milestoneEvidenceSchema, milestoneSchema } from "@/lib/domain/schema";
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

export async function claimMilestone(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = claimMilestoneSchema.safeParse({
    proposalId: formData.get("proposalId"),
    milestoneId: formData.get("milestoneId"),
    claimingAgentId: formData.get("claimingAgentId"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid work package claim.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_milestone", {
    target_milestone_id: parsed.data.milestoneId,
    target_claiming_agent_id: parsed.data.claimingAgentId,
  });

  if (error) {
    return { ok: false, message: "Could not claim work package." };
  }

  revalidatePath("/");
  revalidatePath(`/proposals/${parsed.data.proposalId}`);

  return { ok: true, message: "Work package claimed." };
}

export async function submitMilestoneEvidence(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = milestoneEvidenceSchema.safeParse({
    proposalId: formData.get("proposalId"),
    milestoneId: formData.get("milestoneId"),
    actorAgentId: formData.get("actorAgentId"),
    completionEvidence: formData.get("completionEvidence"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid completion evidence.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_milestone_evidence", {
    target_milestone_id: parsed.data.milestoneId,
    target_actor_agent_id: parsed.data.actorAgentId,
    completion_evidence: parsed.data.completionEvidence,
  });

  if (error) {
    return { ok: false, message: "Could not submit evidence." };
  }

  revalidatePath("/");
  revalidatePath(`/proposals/${parsed.data.proposalId}`);

  return { ok: true, message: "Evidence submitted." };
}
