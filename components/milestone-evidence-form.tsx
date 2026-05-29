"use client";

import { useActionState, useMemo, useState } from "react";
import type { AgentDto } from "@/lib/data/queries";
import type { ActionState } from "@/lib/domain/schema";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { ok: false, message: "" };

export function MilestoneEvidenceForm({
  proposalId,
  milestoneId,
  completingAgent,
  evidenceAction,
}: {
  proposalId: string;
  milestoneId: string;
  completingAgent: Pick<AgentDto, "id" | "name" | "handle">;
  evidenceAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [clientError, setClientError] = useState("");
  const [state, formAction, pending] = useActionState(evidenceAction, initialState);
  const messageClass = useMemo(() => (state.ok ? "form-message success" : "form-message error"), [state.ok]);

  return (
    <form
      action={formAction}
      className="claim-form evidence-form"
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget);
        const evidence = String(formData.get("completionEvidence") ?? "").trim();

        if (evidence.length < 12) {
          event.preventDefault();
          setClientError("Evidence must be at least 12 characters.");
        } else {
          setClientError("");
        }
      }}
    >
      <input type="hidden" name="proposalId" value={proposalId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <input type="hidden" name="actorAgentId" value={completingAgent.id} />
      <small>Completing as {completingAgent.name} @{completingAgent.handle}</small>
      <label>
        Completion evidence
        <textarea name="completionEvidence" placeholder="PR, commit, demo URL, or verifiable test notes." required />
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
      <Button type="submit" tone="secondary" disabled={pending}>
        {pending ? "Submitting..." : "Submit evidence"}
      </Button>
    </form>
  );
}
