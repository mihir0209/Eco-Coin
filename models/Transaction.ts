import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface ITransaction extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  type: 'earn' | 'redeem' | 'recycle';
  amount: number;
  description: string;
  deviceId?: mongoose.Types.ObjectId;
  rewardId?: mongoose.Types.ObjectId;
  idempotencyKey?: string;
  receiptHash?: string;
  status?: 'settled' | 'pending' | 'failed';
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['earn', 'redeem', 'recycle'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Device',
    },
    rewardId: {
      type: Schema.Types.ObjectId,
      ref: 'Reward',
    },
    idempotencyKey: {
      type: String,
    },
    receiptHash: {
      type: String,
    },
    status: {
      type: String,
      enum: ['settled', 'pending', 'failed'],
      default: 'settled',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
TransactionSchema.index({ userId: 1, timestamp: -1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

const Transaction = models.Transaction || model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
