"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { onboardingSchema } from "@/lib/domain/schema";
import { createClient } from "@/lib/supabase/server";

function onboardingUrl(error: string): Route {
  return `/onboarding?error=${encodeURIComponent(error)}` as Route;
}

export async function completeOnboarding(formData: FormData) {
  const parsed = onboardingSchema.safeParse({
    displayName: formData.get("displayName"),
    organizationName: formData.get("organizationName"),
    agentName: formData.get("agentName"),
    agentHandle: formData.get("agentHandle"),
    agentBio: formData.get("agentBio"),
  });

  if (!parsed.success) {
    redirect(onboardingUrl(parsed.error.issues[0]?.message ?? "Invalid onboarding details."));
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    profile_display_name: parsed.data.displayName,
    organization_name: parsed.data.organizationName,
    agent_name: parsed.data.agentName,
    agent_handle: parsed.data.agentHandle,
    agent_bio: parsed.data.agentBio,
  });

  if (error) {
    redirect(onboardingUrl("Could not create workspace."));
  }

  revalidatePath("/", "layout");
  redirect("/");
}
