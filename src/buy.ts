import {
  fetchCatalogItemIds,
  fetchMarketBuyOrders,
  fetchOwnBuyOrders,
  itemIdByName,
  placeBuyOrders,
  planBuyOrders,
  updateBuyOrders,
} from "./buyorders.js";
import { config } from "./config.js";
import { fetchPricingItems } from "./pricing.js";
import { fetchMarketplaceData } from "./rustskins.js";

async function main(): Promise<void> {
  const pricing = await fetchPricingItems();
  const marketOrders = await fetchMarketBuyOrders();
  const ownOrders = await fetchOwnBuyOrders();
  const market = await fetchMarketplaceData();
  const catalogIds = await fetchCatalogItemIds();

  const ids = itemIdByName(market);
  const steamPrices = new Map<string, number>();
  for (const [, entry] of market) {
    if (typeof entry.steamPrice === "number") {
      steamPrices.set(entry.item, entry.steamPrice);
    }
  }
  for (const [name, catalog] of catalogIds) {
    if (!ids.has(name)) {
      ids.set(name, catalog.id);
    }
    if (typeof catalog.steamPrice === "number" && !steamPrices.has(name)) {
      steamPrices.set(name, catalog.steamPrice);
    }
  }

  const plan = planBuyOrders(pricing, marketOrders, ownOrders, ids, config.maxNewOrders, steamPrices);

  console.log(`Pricing items: ${pricing.length}`);
  console.log(`Market buy order items: ${marketOrders.size}`);
  console.log(`Own buy order groups: ${ownOrders.length}`);
  console.log(`To place: ${plan.place.length}`);
  console.log(`To update: ${plan.update.length}`);

  const skippedByReason = new Map<string, number>();
  for (const s of plan.skipped) {
    skippedByReason.set(s.reason, (skippedByReason.get(s.reason) ?? 0) + 1);
  }
  for (const [reason, count] of skippedByReason) {
    console.log(`Skipped ${reason}: ${count}`);
  }

  if (plan.update.length > 0) {
    console.log(`Updated: ${await updateBuyOrders(plan.update)}`);
  } else {
    console.log(`Updated: 0`);
  }
  if (plan.place.length > 0) {
    console.log(`Placed: ${await placeBuyOrders(plan.place)}`);
  } else {
    console.log(`Placed: 0`);
  }

  console.table(
    plan.place.slice(0, config.limit).map((o) => ({
      name: o.name,
      highest: o.highest,
      deposit: o.deposit,
      target: o.price,
    })),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
