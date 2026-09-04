import { config } from "./config.js";
import type { ListingPriceUpdate, OwnListing } from "./types.js";

const BASE = "https://api.rustskins.com";
const PAGE_SIZE = 500;
const PATCH_BATCH = 500;

export async function fetchOwnListings(): Promise<OwnListing[]> {
  const out: OwnListing[] = [];
  let page = 1;
  for (;;) {
    const res = await fetch(`${BASE}/external/listings/v3?page=${page}&take=${PAGE_SIZE}`, {
      headers: { Authorization: `Bearer ${config.rustskinsApiKey}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Listings API error ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as OwnListing[];
    out.push(...data);
    if (data.length < PAGE_SIZE) {
      break;
    }
    page += 1;
  }
  return out;
}

export async function patchListingPrices(updates: ListingPriceUpdate[]): Promise<number> {
  let sent = 0;
  for (let i = 0; i < updates.length; i += PATCH_BATCH) {
    const chunk = updates.slice(i, i + PATCH_BATCH);
    const res = await fetch(`${BASE}/external/listings/v2`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${config.rustskinsApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listings: chunk }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Patch listings error ${res.status}: ${body.slice(0, 300)}`);
    }
    sent += chunk.length;
  }
  return sent;
}
