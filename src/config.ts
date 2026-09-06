import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var ${name}`);
  }
  return value;
}

export const config = {
  get pricingApiUrl() {
    return process.env.PRICING_API_URL ?? "https://pricing.assetpay.store/prices";
  },
  get pricingApiKey() {
    return required("PRICING_API_KEY");
  },
  get rustskinsApiKey() {
    return required("RUSTSKINS_API_KEY");
  },
  get limit() {
    const raw = process.env.LIMIT ?? "20";
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
  },
  get maxNewOrders() {
    const raw = process.env.MAX_NEW_ORDERS;
    if (raw === undefined || raw === "") {
      return null;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  },
};
