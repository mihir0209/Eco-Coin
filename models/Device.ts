import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IDevice extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  name: string;
  type: 'smartphone' | 'laptop' | 'monitor' | 'tablet' | 'other';
  health: number;
  eolPrediction: string;
  ecoCoins: number;
  status: 'good' | 'warning' | 'critical';
  lastCheck: Date;
  batteryHealth?: number;
  performanceScore: number;
  isRecycled: boolean;
  recycledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Device name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['smartphone', 'laptop', 'monitor', 'tablet', 'other'],
      required: true,
    },
    health: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    eolPrediction: {
      type: String,
      required: true,
    },
    ecoCoins: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['good', 'warning', 'critical'],
      default: 'good',
    },
    lastCheck: {
      type: Date,
      default: Date.now,
    },
    batteryHealth: {
      type: Number,
      min: 0,
      max: 100,
    },
    performanceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    isRecycled: {
      type: Boolean,
      default: false,
    },
    recycledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
DeviceSchema.index({ userId: 1, isRecycled: 1 });
DeviceSchema.index({ status: 1 });

const Device = models.Device || model<IDevice>('Device', DeviceSchema);

export default Device;
