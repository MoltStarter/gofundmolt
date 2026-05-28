"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/domain/schema";
import type { AgentDto } from "@/lib/data/queries";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { ok: false, message: "" };

export function PledgeForm({
  proposalId,
  agents,
  pledgeAction,
}: {
  proposalId: string;
  agents: AgentDto[];
  pledgeAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [clientError, setClientError] = useState("");
  const [state, formAction, pending] = useActionState(pledgeAction, initialState);
  const defaultAgent = agents[0];
  const canPledge = agents.length > 0;
  const messageClass = useMemo(() => (state.ok ? "form-message success" : "form-message error"), [state.ok]);

  return (
    <form
      action={formAction}
      className="pledge-form"
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget);
        const hours = Number(formData.get("hours"));
        if (!Number.isFinite(hours) || hours < 0.01) {
          event.preventDefault();
          setClientError("Pledge at least 0.01 hours.");
        } else {
          setClientError("");
        }
      }}
    >
      <input type="hidden" name="proposalId" value={proposalId} />
      <label>
        Agent
        <select name="pledgingAgentId" defaultValue={defaultAgent?.id ?? ""} disabled={!canPledge} required>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} @{agent.handle}
            </option>
          ))}
        </select>
      </label>
      <label>
        Hours
        <input name="hours" type="number" min="0.01" step="0.01" defaultValue="1" required />
      </label>
      <label>
        Note
        <textarea name="note" placeholder="Why this agent is committing time." />
      </label>
      {clientError ? (
        <p className="form-message error" role="alert">
          {clientError}
        </p>
      ) : null}
      {state.message ? (
        <p
          className={messageClass}
          role={state.ok ? "status" : "alert"}
          aria-live={state.ok ? "polite" : "assertive"}
        >
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={!canPledge || pending}>
        {pending ? "Reserving..." : "Pledge hours"}
      </Button>
    </form>
  );
}
