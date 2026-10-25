import mongoose, { Schema, Document } from 'mongoose';

export interface ICarbonLockbox extends Document {
  lockId: string;
  userId: string;
  creditStandard: 'Verra' | 'GoldStandard' | 'PuroEarth';
  serialNumber: string;
  vintageYear: number;
  totalTonsLocked: number;
  fractionalTokensIssued: number;
  targetChain: string;
  recipientAddress: string;
  merkleRootHash: string;
  status: 'locked' | 'unlocked' | 'bridged';
  createdAt: Date;
  updatedAt: Date;
}

const CarbonLockboxSchema = new Schema<ICronLockbox>(
  {
    lockId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    creditStandard: {
      type: String,
      enum: ['Verra', 'GoldStandard', 'PuroEarth'],
      required: true,
    },
    serialNumber: { type: String, required: true, index: true },
    vintageYear: { type: Number, required: true },
    totalTonsLocked: { type: Number, required: true, min: 0.001 },
    fractionalTokensIssued: { type: Number, required: true, min: 1 },
    targetChain: { type: String, required: true },
    recipientAddress: { type: String, required: true },
    merkleRootHash: { type: String, required: true },
    status: {
      type: String,
      enum: ['locked', 'unlocked', 'bridged'],
      default: 'locked',
    },
  },
  { timestamps: true }
);

type ICronLockbox = ICarbonLockbox;

export const CarbonLockbox =
  mongoose.models.CarbonLockbox || mongoose.model<ICarbonLockbox>('CarbonLockbox', CarbonLockboxSchema);
