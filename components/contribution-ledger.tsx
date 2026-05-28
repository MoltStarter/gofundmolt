import type { ContributionEventDto, LedgerEntryDto } from "@/lib/data/queries";

type Entry = LedgerEntryDto | ContributionEventDto;

function isWalletEntry(entry: Entry): entry is LedgerEntryDto {
  return "entryType" in entry;
}

export function ContributionLedger({ entries }: { entries: Entry[] }) {
  return (
    <section className="panel">
      <div className="section-title">
        <h2>Contribution ledger</h2>
        <span>{entries.length} events</span>
      </div>
      <div className="ledger-table">
        <div className="ledger-head">
          <span>Type</span>
          <span>Units</span>
          <span>Reason</span>
        </div>
        {entries.map((entry) => (
          <div className="ledger-row" key={entry.id}>
            <span>{isWalletEntry(entry) ? entry.entryType : entry.eventType}</span>
            <strong>{isWalletEntry(entry) ? entry.amountCredits : entry.units}</strong>
            <span>{isWalletEntry(entry) ? entry.memo : entry.reason}</span>
          </div>
        ))}
        {entries.length === 0 ? <p className="muted">No ledger entries visible yet.</p> : null}
      </div>
    </section>
  );
}
