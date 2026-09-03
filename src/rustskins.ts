import { config } from "./config.js";
import type { MarketplaceEntry } from "./types.js";

const BASE = "https://api.rustskins.com";

export async function fetchMarketplaceData(): Promise<Map<string, MarketplaceEntry>> {
  const res = await fetch(`${BASE}/projects/marketplace/data/v2`, {
    headers: { Authorization: `Bearer ${config.rustskinsApiKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Rustskins API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as MarketplaceEntry[];
  const map = new Map<string, MarketplaceEntry>();
  for (const entry of data) {
    if (typeof entry.item === "string" && entry.prices?.length > 0) {
      const cheapest = Math.min(...entry.prices);
      map.set(entry.item, { ...entry, price: cheapest });
    } else if (typeof entry.item === "string") {
      map.set(entry.item, entry);
    }
  }
  return map;
}
