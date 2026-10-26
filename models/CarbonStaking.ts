import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICarbonStaking extends Document {
  stakerAddress: string;
  stakedAmount: number;
  emissionTargetKg: number;
  actualEmissionsKg: number;
  status: "ACTIVE" | "SLASHED" | "UNSTAKED";
  slashedAmount: number;
  rewardsAccrued: number;
  epoch: number;
  auditSignature?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CarbonStakingSchema = new Schema<ICarbonStaking>(
  {
    stakerAddress: { type: String, required: true, index: true },
    stakedAmount: { type: Number, required: true, min: 0 },
    emissionTargetKg: { type: Number, required: true, min: 0 },
    actualEmissionsKg: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["ACTIVE", "SLASHED", "UNSTAKED"],
      default: "ACTIVE",
    },
    slashedAmount: { type: Number, default: 0 },
    rewardsAccrued: { type: Number, default: 0 },
    epoch: { type: Number, default: 1 },
    auditSignature: { type: String },
  },
  { timestamps: true }
);

const CarbonStaking: Model<ICarbonStaking> =
  mongoose.models.CarbonStaking ||
  mongoose.model<ICarbonStaking>("CarbonStaking", CarbonStakingSchema);

export default CarbonStaking;
