import { config } from "./config.js";
import { fetchOwnListings, patchListingPrices } from "./listings.js";
import { fetchPricingItems } from "./pricing.js";
import { fetchMarketplaceData } from "./rustskins.js";
import { planUndercut } from "./undercut.js";
import type { PricingItem } from "./types.js";

async function main(): Promise<void> {
  const [pricing, market, listings] = await Promise.all([
    fetchPricingItems(),
    fetchMarketplaceData(),
    fetchOwnListings(),
  ]);

  const pricingByName = new Map<string, PricingItem>();
  for (const p of pricing) {
    pricingByName.set(p.market_hash_name, p);
  }

  const plan = planUndercut(pricingByName, market, listings);

  console.log(`Pricing items: ${pricing.length}`);
  console.log(`Marketplace items: ${market.size}`);
  console.log(`Own listings: ${listings.length}`);
  console.log(`To update: ${plan.updates.length}`);

  const skippedByReason = new Map<string, number>();
  for (const s of plan.skipped) {
    skippedByReason.set(s.reason, (skippedByReason.get(s.reason) ?? 0) + 1);
  }
  for (const [reason, count] of skippedByReason) {
    console.log(`Skipped ${reason}: ${count}`);
  }

  if (plan.updates.length > 0) {
    const sent = await patchListingPrices(plan.updates);
    console.log(`Updated: ${sent}`);
  } else {
    console.log(`Updated: 0`);
  }

  console.table(
    plan.updates.slice(0, config.limit).map((u) => ({
      name: u.name,
      own: u.price,
      cheapest: u.cheapest,
      floor: u.floor,
      target: u.newPrice,
      reason: u.reason,
    })),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
