import mongoose, { Schema, Document, Model } from "mongoose";

export type RemovalType = "BIOCHAR" | "DAC" | "MINERALIZATION";

export interface IDurabilityEscrow extends Document {
  escrowId: string;
  projectId: string;
  removalType: RemovalType;
  durabilityYears: number; // e.g. 100 or 1000
  totalTonsLocked: number;
  totalEscrowTokens: number;
  vestedTokens: number;
  milestoneIntervalYears: number;
  completedMilestones: number;
  totalMilestones: number;
  status: "ACTIVE" | "VERIFIED" | "SLASHED" | "COMPLETED";
  slashedTokens: number;
  slashingReason?: string;
  createdAt: Date;
  lastVerifiedAt: Date;
}

const DurabilityEscrowSchema: Schema<IDurabilityEscrow> = new Schema({
  escrowId: { type: String, required: true, unique: true, index: true },
  projectId: { type: String, required: true, index: true },
  removalType: {
    type: String,
    enum: ["BIOCHAR", "DAC", "MINERALIZATION"],
    required: true,
  },
  durabilityYears: { type: Number, required: true, min: 20 },
  totalTonsLocked: { type: Number, required: true, min: 1 },
  totalEscrowTokens: { type: Number, required: true, min: 0.01 },
  vestedTokens: { type: Number, default: 0 },
  milestoneIntervalYears: { type: Number, required: true, min: 1 },
  completedMilestones: { type: Number, default: 0 },
  totalMilestones: { type: Number, required: true },
  status: {
    type: String,
    enum: ["ACTIVE", "VERIFIED", "SLASHED", "COMPLETED"],
    default: "ACTIVE",
  },
  slashedTokens: { type: Number, default: 0 },
  slashingReason: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastVerifiedAt: { type: Date, default: Date.now },
});

export const DurabilityEscrow: Model<IDurabilityEscrow> =
  mongoose.models.DurabilityEscrow ||
  mongoose.model<IDurabilityEscrow>("DurabilityEscrow", DurabilityEscrowSchema);

export default DurabilityEscrow;
