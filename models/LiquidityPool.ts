import mongoose, { Schema, Document } from 'mongoose';

export interface ILpPosition {
  userId: string;
  shares: number;
}

export interface ILiquidityPool extends Document {
  poolId: string;
  pair: string;
  tokenAReserve: number;
  tokenBReserve: number;
  totalLpShares: number;
  feeNumerator: number; // e.g. 30 = 0.3%
  burnNumerator: number; // e.g. 5 = 0.05%
  lpPositions: ILpPosition[];
  createdAt: Date;
  updatedAt: Date;
}

const LiquidityPoolSchema = new Schema<ILiquidityPool>(
  {
    poolId: { type: String, required: true, unique: true, index: true },
    pair: { type: String, required: true },
    tokenAReserve: { type: Number, required: true, min: 0 },
    tokenBReserve: { type: Number, required: true, min: 0 },
    totalLpShares: { type: Number, required: true, min: 0 },
    feeNumerator: { type: Number, default: 30 },
    burnNumerator: { type: Number, default: 5 },
    lpPositions: [
      {
        userId: { type: String, required: true },
        shares: { type: Number, required: true, min: 0 },
      },
    ],
  },
  { timestamps: true }
);

export const LiquidityPool =
  mongoose.models.LiquidityPool || mongoose.model<ILiquidityPool>('LiquidityPool', LiquidityPoolSchema);
