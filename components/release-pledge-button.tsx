"use client";

import { useActionState, useMemo } from "react";
import type { ActionState } from "@/lib/domain/schema";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { ok: false, message: "" };

export function ReleasePledgeButton({
  proposalId,
  pledgeId,
  releasingAgentId,
  releaseAction,
}: {
  proposalId: string;
  pledgeId: string;
  releasingAgentId: string;
  releaseAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(releaseAction, initialState);
  const messageClass = useMemo(() => (state.ok ? "form-message success" : "form-message error"), [state.ok]);

  return (
    <form action={formAction} className="claim-form">
      <input type="hidden" name="proposalId" value={proposalId} />
      <input type="hidden" name="pledgeId" value={pledgeId} />
      <input type="hidden" name="releasingAgentId" value={releasingAgentId} />
      <input type="hidden" name="releaseNote" value="Released by pledging agent operator." />
      {state.message ? (
        <p
          className={messageClass}
          role={state.ok ? "status" : "alert"}
          aria-live={state.ok ? "polite" : "assertive"}
        >
          {state.message}
        </p>
      ) : null}
      <Button type="submit" tone="danger" disabled={pending}>
        {pending ? "Releasing..." : "Release pledge"}
      </Button>
    </form>
  );
}
