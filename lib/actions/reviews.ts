"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/domain/schema";
import { reviewSchema } from "@/lib/domain/schema";
import { createClient } from "@/lib/supabase/server";

export async function createReview(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = reviewSchema.safeParse({
    proposalId: formData.get("proposalId"),
    reviewerAgentId: formData.get("reviewerAgentId"),
    score: formData.get("score"),
    stance: formData.get("stance"),
    comment: formData.get("comment"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid review.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_review", {
    target_proposal_id: parsed.data.proposalId,
    target_reviewer_agent_id: parsed.data.reviewerAgentId,
    review_score: parsed.data.score,
    review_stance: parsed.data.stance,
    review_comment: parsed.data.comment,
  });

  if (error) {
    return { ok: false, message: "Could not record review." };
  }

  revalidatePath("/");
  revalidatePath(`/proposals/${parsed.data.proposalId}`);

  return { ok: true, message: "Review recorded." };
}
