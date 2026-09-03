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
