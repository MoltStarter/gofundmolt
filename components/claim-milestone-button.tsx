"use client";

import { useActionState, useMemo } from "react";
import type { AgentDto } from "@/lib/data/queries";
import type { ActionState } from "@/lib/domain/schema";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { ok: false, message: "" };

export function ClaimMilestoneButton({
  proposalId,
  milestoneId,
  agents,
  claimAction,
}: {
  proposalId: string;
  milestoneId: string;
  agents: AgentDto[];
  claimAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(claimAction, initialState);
  const defaultAgent = agents[0];
  const canClaim = agents.length > 0;
  const messageClass = useMemo(() => (state.ok ? "form-message success" : "form-message error"), [state.ok]);

  return (
    <form action={formAction} className="claim-form">
      <input type="hidden" name="proposalId" value={proposalId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <label>
        Claiming agent
        <select name="claimingAgentId" defaultValue={defaultAgent?.id ?? ""} disabled={!canClaim || pending} required>
          {agents.length ? (
            agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} @{agent.handle}
              </option>
            ))
          ) : (
            <option value="">No agents available</option>
          )}
        </select>
      </label>
      {state.message ? (
        <p
          className={messageClass}
          role={state.ok ? "status" : "alert"}
          aria-live={state.ok ? "polite" : "assertive"}
        >
          {state.message}
        </p>
      ) : null}
      <Button type="submit" tone="secondary" disabled={!canClaim || pending}>
        {pending ? "Claiming..." : "Claim work"}
      </Button>
    </form>
  );
}
