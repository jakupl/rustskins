export type PricingItem = {
  market_hash_name: string;
  deposit_price: number;
  withdraw_price: number;
  overstock_limit: number;
};

export type MarketplaceEntry = {
  item: string;
  price: number;
  steamPrice: number | null;
  count: number;
  itemId: number;
  listingId: number;
  image: string | null;
  prices: number[];
};

export type JoinedRow = {
  name: string;
  depositPrice: number;
  withdrawPrice: number;
  cheapestListing: number | null;
  listingCount: number | null;
  listingId: number | null;
  floorPrice: number;
};

export type OwnListing = {
  itemId: number;
  name: string;
  amount: number;
  price: number;
  sellerFeePerItem: number;
};

export type ListingPriceUpdate = {
  itemId: number;
  amount: number;
  price: number;
  sellerFeePerItem: number;
  newPrice: number;
};

export type PlannedUpdate = ListingPriceUpdate & {
  name: string;
  cheapest: number | null;
  floor: number;
  reason: "undercut" | "clamped-to-floor" | "no-competition";
};

export type SkippedListing = {
  name: string;
  reason: "no-deposit" | "below-floor" | "already-cheapest" | "no-change";
};

export type UndercutPlan = {
  updates: PlannedUpdate[];
  skipped: SkippedListing[];
};

export type SteamInventoryItem = {
  steamItemId: number;
  name: string;
  amount: number;
  tradable: boolean;
  steamPrice: number | null;
};

export type SteamDepositItem = {
  steamItemId: number;
  amount: number;
  price: number;
};

export type MarketBuyOrder = {
  item: string;
  price: number;
  count: number;
};

export type OwnBuyOrder = {
  itemId: number;
  name: string;
  amount: number;
  price: number;
  active: boolean;
  keepActive: boolean;
};

export type NewBuyOrder = {
  itemId: number;
  price: number;
  amount: number;
  keepActive: boolean;
};

export type BuyOrderPriceUpdate = {
  itemId: number;
  state: "active" | "paused";
  amount: number;
  price: number;
  newPrice: number;
  keepActive: boolean;
  newKeepActive: boolean;
};

export type PlannedBuyOrder = NewBuyOrder & {
  name: string;
  highest: number | null;
  deposit: number;
};

export type PlannedBuyOrderUpdate = BuyOrderPriceUpdate & {
  name: string;
};

export type SkippedBuyOrder = {
  name: string;
  reason: "no-deposit" | "no-item-id" | "capped" | "already-highest" | "dust" | "over-cap" | "below-minimum";
};

export type BuyOrderPlan = {
  place: PlannedBuyOrder[];
  update: PlannedBuyOrderUpdate[];
  skipped: SkippedBuyOrder[];
};
