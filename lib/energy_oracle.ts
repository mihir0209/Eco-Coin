import crypto from 'crypto';
import { EnergyTelemetry, IEnergyTelemetry } from '@/models/EnergyTelemetry';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

export interface TelemetrySubmission {
  deviceId: string;
  deviceSecretKey?: string;
  deviceSignature: string;
  generationType: 'solar' | 'wind' | 'hydro' | 'biomass';
  kwhGenerated: number;
  peakCapacityKw: number;
  intervalMinutes: number;
  timestamp: string | Date;
  nonce: string;
  userId: string;
}

export class EnergyOracleEngine {
  static generateSignature(
    deviceId: string,
    kwhGenerated: number,
    timestamp: string,
    nonce: string,
    secret: string
  ): string {
    const payload = `${deviceId}:${kwhGenerated}:${timestamp}:${nonce}`;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  static async submitTelemetry(data: TelemetrySubmission): Promise<IEnergyTelemetry> {
    const {
      deviceId,
      deviceSecretKey = 'mock-iot-shared-secret',
      deviceSignature,
      generationType,
      kwhGenerated,
      peakCapacityKw,
      intervalMinutes,
      timestamp,
      nonce,
      userId,
    } = data;

    const tsString = typeof timestamp === 'string' ? timestamp : timestamp.toISOString();

    // 1. Check for Replay Attack
    const existing = await EnergyTelemetry.findOne({ deviceId, nonce });
    if (existing) {
      throw new Error(`Replay attack detected: telemetry nonce '${nonce}' already processed`);
    }

    // 2. Validate Cryptographic Signature
    const expectedSig = this.generateSignature(deviceId, kwhGenerated, tsString, nonce, deviceSecretKey);
    if (deviceSignature !== expectedSig) {
      throw new Error('Invalid device cryptographic signature');
    }

    // 3. Physical Boundary Anomaly Detection
    // Maximum possible generation = Peak Capacity (kW) * (interval / 60 hours) * 1.05 tolerance
    const maxPossibleKwh = peakCapacityKw * (intervalMinutes / 60) * 1.05;
    let status: 'verified' | 'anomalous' | 'rejected' = 'verified';
    let anomalyReason: string | undefined;

    if (kwhGenerated > maxPossibleKwh) {
      status = 'anomalous';
      anomalyReason = `Generation of ${kwhGenerated} kWh exceeds physical nameplate ceiling of ${maxPossibleKwh.toFixed(2)} kWh for ${intervalMinutes} min interval`;
    }

    // 4. Calculate Minting (1 Eco-Coin per 10 kWh generated)
    let ecoCoinsMinted = 0;
    if (status === 'verified') {
      ecoCoinsMinted = Math.floor(kwhGenerated / 10);
      if (ecoCoinsMinted > 0) {
        const user = await User.findById(userId);
        if (user) {
          user.totalEcoCoins += ecoCoinsMinted;
          await user.save();

          await Transaction.create({
            userId: user._id,
            amount: ecoCoinsMinted,
            type: 'earn',
            description: `Proof of Green Energy: ${kwhGenerated} kWh ${generationType} generation (device: ${deviceId})`,
          });
        }
      }
    }

    const record = await EnergyTelemetry.create({
      deviceId,
      deviceSignature,
      generationType,
      kwhGenerated,
      peakCapacityKw,
      intervalMinutes,
      timestamp: new Date(timestamp),
      nonce,
      ecoCoinsMinted,
      status,
      anomalyReason,
      userId,
    });

    return record;
  }
}
