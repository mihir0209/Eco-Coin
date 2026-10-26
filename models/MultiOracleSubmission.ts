import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOracleReport {
  oracleId: string;
  energyProducedKwh: number;
  carbonOffsetKg: number;
  timestamp: Date;
  signature: string;
}

export interface IMultiOracleSubmission extends Document {
  submissionId: string;
  projectId: string;
  epoch: number;
  thresholdRequired: number;
  reports: IOracleReport[];
  status: "pending" | "approved" | "rejected" | "disputed";
  consensusEnergyKwh?: number;
  consensusCarbonOffsetKg?: number;
  varianceThresholdPercent: number;
  consensusReachedAt?: Date;
  createdAt: Date;
}

const MultiOracleSubmissionSchema: Schema<IMultiOracleSubmission> = new Schema({
  submissionId: { type: String, required: true, unique: true, index: true },
  projectId: { type: String, required: true, index: true },
  epoch: { type: Number, required: true },
  thresholdRequired: { type: Number, default: 3 },
  reports: [
    {
      oracleId: { type: String, required: true },
      energyProducedKwh: { type: Number, required: true },
      carbonOffsetKg: { type: Number, required: true },
      timestamp: { type: Date, default: Date.now },
      signature: { type: String, required: true },
    },
  ],
  status: { type: String, enum: ["pending", "approved", "rejected", "disputed"], default: "pending" },
  consensusEnergyKwh: { type: Number },
  consensusCarbonOffsetKg: { type: Number },
  varianceThresholdPercent: { type: Number, default: 15.0 },
  consensusReachedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export const MultiOracleSubmission: Model<IMultiOracleSubmission> =
  mongoose.models.MultiOracleSubmission ||
  mongoose.model<IMultiOracleSubmission>("MultiOracleSubmission", MultiOracleSubmissionSchema);

export default MultiOracleSubmission;
