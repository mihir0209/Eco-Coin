import CarbonCollateralPosition, {
  ICarbonCollateralPosition,
} from "../models/CarbonCollateralPosition";

export interface PositionHealth {
  collateralValueUsd: number;
  debtValueUsd: number;
  collateralRatioPct: number;
  healthFactor: number;
  isLiquidatable: boolean;
}

export interface LiquidationResult {
  positionId: string;
  liquidatorAddress: string;
  debtRepaid: number;
  collateralSeized: number;
  penaltyCollateralEarned: number;
  remainingDebt: number;
  remainingCollateral: number;
}

/**
 * Compute health metrics for a collateralized carbon debt position.
 * Health Factor = (Collateral Ratio) / (Min Collateral Ratio)
 * HF < 1.0 means position is insolvent/liquidatable.
 */
export function computePositionHealth(
  collateralAmount: number,
  collateralPriceUsd: number,
  debtAmount: number,
  carbonPriceUsd: number,
  minCollateralRatioPct: number = 120
): PositionHealth {
  if (collateralAmount < 0 || debtAmount < 0 || collateralPriceUsd <= 0 || carbonPriceUsd <= 0) {
    throw new Error("Invalid parameters for health calculation");
  }

  if (debtAmount === 0) {
    return {
      collateralValueUsd: collateralAmount * collateralPriceUsd,
      debtValueUsd: 0,
      collateralRatioPct: Infinity,
      healthFactor: Infinity,
      isLiquidatable: false,
    };
  }

  const collateralValueUsd = collateralAmount * collateralPriceUsd;
  const debtValueUsd = debtAmount * carbonPriceUsd;
  const collateralRatioPct = Number(((collateralValueUsd / debtValueUsd) * 100).toFixed(2));
  const healthFactor = Number((collateralRatioPct / minCollateralRatioPct).toFixed(4));
  const isLiquidatable = healthFactor < 1.0;

  return {
    collateralValueUsd,
    debtValueUsd,
    collateralRatioPct,
    healthFactor,
    isLiquidatable,
  };
}

/**
 * Calculate amount of collateral seized by liquidator including liquidation discount penalty.
 */
export function calculateLiquidationSeizure(
  debtRepaid: number,
  collateralPriceUsd: number,
  carbonPriceUsd: number,
  liquidationPenaltyPct: number = 8
): { totalCollateralSeized: number; penaltyBonusCollateral: number } {
  if (debtRepaid <= 0 || collateralPriceUsd <= 0 || carbonPriceUsd <= 0) {
    throw new Error("Invalid liquidation calculation inputs");
  }

  const baseDebtValueUsd = debtRepaid * carbonPriceUsd;
  const bonusMultiplier = 1 + liquidationPenaltyPct / 100;
  const totalSeizedValueUsd = baseDebtValueUsd * bonusMultiplier;

  const totalCollateralSeized = Number((totalSeizedValueUsd / collateralPriceUsd).toFixed(4));
  const baseCollateralSeized = Number((baseDebtValueUsd / collateralPriceUsd).toFixed(4));
  const penaltyBonusCollateral = Number((totalCollateralSeized - baseCollateralSeized).toFixed(4));

  return { totalCollateralSeized, penaltyBonusCollateral };
}

/**
 * Execute liquidation of an undercollateralized carbon position.
 */
export async function executeLiquidation(
  positionId: string,
  liquidatorAddress: string,
  debtRepaymentAmount: number
): Promise<LiquidationResult> {
  const position = await CarbonCollateralPosition.findOne({ positionId });
  if (!position) {
    throw new Error(`Position ${positionId} not found`);
  }

  if (position.status === "LIQUIDATED") {
    throw new Error(`Position ${positionId} is already fully liquidated`);
  }

  const health = computePositionHealth(
    position.collateralAmount,
    position.collateralPriceUsd,
    position.debtAmount,
    position.carbonPriceUsd,
    position.minCollateralRatioPct
  );

  if (!health.isLiquidatable) {
    throw new Error(`Position ${positionId} is solvent (HF: ${health.healthFactor} >= 1.0)`);
  }

  const actualDebtToRepay = Math.min(debtRepaymentAmount, position.debtAmount);
  const { totalCollateralSeized, penaltyBonusCollateral } = calculateLiquidationSeizure(
    actualDebtToRepay,
    position.collateralPriceUsd,
    position.carbonPriceUsd,
    position.liquidationPenaltyPct
  );

  if (totalCollateralSeized > position.collateralAmount) {
    throw new Error("Insufficient collateral remaining in position to cover liquidation bonus");
  }

  position.debtAmount -= actualDebtToRepay;
  position.collateralAmount -= totalCollateralSeized;

  if (position.debtAmount === 0 || position.collateralAmount === 0) {
    position.status = "LIQUIDATED";
  } else {
    position.status = "UNDERCOLLATERALIZED";
  }

  position.liquidatedAt = new Date();
  position.liquidatorAddress = liquidatorAddress;
  await position.save();

  return {
    positionId,
    liquidatorAddress,
    debtRepaid: actualDebtToRepay,
    collateralSeized: totalCollateralSeized,
    penaltyCollateralEarned: penaltyBonusCollateral,
    remainingDebt: position.debtAmount,
    remainingCollateral: position.collateralAmount,
  };
}
