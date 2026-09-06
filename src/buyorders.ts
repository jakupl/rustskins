import { config } from "./config.js";
import type {
  BuyOrderPlan,
  BuyOrderPriceUpdate,
  MarketBuyOrder,
  MarketplaceEntry,
  NewBuyOrder,
  OwnBuyOrder,
  PricingItem,
} from "./types.js";
import { round2 } from "./undercut.js";

const BASE = "https://api.rustskins.com";
const PAGE_SIZE = 500;
const PLACE_BATCH = 50;
const UPDATE_BATCH = 500;

export const BUY_AMOUNT = 1;

export function minBuyPrice(steamPrice: number): number {
  return Math.ceil(steamPrice * 10) / 100;
}

export async function fetchMarketBuyOrders(): Promise<Map<string, MarketBuyOrder>> {
  const res = await fetch(`${BASE}/external/buy-orders/data`, {
    headers: { Authorization: `Bearer ${config.rustskinsApiKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Buy orders data error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as MarketBuyOrder[];
  return new Map(data.map((d) => [d.item, d]));
}

export async function fetchOwnBuyOrders(): Promise<OwnBuyOrder[]> {
  const out: OwnBuyOrder[] = [];
  let page = 1;
  for (;;) {
    const res = await fetch(`${BASE}/external/buy-orders/v2?page=${page}&take=${PAGE_SIZE}`, {
      headers: { Authorization: `Bearer ${config.rustskinsApiKey}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Own buy orders error ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as OwnBuyOrder[];
    out.push(...data);
    if (data.length < PAGE_SIZE) {
      break;
    }
    page += 1;
  }
  return out;
}

export async function placeBuyOrders(items: NewBuyOrder[]): Promise<number> {
  let sent = 0;
  for (let i = 0; i < items.length; i += PLACE_BATCH) {
    const chunk = items.slice(i, i + PLACE_BATCH);
    const res = await fetch(`${BASE}/external/buy-orders/v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.rustskinsApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: chunk }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Place buy orders error ${res.status}: ${body.slice(0, 300)}`);
    }
    sent += chunk.length;
  }
  return sent;
}

export async function updateBuyOrders(orders: BuyOrderPriceUpdate[]): Promise<number> {
  let sent = 0;
  for (let i = 0; i < orders.length; i += UPDATE_BATCH) {
    const chunk = orders.slice(i, i + UPDATE_BATCH);
    const res = await fetch(`${BASE}/external/buy-orders/v2`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${config.rustskinsApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orders: chunk }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Update buy orders error ${res.status}: ${body.slice(0, 300)}`);
    }
    sent += chunk.length;
  }
  return sent;
}

export function planBuyOrders(
  pricing: PricingItem[],
  marketOrders: Map<string, MarketBuyOrder>,
  ownOrders: OwnBuyOrder[],
  itemIdByName: Map<string, number>,
  maxNewOrders: number | null,
  steamPriceByName: Map<string, number>,
): BuyOrderPlan {
  const plan: BuyOrderPlan = { place: [], update: [], skipped: [] };

  const ownByName = new Map<string, OwnBuyOrder[]>();
  for (const o of ownOrders) {
    const list = ownByName.get(o.name) ?? [];
    list.push(o);
    ownByName.set(o.name, list);
  }

  const sorted = [...pricing].sort((a, b) => a.deposit_price - b.deposit_price);

  for (const p of sorted) {
    const name = p.market_hash_name;
    const deposit = p.deposit_price;
    if (!Number.isFinite(deposit) || deposit < 0.01) {
      plan.skipped.push({ name, reason: "dust" });
      continue;
    }
    const highest = marketOrders.get(name)?.price ?? null;
    if (highest !== null && highest >= deposit) {
      plan.skipped.push({ name, reason: "capped" });
      continue;
    }
    const target = highest === null ? round2(deposit) : Math.min(round2(highest + 0.01), round2(deposit));

    const steamPrice = steamPriceByName.get(name);
    if (steamPrice !== undefined && target < minBuyPrice(steamPrice)) {
      plan.skipped.push({ name, reason: "below-minimum" });
      continue;
    }

    const own = ownByName.get(name) ?? [];
    const bestOwn = own.length > 0 ? Math.max(...own.map((o) => o.price)) : null;
    if (bestOwn !== null && round2(bestOwn) >= target) {
      plan.skipped.push({ name, reason: "already-highest" });
      continue;
    }

    const itemId = itemIdByName.get(name);
    if (itemId === undefined) {
      plan.skipped.push({ name, reason: "no-item-id" });
      continue;
    }

    if (own.length === 0) {
      if (maxNewOrders !== null && plan.place.length >= maxNewOrders) {
        plan.skipped.push({ name, reason: "over-cap" });
        continue;
      }
      plan.place.push({ itemId, price: target, amount: BUY_AMOUNT, keepActive: true, name, highest, deposit });
    } else {
      for (const o of own) {
        if (round2(o.price) >= target) {
          continue;
        }
        plan.update.push({
          itemId: o.itemId,
          state: "active",
          amount: o.amount,
          price: o.price,
          newPrice: target,
          keepActive: o.keepActive,
          newKeepActive: o.keepActive,
          name,
        });
      }
    }
  }

  return plan;
}

export function itemIdByName(market: Map<string, MarketplaceEntry>): Map<string, number> {
  const map = new Map<string, number>();
  for (const [name, entry] of market) {
    map.set(name, entry.itemId);
  }
  return map;
}

export type CatalogEntry = {
  id: number;
  steamPrice: number | null;
};

export async function fetchCatalogItemIds(): Promise<Map<string, CatalogEntry>> {
  const map = new Map<string, CatalogEntry>();
  let page = 1;
  for (;;) {
    const res = await fetch(`${BASE}/external/items?appId=252490&page=${page}&take=${PAGE_SIZE}`, {
      headers: { Authorization: `Bearer ${config.rustskinsApiKey}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Items catalog error ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { id: number; name: string; steamPrice: number | null }[];
    for (const item of data) {
      if (!map.has(item.name)) {
        map.set(item.name, { id: item.id, steamPrice: item.steamPrice });
      }
    }
    if (data.length < PAGE_SIZE) {
      break;
    }
    page += 1;
  }
  return map;
}
