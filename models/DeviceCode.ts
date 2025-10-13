import mongoose, { Document, Model } from 'mongoose';

export interface IDeviceCode extends Document {
  code: string; // Unique manufacturer code (8 chars + 4 digit eco coins)
  deviceType: string; // laptop, smartphone, tablet, etc.
  brand: string;
  deviceModel: string; // Renamed to avoid conflict with Document.model
  ecoCoinsValue: number; // Last 4 digits of the code
  specifications: {
    storage?: string;
    ram?: string;
    processor?: string;
    screenSize?: string;
    color?: string;
  };
  isRegistered: boolean;
  registeredBy?: mongoose.Types.ObjectId; // User who registered this device
  registeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceCodeSchema = new mongoose.Schema<IDeviceCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z0-9]{8}-[0-9]{4}$/, // Format: ABCD1234-2500
    },
    deviceType: {
      type: String,
      required: true,
      enum: ['laptop', 'smartphone', 'tablet', 'smartwatch', 'desktop', 'monitor', 'other'],
    },
    brand: {
      type: String,
      required: true,
    },
    deviceModel: {
      type: String,
      required: true,
    },
    ecoCoinsValue: {
      type: Number,
      required: true,
      min: 0,
      max: 9999,
    },
    specifications: {
      storage: String,
      ram: String,
      processor: String,
      screenSize: String,
      color: String,
    },
    isRegistered: {
      type: Boolean,
      default: false,
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    registeredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
DeviceCodeSchema.index({ code: 1 });
DeviceCodeSchema.index({ isRegistered: 1 });

const DeviceCode: Model<IDeviceCode> =
  mongoose.models.DeviceCode || mongoose.model<IDeviceCode>('DeviceCode', DeviceCodeSchema);

export default DeviceCode;
