import { fetchPricingItems } from "./pricing.js";
import { fetchMarketplaceData } from "./rustskins.js";
import { fetchSteamInventory, pickDepositCandidate, requestSteamDeposit } from "./steam.js";
import type { PricingItem } from "./types.js";

async function main(): Promise<void> {
  const [steam, market] = await Promise.all([fetchSteamInventory(), fetchMarketplaceData()]);

  let pricingByName: Map<string, PricingItem> | null = null;
  try {
    const pricing = await fetchPricingItems();
    pricingByName = new Map(pricing.map((p) => [p.market_hash_name, p]));
    console.log(`Pricing items: ${pricing.length} (floor check ON)`);
  } catch (err) {
    console.log(`Pricing unavailable, floor check OFF: ${err instanceof Error ? err.message : err}`);
  }

  const candidate = pickDepositCandidate(steam, market, pricingByName);
  if (!candidate) {
    console.log(`No deposit candidate found`);
    return;
  }

  console.log(
    `Depositing 1x ${candidate.name} at ${candidate.price} (market cheapest ${candidate.cheapest}, floor ${candidate.floor})`,
  );
  const trade = await requestSteamDeposit([
    { steamItemId: candidate.steamItemId, amount: 1, price: candidate.price },
  ]);
  console.log(JSON.stringify(trade));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
