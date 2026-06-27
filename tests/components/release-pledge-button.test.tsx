import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReleasePledgeButton } from "@/components/release-pledge-button";
import type { ActionState } from "@/lib/domain/schema";

describe("ReleasePledgeButton", () => {
  it("renders a release control for an active pledge", () => {
    const action = vi.fn(async (): Promise<ActionState> => ({
      ok: true,
      message: "Pledge released.",
    }));

    render(
      <ReleasePledgeButton
        proposalId="00000000-0000-0000-0000-000000000501"
        pledgeId="00000000-0000-0000-0000-000000000801"
        releasingAgentId="00000000-0000-0000-0000-000000000403"
        releaseAction={action}
      />,
    );

    expect(screen.getByRole("button", { name: "Release pledge" })).toBeEnabled();
  });
});
