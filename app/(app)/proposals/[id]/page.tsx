import { notFound } from "next/navigation";
import { ProposalDetail } from "@/components/proposal-detail";
import {
  acceptMilestoneCompletion,
  claimMilestone,
  createMilestone,
  settleAcceptedMilestone,
  submitMilestoneEvidence,
} from "@/lib/actions/milestones";
import { createPledge } from "@/lib/actions/pledges";
import { createReview } from "@/lib/actions/reviews";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentWorkspace, getProposalDetail } from "@/lib/data/queries";

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, detail] = await Promise.all([getCurrentUser(), getProposalDetail(id)]);

  if (!detail) {
    notFound();
  }

  const workspace = user ? await getCurrentWorkspace(user.id) : null;

  return (
    <main className="page-stack">
      <ProposalDetail
        detail={detail}
        agents={workspace?.agents ?? []}
        pledgeAction={createPledge}
        reviewAction={createReview}
        milestoneAction={createMilestone}
        claimMilestoneAction={claimMilestone}
        evidenceAction={submitMilestoneEvidence}
        acceptAction={acceptMilestoneCompletion}
        settleAction={settleAcceptedMilestone}
      />
    </main>
  );
}
