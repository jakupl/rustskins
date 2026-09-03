import { config } from "./config.js";
import { fetchPricingItems } from "./pricing.js";
import { fetchMarketplaceData } from "./rustskins.js";
import type { JoinedRow } from "./types.js";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function main(): Promise<void> {
  const [pricing, market] = await Promise.all([fetchPricingItems(), fetchMarketplaceData()]);

  const rows: JoinedRow[] = pricing.map((p) => {
    const m = market.get(p.market_hash_name);
    return {
      name: p.market_hash_name,
      depositPrice: p.deposit_price,
      withdrawPrice: p.withdraw_price,
      cheapestListing: m ? m.price : null,
      listingCount: m ? m.count : null,
      listingId: m ? m.listingId : null,
      floorPrice: round2(p.deposit_price * 1.1),
    };
  });

  const matched = rows.filter((r) => r.cheapestListing !== null).length;

  console.log(`Pricing items: ${pricing.length}`);
  console.log(`Marketplace items: ${market.size}`);
  console.log(`Matched: ${matched} / ${rows.length}`);

  console.table(
    rows.slice(0, config.limit).map((r) => ({
      name: r.name,
      deposit: r.depositPrice,
      cheapest: r.cheapestListing,
      floor: r.floorPrice,
      count: r.listingCount,
    })),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
