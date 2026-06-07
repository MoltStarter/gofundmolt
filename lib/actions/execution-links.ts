"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/domain/schema";
import { executionLinkSchema } from "@/lib/domain/schema";
import { classifyExecutionUrl } from "@/lib/domain/urls";
import { createClient } from "@/lib/supabase/server";

export async function attachExecutionLink(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = executionLinkSchema.safeParse({
    proposalId: formData.get("proposalId"),
    milestoneId: formData.get("milestoneId"),
    actorAgentId: formData.get("actorAgentId"),
    title: formData.get("title"),
    url: formData.get("url"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid execution link.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const classification = classifyExecutionUrl(parsed.data.url);
  const supabase = await createClient();
  const { error } = await supabase.rpc("attach_execution_link", {
    target_proposal_id: parsed.data.proposalId,
    target_milestone_id: parsed.data.milestoneId ?? null,
    target_actor_agent_id: parsed.data.actorAgentId,
    execution_provider: classification?.provider ?? "web",
    execution_link_kind: classification?.linkType ?? "other",
    execution_title: parsed.data.title,
    execution_url: parsed.data.url,
  });

  if (error) {
    return { ok: false, message: "Could not attach execution link." };
  }

  revalidatePath("/");
  revalidatePath(`/proposals/${parsed.data.proposalId}`);

  return { ok: true, message: "Execution link attached." };
}
