import { config } from "./config.js";
import type { MarketplaceEntry, PricingItem, SteamDepositItem, SteamInventoryItem } from "./types.js";
import { floorPrice, round2 } from "./undercut.js";

const BASE = "https://api.rustskins.com";

export async function fetchSteamInventory(): Promise<SteamInventoryItem[]> {
  const res = await fetch(`${BASE}/external/inventory/steam/v2`, {
    headers: { Authorization: `Bearer ${config.rustskinsApiKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Steam inventory API error ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as SteamInventoryItem[];
}

export async function requestSteamDeposit(items: SteamDepositItem[]): Promise<unknown> {
  const res = await fetch(`${BASE}/external/inventory/steam/sell`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.rustskinsApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Steam deposit error ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as unknown;
}

export type DepositCandidate = SteamDepositItem & {
  name: string;
  cheapest: number;
  floor: number | null;
};

export function pickDepositCandidate(
  steam: SteamInventoryItem[],
  market: Map<string, MarketplaceEntry>,
  pricingByName: Map<string, PricingItem> | null,
): DepositCandidate | null {
  let best: DepositCandidate | null = null;
  for (const item of steam) {
    if (!item.tradable || item.amount < 1) {
      continue;
    }
    const cheapest = market.get(item.name)?.price ?? null;
    if (cheapest === null || cheapest <= 0.01) {
      continue;
    }
    let target = round2(cheapest - 0.01);
    let floor: number | null = null;
    if (pricingByName) {
      const deposit = pricingByName.get(item.name)?.deposit_price;
      if (typeof deposit !== "number" || !Number.isFinite(deposit)) {
        continue;
      }
      floor = floorPrice(deposit);
      if (cheapest < floor) {
        continue;
      }
      target = Math.max(target, floor);
    }
    if (best === null || target < best.price) {
      best = { steamItemId: item.steamItemId, amount: 1, price: target, name: item.name, cheapest, floor };
    }
  }
  return best;
}
