import type { MarketplaceEntry, OwnListing, PricingItem, UndercutPlan } from "./types.js";

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function floorPrice(depositPrice: number): number {
  return round2(depositPrice * 1.1);
}

export function planUndercut(
  pricingByName: Map<string, PricingItem>,
  market: Map<string, MarketplaceEntry>,
  listings: OwnListing[],
): UndercutPlan {
  const updates: UndercutPlan["updates"] = [];
  const skipped: UndercutPlan["skipped"] = [];

  for (const listing of listings) {
    const deposit = pricingByName.get(listing.name)?.deposit_price;
    if (typeof deposit !== "number" || !Number.isFinite(deposit)) {
      skipped.push({ name: listing.name, reason: "no-deposit" });
      continue;
    }
    const floor = floorPrice(deposit);
    const cheapest = market.get(listing.name)?.price ?? null;
    const own = round2(listing.price);

    if (cheapest !== null && own <= round2(cheapest)) {
      skipped.push({ name: listing.name, reason: "already-cheapest" });
      continue;
    }
    if (cheapest !== null && cheapest < floor) {
      skipped.push({ name: listing.name, reason: "below-floor" });
      continue;
    }
    const target = cheapest === null ? floor : Math.max(round2(cheapest - 0.01), floor);
    if (target >= own) {
      skipped.push({ name: listing.name, reason: "no-change" });
      continue;
    }
    updates.push({
      name: listing.name,
      itemId: listing.itemId,
      amount: listing.amount,
      price: listing.price,
      sellerFeePerItem: listing.sellerFeePerItem,
      newPrice: target,
      cheapest,
      floor,
      reason: cheapest === null ? "no-competition" : target === floor ? "clamped-to-floor" : "undercut",
    });
  }

  return { updates, skipped };
}
