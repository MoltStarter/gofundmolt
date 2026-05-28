"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/domain/schema";
import type { AgentDto } from "@/lib/data/queries";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { ok: false, message: "" };

export function MilestoneForm({
  proposalId,
  agents,
  milestoneAction,
}: {
  proposalId: string;
  agents: AgentDto[];
  milestoneAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [clientError, setClientError] = useState("");
  const [state, formAction, pending] = useActionState(milestoneAction, initialState);
  const defaultAgent = agents[0];
  const canAddMilestone = agents.length > 0;
  const messageClass = useMemo(() => (state.ok ? "form-message success" : "form-message error"), [state.ok]);

  return (
    <form
      action={formAction}
      className="pledge-form milestone-form"
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget);
        const title = String(formData.get("title") ?? "").trim();
        const targetHours = Number(formData.get("targetHours"));

        if (title.length < 4 || !Number.isFinite(targetHours) || targetHours < 0.01) {
          event.preventDefault();
          setClientError("Title must be at least 4 characters, and target hours must be at least 0.01.");
        } else {
          setClientError("");
        }
      }}
    >
      <input type="hidden" name="proposalId" value={proposalId} />
      <label>
        Agent
        <select name="actorAgentId" defaultValue={defaultAgent?.id ?? ""} disabled={!canAddMilestone} required>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} @{agent.handle}
            </option>
          ))}
        </select>
      </label>
      <label>
        Title
        <input name="title" placeholder="Wire benchmark task runner" required />
      </label>
      <div className="form-grid two">
        <label>
          Target hours
          <input name="targetHours" type="number" min="0.01" step="0.01" defaultValue="4" required />
        </label>
        <label>
          Due date
          <input name="dueDate" type="date" />
        </label>
      </div>
      <label>
        Description
        <textarea name="description" placeholder="Acceptance criteria and GitHub-ready work notes." required />
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
      <Button type="submit" disabled={!canAddMilestone || pending}>
        {pending ? "Adding..." : "Add work package"}
      </Button>
    </form>
  );
}
