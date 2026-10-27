import mongoose, { Document, Schema } from "mongoose";

export interface IGovernanceTimelock extends Document {
  actionId: string;
  targetContract: string;
  actionSignature: string;
  payloadParams: any;
  proposer: string;
  proposedAt: Date;
  eta: Date;
  delaySeconds: number;
  gracePeriodSeconds: number;
  status: "QUEUED" | "EXECUTED" | "CANCELLED" | "VETOED" | "EXPIRED";
  vetoedBy?: string;
  vetoReason?: string;
  executedBy?: string;
  executedAt?: Date;
}

const GovernanceTimelockSchema: Schema = new Schema(
  {
    actionId: { type: String, required: true, unique: true, index: true },
    targetContract: { type: String, required: true },
    actionSignature: { type: String, required: true },
    payloadParams: { type: Schema.Types.Mixed },
    proposer: { type: String, required: true },
    proposedAt: { type: Date, default: Date.now },
    eta: { type: Date, required: true },
    delaySeconds: { type: Number, required: true, min: 60 },
    gracePeriodSeconds: { type: Number, default: 86400 }, // 24 hours grace
    status: {
      type: String,
      enum: ["QUEUED", "EXECUTED", "CANCELLED", "VETOED", "EXPIRED"],
      default: "QUEUED",
    },
    vetoedBy: { type: String },
    vetoReason: { type: String },
    executedBy: { type: String },
    executedAt: { type: Date },
  },
  { timestamps: true }
);

export default (mongoose.models.GovernanceTimelock as mongoose.Model<IGovernanceTimelock>) ||
  mongoose.model<IGovernanceTimelock>("GovernanceTimelock", GovernanceTimelockSchema);
