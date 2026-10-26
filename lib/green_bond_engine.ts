import { GreenBond, IGreenBond } from "@/models/GreenBond";

export interface CouponPayoutReceipt {
  bondId: string;
  epoch: number;
  couponAmountPaid: number;
  penaltyDeducted: number;
  yieldRatio: number;
  status: string;
}

export async function issueGreenBond(
  bondId: string,
  issuer: string,
  projectType: "solar" | "wind" | "hydro" | "geothermal",
  principalAmount: number,
  couponRateBps: number,
  totalEpochs: number,
  committedYieldKwh: number
): Promise<IGreenBond> {
  if (principalAmount <= 0) {
    throw new Error("Principal amount must be positive");
  }
  if (couponRateBps <= 0 || couponRateBps > 3000) {
    throw new Error("Coupon rate bps must be between 1 and 3000 (0.01% - 30%)");
  }
  if (totalEpochs <= 0) {
    throw new Error("Total epochs must be at least 1");
  }

  const existing = await GreenBond.findOne({ bondId });
  if (existing) {
    throw new Error(`Green bond ${bondId} already exists`);
  }

  // Escrow requirement: 15% of principal required as performance collateral
  const escrowCollateral = Math.round(principalAmount * 0.15 * 100) / 100;

  const bond = new GreenBond({
    bondId,
    issuer,
    projectType,
    principalAmount,
    couponRateBps,
    totalEpochs,
    currentEpoch: 0,
    couponsPaid: 0,
    committedYieldKwh,
    actualYieldKwh: 0,
    escrowCollateral,
    status: "active",
  });

  return await bond.save();
}

export async function processCouponPayout(
  bondId: string,
  epochTelemetryYieldKwh: number
): Promise<CouponPayoutReceipt> {
  const bond = await GreenBond.findOne({ bondId });
  if (!bond) {
    throw new Error(`Green bond ${bondId} not found`);
  }

  if (bond.status !== "active") {
    throw new Error(`Bond is not active for coupon payouts (current status: ${bond.status})`);
  }

  bond.currentEpoch += 1;
  bond.actualYieldKwh += epochTelemetryYieldKwh;

  const standardCoupon = (bond.principalAmount * (bond.couponRateBps / 10000)) / bond.totalEpochs;
  const targetYieldPerEpoch = bond.committedYieldKwh / bond.totalEpochs;
  const yieldRatio = targetYieldPerEpoch > 0 ? epochTelemetryYieldKwh / targetYieldPerEpoch : 1.0;

  let penalty = 0;
  // If telemetry yields less than 75% of target, penalize issuer by slashing escrow
  if (yieldRatio < 0.75) {
    penalty = Math.min(bond.escrowCollateral, Math.round(standardCoupon * 0.5 * 100) / 100);
    bond.escrowCollateral = Math.max(0, bond.escrowCollateral - penalty);
    if (bond.escrowCollateral === 0) {
      bond.status = "slashed";
    }
  }

  const netCoupon = Math.round((standardCoupon + penalty) * 100) / 100;
  bond.couponsPaid += netCoupon;

  if (bond.currentEpoch >= bond.totalEpochs && bond.status === "active") {
    bond.status = "matured";
  }

  await bond.save();

  return {
    bondId,
    epoch: bond.currentEpoch,
    couponAmountPaid: netCoupon,
    penaltyDeducted: penalty,
    yieldRatio: Math.round(yieldRatio * 100) / 100,
    status: bond.status,
  };
}

export async function redeemBondPrincipal(bondId: string): Promise<{ redeemed: number; status: string }> {
  const bond = await GreenBond.findOne({ bondId });
  if (!bond) {
    throw new Error(`Green bond ${bondId} not found`);
  }

  if (bond.status !== "matured") {
    throw new Error(`Principal cannot be redeemed until bond matures (current status: ${bond.status})`);
  }

  return {
    redeemed: bond.principalAmount,
    status: "matured",
  };
}
