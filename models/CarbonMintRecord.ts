import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICarbonMintRecord extends Document {
  userId: string;
  deviceId: string;
  activityType: string;
  unitsClaimed: number;
  co2GramsAvoided: number;
  ecoCoinsMinted: number;
  attestationHash: string;
  createdAt: Date;
}

const CarbonMintRecordSchema = new Schema<ICarbonMintRecord>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      required: true,
      index: true,
    },
    unitsClaimed: {
      type: Number,
      required: true,
    },
    co2GramsAvoided: {
      type: Number,
      required: true,
    },
    ecoCoinsMinted: {
      type: Number,
      required: true,
    },
    attestationHash: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

CarbonMintRecordSchema.index({ deviceId: 1, createdAt: -1 });

const CarbonMintRecord: Model<ICarbonMintRecord> =
  mongoose.models.CarbonMintRecord ||
  mongoose.model<ICarbonMintRecord>('CarbonMintRecord', CarbonMintRecordSchema);

export default CarbonMintRecord;
