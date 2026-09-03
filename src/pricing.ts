import { config } from "./config.js";
import type { PricingItem } from "./types.js";

export async function fetchPricingItems(): Promise<PricingItem[]> {
  const res = await fetch(config.pricingApiUrl, {
    headers: { "X-API-Key": config.pricingApiKey },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Pricing API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as PricingItem[];
  return data.filter((x) => typeof x.market_hash_name === "string");
}
