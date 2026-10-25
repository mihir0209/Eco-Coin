import mongoose, { Schema, Document } from 'mongoose';

export interface IEnergyTelemetry extends Document {
  deviceId: string;
  deviceSignature: string;
  generationType: 'solar' | 'wind' | 'hydro' | 'biomass';
  kwhGenerated: number;
  peakCapacityKw: number;
  intervalMinutes: number;
  timestamp: Date;
  nonce: string;
  ecoCoinsMinted: number;
  status: 'verified' | 'anomalous' | 'rejected';
  anomalyReason?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const EnergyTelemetrySchema = new Schema<IEnergyTelemetry>(
  {
    deviceId: { type: String, required: true, index: true },
    deviceSignature: { type: String, required: true },
    generationType: {
      type: String,
      enum: ['solar', 'wind', 'hydro', 'biomass'],
      required: true,
    },
    kwhGenerated: { type: Number, required: true, min: 0 },
    peakCapacityKw: { type: Number, required: true, min: 0 },
    intervalMinutes: { type: Number, required: true, min: 1 },
    timestamp: { type: Date, required: true },
    nonce: { type: String, required: true, index: true },
    ecoCoinsMinted: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['verified', 'anomalous', 'rejected'],
      default: 'verified',
    },
    anomalyReason: { type: String },
    userId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

EnergyTelemetrySchema.index({ deviceId: 1, nonce: 1 }, { unique: true });

export const EnergyTelemetry =
  mongoose.models.EnergyTelemetry || mongoose.model<IEnergyTelemetry>('EnergyTelemetry', EnergyTelemetrySchema);
