import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import CarbonMintRecord from '@/models/CarbonMintRecord';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

export type CarbonActivityType = 'solar_kwh' | 'ev_km' | 'recycling_kg' | 'tree_planted';

export interface CarbonConversionRule {
  name: string;
  co2GramsPerUnit: number;
  ecoCoinsPerUnit: number;
  maxDailyCapacityPerDevice: number;
}

export const CARBON_RULES: Record<CarbonActivityType, CarbonConversionRule> = {
  solar_kwh: {
    name: 'Solar Clean Energy Generation',
    co2GramsPerUnit: 400, // 400g CO2e offset per kWh
    ecoCoinsPerUnit: 4,
    maxDailyCapacityPerDevice: 150, // 150 kWh/day physical ceiling
  },
  ev_km: {
    name: 'Zero-Emission Electric Mobility',
    co2GramsPerUnit: 120, // 120g CO2e offset per km
    ecoCoinsPerUnit: 1.2,
    maxDailyCapacityPerDevice: 1500, // 1500 km/day physical ceiling
  },
  recycling_kg: {
    name: 'Diverted Plastic & Metal Recycling',
    co2GramsPerUnit: 1500, // 1.5kg CO2e per kg recycled
    ecoCoinsPerUnit: 15,
    maxDailyCapacityPerDevice: 500, // 500 kg/day ceiling
  },
  tree_planted: {
    name: 'Afforestation & Bio-Sequestration',
    co2GramsPerUnit: 25000, // 25kg CO2e per verified tree
    ecoCoinsPerUnit: 250,
    maxDailyCapacityPerDevice: 50, // 50 trees/day ceiling
  },
};

export interface CarbonMintRequest {
  userId: string;
  deviceId: string;
  activityType: CarbonActivityType;
  unitsClaimed: number;
  timestamp?: number | string | Date;
}

export interface CarbonMintResult {
  success: boolean;
  error?: string;
  code?: string;
  co2GramsAvoided?: number;
  coinsMinted?: number;
  newTotalBalance?: number;
  attestationHash?: string;
}

export async function verifyAndMintCarbonCredits(
  req: CarbonMintRequest
): Promise<CarbonMintResult> {
  const { userId, deviceId, activityType, unitsClaimed } = req;

  // 1. Validation
  if (
    typeof unitsClaimed !== 'number' ||
    isNaN(unitsClaimed) ||
    unitsClaimed <= 0
  ) {
    return {
      success: false,
      code: 'INVALID_UNITS',
      error: 'unitsClaimed must be a positive number',
    };
  }

  const rule = CARBON_RULES[activityType];
  if (!rule) {
    return {
      success: false,
      code: 'UNSUPPORTED_ACTIVITY',
      error: `Activity '${activityType}' is not a recognized carbon offset mechanism`,
    };
  }

  // Check single-claim capacity
  if (unitsClaimed > rule.maxDailyCapacityPerDevice) {
    return {
      success: false,
      code: 'CAPACITY_LIMIT_EXCEEDED',
      error: `Claimed units (${unitsClaimed}) exceed physical device capacity limit of ${rule.maxDailyCapacityPerDevice}`,
    };
  }

  await connectDB();
  await CarbonMintRecord.init();

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 3600 * 1000);

  // 2. Query 24-hour cumulative device minting
  const recentRecords = await CarbonMintRecord.find({
    deviceId,
    activityType,
    createdAt: { $gte: oneDayAgo },
  }).lean();

  const cumulativeUnits = recentRecords.reduce((acc, r) => acc + r.unitsClaimed, 0);
  if (cumulativeUnits + unitsClaimed > rule.maxDailyCapacityPerDevice) {
    return {
      success: false,
      code: 'CAPACITY_LIMIT_EXCEEDED',
      error: `Cumulative 24h claims for device (${cumulativeUnits + unitsClaimed}) exceed physical capacity ceiling of ${rule.maxDailyCapacityPerDevice}`,
    };
  }

  // 3. Compute Avoided Carbon & Minted Coins
  const co2GramsAvoided = Math.round(unitsClaimed * rule.co2GramsPerUnit);
  const coinsMinted = Math.round(unitsClaimed * rule.ecoCoinsPerUnit);

  // 4. Generate Cryptographic Attestation Hash
  const secretKey = process.env.CARBON_MINT_SECRET || 'eco-coin-carbon-mint-key';
  const attestationPayload = `${userId}:${deviceId}:${activityType}:${unitsClaimed}:${now.getTime()}`;
  const attestationHash = crypto
    .createHmac('sha256', secretKey)
    .update(attestationPayload)
    .digest('hex');

  // 5. Atomic Balance Increment
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { totalEcoCoins: coinsMinted } },
    { new: true }
  );

  if (!user) {
    return {
      success: false,
      code: 'USER_NOT_FOUND',
      error: `User with ID '${userId}' does not exist`,
    };
  }

  // 6. Record Minting & Ledger Transaction
  await CarbonMintRecord.create({
    userId,
    deviceId,
    activityType,
    unitsClaimed,
    co2GramsAvoided,
    ecoCoinsMinted: coinsMinted,
    attestationHash,
    createdAt: now,
  });

  await Transaction.create({
    userId,
    type: 'earn',
    amount: coinsMinted,
    description: `Carbon credit minting: ${unitsClaimed} ${activityType} (${co2GramsAvoided}g CO2e offset)`,
    createdAt: now,
  });

  return {
    success: true,
    co2GramsAvoided,
    coinsMinted,
    newTotalBalance: user.totalEcoCoins,
    attestationHash,
  };
}
