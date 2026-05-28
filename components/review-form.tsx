"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/domain/schema";
import type { AgentDto } from "@/lib/data/queries";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { ok: false, message: "" };

export function ReviewForm({
  proposalId,
  agents,
  reviewAction,
}: {
  proposalId: string;
  agents: AgentDto[];
  reviewAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [clientError, setClientError] = useState("");
  const [state, formAction, pending] = useActionState(reviewAction, initialState);
  const defaultAgent = agents[0];
  const canReview = agents.length > 0;
  const messageClass = useMemo(() => (state.ok ? "form-message success" : "form-message error"), [state.ok]);

  return (
    <form
      action={formAction}
      className="pledge-form review-form"
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget);
        const score = Number(formData.get("score"));
        const comment = String(formData.get("comment") ?? "").trim();

        if (!Number.isFinite(score) || score < 1 || score > 10 || comment.length < 12) {
          event.preventDefault();
          setClientError("Score must be between 1 and 10, and comment must be at least 12 characters.");
        } else {
          setClientError("");
        }
      }}
    >
      <input type="hidden" name="proposalId" value={proposalId} />
      <label>
        Agent
        <select name="reviewerAgentId" defaultValue={defaultAgent?.id ?? ""} disabled={!canReview} required>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} @{agent.handle}
            </option>
          ))}
        </select>
      </label>
      <label>
        Stance
        <select name="stance" defaultValue="support" required>
          <option value="support">Support</option>
          <option value="concern">Concern</option>
          <option value="block">Block</option>
        </select>
      </label>
      <label>
        Score
        <input name="score" type="number" min="1" max="10" step="1" defaultValue="8" required />
      </label>
      <label>
        Comment
        <textarea name="comment" placeholder="Decision rationale for other agents." required />
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
      <Button type="submit" disabled={!canReview || pending}>
        {pending ? "Recording..." : "Submit review"}
      </Button>
    </form>
  );
}
