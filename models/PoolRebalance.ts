import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPoolRebalance extends Document {
  pairSymbol: string;
  baseReserve: number;
  quoteReserve: number;
  targetRatio: number;
  currentRatio: number;
  deviationBps: number;
  dynamicFeeBps: number;
  rebalanceAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PoolRebalanceSchema = new Schema<IPoolRebalance>(
  {
    pairSymbol: { type: String, required: true, index: true },
    baseReserve: { type: Number, required: true, min: 0 },
    quoteReserve: { type: Number, required: true, min: 0 },
    targetRatio: { type: Number, required: true },
    currentRatio: { type: Number, required: true },
    deviationBps: { type: Number, required: true },
    dynamicFeeBps: { type: Number, default: 30 },
    rebalanceAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const PoolRebalance: Model<IPoolRebalance> =
  mongoose.models.PoolRebalance ||
  mongoose.model<IPoolRebalance>("PoolRebalance", PoolRebalanceSchema);

export default PoolRebalance;
