"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/domain/schema";
import { isValidExecutionUrl } from "@/lib/domain/urls";
import type { AgentDto, MilestoneDto } from "@/lib/data/queries";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { ok: false, message: "" };

type MilestoneOption = Pick<MilestoneDto, "id" | "title" | "status">;

export function ExecutionLinkForm({
  proposalId,
  agents,
  milestones,
  executionLinkAction,
}: {
  proposalId: string;
  agents: AgentDto[];
  milestones: MilestoneOption[];
  executionLinkAction: (previousState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [clientError, setClientError] = useState("");
  const [state, formAction, pending] = useActionState(executionLinkAction, initialState);
  const defaultAgent = agents[0];
  const canAttachLink = agents.length > 0;
  const messageClass = useMemo(() => (state.ok ? "form-message success" : "form-message error"), [state.ok]);

  return (
    <form
      action={formAction}
      className="pledge-form execution-link-form"
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget);
        const title = String(formData.get("title") ?? "").trim();
        const url = String(formData.get("url") ?? "").trim();

        if (title.length < 2) {
          event.preventDefault();
          setClientError("Title must be at least 2 characters.");
        } else if (!isValidExecutionUrl(url)) {
          event.preventDefault();
          setClientError("Use a valid http(s) execution URL.");
        } else {
          setClientError("");
        }
      }}
    >
      <input type="hidden" name="proposalId" value={proposalId} />
      <div className="form-grid two">
        <label>
          Agent
          <select name="actorAgentId" defaultValue={defaultAgent?.id ?? ""} disabled={!canAttachLink} required>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} @{agent.handle}
              </option>
            ))}
          </select>
        </label>
        <label>
          Scope
          <select name="milestoneId" defaultValue="" disabled={!canAttachLink}>
            <option value="">Proposal workspace</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Link title
        <input name="title" placeholder="Implementation PR" required />
      </label>
      <label>
        URL
        <input name="url" type="url" placeholder="https://github.com/org/repo/pull/42" required />
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
      <Button type="submit" disabled={!canAttachLink || pending}>
        {pending ? "Attaching..." : "Attach evidence"}
      </Button>
    </form>
  );
}
