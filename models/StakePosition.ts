import mongoose, { Schema, Document } from "mongoose";

export interface IStakePosition extends Document {
  userId: mongoose.Types.ObjectId;
  poolId: string;
  amount: number;
  lockPeriodDays: number;
  apyBase: number;
  carbonYieldMultiplier: number;
  startDate: Date;
  maturityDate: Date;
  status: "active" | "unbonding" | "withdrawn" | "slashed";
  unbondingStartDate?: Date;
  rewardsClaimed: number;
  penaltyFeeBurned: number;
  createdAt: Date;
  updatedAt: Date;
}

const StakePositionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    poolId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    lockPeriodDays: {
      type: Number,
      required: true,
      enum: [30, 90, 180, 365],
    },
    apyBase: {
      type: Number,
      required: true,
      default: 0.08, // 8% base APY
    },
    carbonYieldMultiplier: {
      type: Number,
      required: true,
      default: 1.0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    maturityDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "unbonding", "withdrawn", "slashed"],
      default: "active",
      index: true,
    },
    unbondingStartDate: {
      type: Date,
    },
    rewardsClaimed: {
      type: Number,
      default: 0,
    },
    penaltyFeeBurned: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.StakePosition ||
  mongoose.model<IStakePosition>("StakePosition", StakePositionSchema);
