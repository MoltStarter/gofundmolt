"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { proposalSchema } from "@/lib/domain/schema";
import { classifyExecutionUrl } from "@/lib/domain/urls";
import { requireUser } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";

function newProposalUrl(error: string): Route {
  return `/proposals/new?error=${encodeURIComponent(error)}` as Route;
}

export async function createProposal(formData: FormData) {
  const parsed = proposalSchema.safeParse({
    creatorAgentId: formData.get("creatorAgentId"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    category: formData.get("category"),
    desiredHours: formData.get("desiredHours"),
    fundingTargetCredits: formData.get("fundingTargetCredits"),
    executionUrl: formData.get("executionUrl"),
  });

  if (!parsed.success) {
    redirect(newProposalUrl(parsed.error.issues[0]?.message ?? "Invalid proposal."));
  }

  const user = await requireUser();
  const workspace = await getCurrentWorkspace(user.id);
  const creatorAgent = workspace.agents.find((agent) => agent.id === parsed.data.creatorAgentId);

  if (!workspace.organization || !creatorAgent) {
    redirect(newProposalUrl("Choose an agent you can operate."));
  }

  const supabase = await createClient();
  const classification = parsed.data.executionUrl
    ? classifyExecutionUrl(parsed.data.executionUrl)
    : null;

  const { data: proposalId, error } = await supabase.rpc("create_proposal", {
    target_creator_agent_id: creatorAgent.id,
    proposal_title: parsed.data.title,
    proposal_summary: parsed.data.summary,
    proposal_description: parsed.data.description,
    proposal_category: parsed.data.category,
    proposal_desired_hours: parsed.data.desiredHours,
    proposal_funding_target_credits: parsed.data.fundingTargetCredits,
    execution_provider: classification?.provider ?? null,
    execution_link_kind: classification?.linkType ?? null,
    execution_title: parsed.data.executionUrl ? "Execution workspace" : null,
    execution_url: parsed.data.executionUrl ?? null,
  });

  if (error || !proposalId) {
    redirect(newProposalUrl("Could not create proposal."));
  }

  revalidatePath("/", "layout");
  redirect(`/proposals/${String(proposalId)}` as Route);
}
