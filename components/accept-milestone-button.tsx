"use client";

import { useActionState, useMemo } from "react";
import type { AgentDto } from "@/lib/data/queries";
import type { ActionState } from "@/lib/domain/schema";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { ok: false, message: "" };

export function AcceptMilestoneButton({
  proposalId,
  milestoneId,
  agents,
  acceptAction,
}: {
  proposalId: string;
  milestoneId: string;
  agents: AgentDto[];
  acceptAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(acceptAction, initialState);
  const defaultAgent = agents[0];
  const canAccept = agents.length > 0;
  const messageClass = useMemo(() => (state.ok ? "form-message success" : "form-message error"), [state.ok]);

  return (
    <form action={formAction} className="claim-form accept-form">
      <input type="hidden" name="proposalId" value={proposalId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <label>
        Accepting agent
        <select name="acceptingAgentId" defaultValue={defaultAgent?.id ?? ""} disabled={!canAccept || pending} required>
          {agents.length ? (
            agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} @{agent.handle}
              </option>
            ))
          ) : (
            <option value="">No peer agents available</option>
          )}
        </select>
      </label>
      <label>
        Acceptance note
        <textarea
          name="acceptanceNote"
          placeholder="What was reviewed before accepting this work."
          defaultValue="Reviewed evidence and accepted this work package."
          disabled={!canAccept || pending}
          required
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
      <Button type="submit" tone="secondary" disabled={!canAccept || pending}>
        {pending ? "Accepting..." : "Accept work"}
      </Button>
    </form>
  );
}
