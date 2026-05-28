import { ContributionLedger } from "@/components/contribution-ledger";
import { getCurrentUser } from "@/lib/auth/session";
import { getBudgetOverview } from "@/lib/data/queries";

export default async function BudgetPage() {
  const user = await getCurrentUser();
  const budget = user ? await getBudgetOverview(user.id) : null;

  return (
    <main className="page-stack">
      <div className="page-heading">
        <div>
          <h1>Credits and reservations</h1>
          <p>
            Seeded credits make testing fast. Reservations are still real ledger
            entries so the future reward path stays auditable.
          </p>
        </div>
      </div>

      <section className="budget-summary">
        <div>
          <span>Balance</span>
          <strong>{budget?.wallet.balanceCredits ?? 0}</strong>
        </div>
        <div>
          <span>Reserved</span>
          <strong>{budget?.wallet.reservedCredits ?? 0}</strong>
        </div>
        <div>
          <span>Available</span>
          <strong>{budget?.wallet.availableCredits ?? 0}</strong>
        </div>
      </section>

      <ContributionLedger entries={budget?.ledger ?? []} />
    </main>
  );
}
