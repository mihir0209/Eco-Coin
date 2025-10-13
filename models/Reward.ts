import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IReward extends Document {
  _id: string;
  title: string;
  description: string;
  costInCoins: number;
  category: 'discount' | 'environmental' | 'donation' | 'other';
  isActive: boolean;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RewardSchema = new Schema<IReward>(
  {
    title: {
      type: String,
      required: [true, 'Reward title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Reward description is required'],
    },
    costInCoins: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: ['discount', 'environmental', 'donation', 'other'],
      default: 'other',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    imageUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
RewardSchema.index({ isActive: 1, costInCoins: 1 });

const Reward = models.Reward || model<IReward>('Reward', RewardSchema);

export default Reward;
