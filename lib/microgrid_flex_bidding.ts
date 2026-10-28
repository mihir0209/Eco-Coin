export interface FlexBidOrder {
  bidId: string;
  offeredKwh: number;
  minPricePerKwhUsd: number;
  bidType: "CURTAILMENT_REDUCTION" | "PEAK_DISCHARGE";
  expectedMarginUsd: number;
}

export function constructMicrogridFlexBid(
  availableBatteryStorageKwh: number,
  currentSocPct: number,
  marketClearingPriceUsd: number,
  degradationCostPerKwhUsd: number = 0.08
): FlexBidOrder | null {
  if (currentSocPct < 40.0 || marketClearingPriceUsd <= degradationCostPerKwhUsd) {
    return null; // Not profitable to discharge
  }
  const usableSocPct = currentSocPct - 30.0; // Keep 30% reserve
  const offeredKwh = Number(((usableSocPct / 100.0) * availableBatteryStorageKwh).toFixed(2));
  const marginPerKwh = marketClearingPriceUsd - degradationCostPerKwhUsd;
  const expectedMarginUsd = Number((offeredKwh * marginPerKwh).toFixed(2));

  return {
    bidId: `BID-${Math.random().toString(36).substring(7).toUpperCase()}`,
    offeredKwh,
    minPricePerKwhUsd: degradationCostPerKwhUsd,
    bidType: "PEAK_DISCHARGE",
    expectedMarginUsd,
  };
}
