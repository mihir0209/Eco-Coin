import mongoose, { Document, Schema } from "mongoose";

export interface IPriceSnapshot {
  price: number;
  timestamp: number;
  tradeVolume: number;
}

export interface ICarbonSlippageGovernor extends Document {
  poolId: string;
  baseToken: string;
  quoteToken: string;
  reserveBase: number;
  reserveQuote: number;
  currentPrice: number;
  maxSlippageBps: number; // Basis points (e.g., 200 = 2%)
  circuitBreakerThresholdPct: number; // e.g. 15 = 15%
  isCircuitBreakerTripped: boolean;
  trippedUntil?: Date;
  priceHistory: IPriceSnapshot[];
  updatedAt: Date;
}

const PriceSnapshotSchema = new Schema(
  {
    price: { type: Number, required: true },
    timestamp: { type: Number, required: true },
    tradeVolume: { type: Number, required: true },
  },
  { _id: false }
);

const CarbonSlippageGovernorSchema: Schema = new Schema(
  {
    poolId: { type: String, required: true, unique: true, index: true },
    baseToken: { type: String, required: true },
    quoteToken: { type: String, required: true },
    reserveBase: { type: Number, required: true, min: 0 },
    reserveQuote: { type: Number, required: true, min: 0 },
    currentPrice: { type: Number, required: true, min: 0 },
    maxSlippageBps: { type: Number, default: 200 },
    circuitBreakerThresholdPct: { type: Number, default: 15 },
    isCircuitBreakerTripped: { type: Boolean, default: false },
    trippedUntil: { type: Date },
    priceHistory: { type: [PriceSnapshotSchema], default: [] },
  },
  { timestamps: true }
);

export default (mongoose.models.CarbonSlippageGovernor as mongoose.Model<ICarbonSlippageGovernor>) ||
  mongoose.model<ICarbonSlippageGovernor>("CarbonSlippageGovernor", CarbonSlippageGovernorSchema);
