import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFractionalPool extends Document {
  poolId: string;
  name: string;
  certificateId: string;
  totalWholeCreditsLocked: number;
  microCreditReserve: number; // 1 whole credit = 1000 microCredits
  tokenReserve: number; // EcoCoin tokens in pool
  kConstant: number; // x * y = k
  feePercent: number; // e.g. 0.3%
  endowmentAccumulatedTokens: number;
  createdAt: Date;
}

const FractionalPoolSchema: Schema<IFractionalPool> = new Schema({
  poolId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  certificateId: { type: String, required: true, index: true },
  totalWholeCreditsLocked: { type: Number, required: true },
  microCreditReserve: { type: Number, required: true },
  tokenReserve: { type: Number, required: true },
  kConstant: { type: Number, required: true },
  feePercent: { type: Number, default: 0.3 },
  endowmentAccumulatedTokens: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const FractionalPool: Model<IFractionalPool> =
  mongoose.models.FractionalPool ||
  mongoose.model<IFractionalPool>("FractionalPool", FractionalPoolSchema);

export default FractionalPool;
