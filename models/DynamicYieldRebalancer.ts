import mongoose, { Document, Schema } from "mongoose";

export interface IDynamicYieldRebalancer extends Document {
  strategyId: string;
  poolA: string;
  poolB: string;
  apyA: number;
  apyB: number;
  allocationA: number; // percentage [0, 100]
  allocationB: number;
  minYieldDeltaPct: number;
  lastRebalancedAt: Date;
}

const DynamicYieldRebalancerSchema: Schema = new Schema(
  {
    strategyId: { type: String, required: true, unique: true, index: true },
    poolA: { type: String, required: true },
    poolB: { type: String, required: true },
    apyA: { type: Number, required: true },
    apyB: { type: Number, required: true },
    allocationA: { type: Number, required: true, min: 0, max: 100 },
    allocationB: { type: Number, required: true, min: 0, max: 100 },
    minYieldDeltaPct: { type: Number, default: 2.0 },
    lastRebalancedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default (mongoose.models.DynamicYieldRebalancer as mongoose.Model<IDynamicYieldRebalancer>) ||
  mongoose.model<IDynamicYieldRebalancer>("DynamicYieldRebalancer", DynamicYieldRebalancerSchema);
