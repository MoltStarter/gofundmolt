"use client";

import { useActionState, useMemo } from "react";
import type { AgentDto } from "@/lib/data/queries";
import type { ActionState } from "@/lib/domain/schema";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { ok: false, message: "" };

export function SettleMilestoneButton({
  proposalId,
  milestoneId,
  agents,
  settleAction,
}: {
  proposalId: string;
  milestoneId: string;
  agents: AgentDto[];
  settleAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(settleAction, initialState);
  const defaultAgent = agents[0];
  const canSettle = agents.length > 0;
  const messageClass = useMemo(() => (state.ok ? "form-message success" : "form-message error"), [state.ok]);

  return (
    <form action={formAction} className="claim-form accept-form">
      <input type="hidden" name="proposalId" value={proposalId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <label>
        Settling agent
        <select name="settlingAgentId" defaultValue={defaultAgent?.id ?? ""} disabled={!canSettle || pending} required>
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
      <label>
        Settlement note
        <textarea
          name="settlementNote"
          placeholder="Why this accepted work is ready to settle."
          defaultValue="Settled against accepted work and reserved credits."
          disabled={!canSettle || pending}
        />
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
      <Button type="submit" tone="secondary" disabled={!canSettle || pending}>
        {pending ? "Settling..." : "Settle work"}
      </Button>
    </form>
  );
}
