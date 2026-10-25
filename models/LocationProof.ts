import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILocationProof extends Document {
  deviceId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  zoneId?: string | null;
  actionType: string;
  velocityKmH: number;
  distanceToCentroid: number;
  proofReceipt: string;
  createdAt: Date;
}

const LocationProofSchema = new Schema<ILocationProof>(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    zoneId: {
      type: String,
      default: null,
      index: true,
    },
    actionType: {
      type: String,
      default: 'environmental_action',
    },
    velocityKmH: {
      type: Number,
      default: 0,
    },
    distanceToCentroid: {
      type: Number,
      default: 0,
    },
    proofReceipt: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

LocationProofSchema.index({ deviceId: 1, timestamp: -1 });

const LocationProof: Model<ILocationProof> =
  mongoose.models.LocationProof ||
  mongoose.model<ILocationProof>('LocationProof', LocationProofSchema);

export default LocationProof;
