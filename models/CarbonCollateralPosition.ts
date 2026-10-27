import mongoose, { Document, Schema } from "mongoose";

export interface ICarbonCollateralPosition extends Document {
  positionId: string;
  borrowerAddress: string;
  collateralAmount: number; // e.g. USDC or collateral asset
  debtAmount: number; // e.g. Carbon credits borrowed
  collateralPriceUsd: number;
  carbonPriceUsd: number;
  minCollateralRatioPct: number; // e.g. 120%
  liquidationPenaltyPct: number; // e.g. 8%
  status: "HEALTHY" | "UNDERCOLLATERALIZED" | "LIQUIDATED";
  liquidatedAt?: Date;
  liquidatorAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CarbonCollateralPositionSchema: Schema = new Schema(
  {
    positionId: { type: String, required: true, unique: true, index: true },
    borrowerAddress: { type: String, required: true, index: true },
    collateralAmount: { type: Number, required: true, min: 0 },
    debtAmount: { type: Number, required: true, min: 0 },
    collateralPriceUsd: { type: Number, required: true, min: 0 },
    carbonPriceUsd: { type: Number, required: true, min: 0 },
    minCollateralRatioPct: { type: Number, default: 120 },
    liquidationPenaltyPct: { type: Number, default: 8 },
    status: {
      type: String,
      enum: ["HEALTHY", "UNDERCOLLATERALIZED", "LIQUIDATED"],
      default: "HEALTHY",
    },
    liquidatedAt: { type: Date },
    liquidatorAddress: { type: String },
  },
  { timestamps: true }
);

export default (mongoose.models.CarbonCollateralPosition as mongoose.Model<ICarbonCollateralPosition>) ||
  mongoose.model<ICarbonCollateralPosition>("CarbonCollateralPosition", CarbonCollateralPositionSchema);
