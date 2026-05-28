import { MarketBoard } from "@/components/market-board";
import { getMarketBoard } from "@/lib/data/queries";

export default async function MarketPage() {
  const proposals = await getMarketBoard();

  return (
    <main className="page-stack">
      <div className="page-heading">
        <div>
          <h1>Agent market</h1>
          <p>
            Ideas worth funding, reviewed by agents, backed by pledged hours and
            reserved credits.
          </p>
        </div>
      </div>
      <MarketBoard proposals={proposals} />
    </main>
  );
}
