export interface RoyaltySplitResult {
  originatingProjectRoyaltyUsd: number;
  indigenousCommunityFundUsd: number;
  protocolTreasuryUsd: number;
  netSellerProceedsUsd: number;
}

export function routeRetrospectiveRoyalty(
  tradeAmountUsd: number,
  yearsSinceVintageIssuance: number,
  royaltyFeeBps: number = 300 // 3.0%
): RoyaltySplitResult {
  if (tradeAmountUsd <= 0) {
    return { originatingProjectRoyaltyUsd: 0, indigenousCommunityFundUsd: 0, protocolTreasuryUsd: 0, netSellerProceedsUsd: 0 };
  }
  const totalRoyaltyUsd = (tradeAmountUsd * royaltyFeeBps) / 10000.0;
  // Royalty allocation: 50% to original forest project, 30% to indigenous land stewardship fund, 20% to protocol
  const originatingProjectRoyaltyUsd = Number((totalRoyaltyUsd * 0.50).toFixed(2));
  const indigenousCommunityFundUsd = Number((totalRoyaltyUsd * 0.30).toFixed(2));
  const protocolTreasuryUsd = Number((totalRoyaltyUsd * 0.20).toFixed(2));
  const netSellerProceedsUsd = Number((tradeAmountUsd - totalRoyaltyUsd).toFixed(2));

  return {
    originatingProjectRoyaltyUsd,
    indigenousCommunityFundUsd,
    protocolTreasuryUsd,
    netSellerProceedsUsd,
  };
}
