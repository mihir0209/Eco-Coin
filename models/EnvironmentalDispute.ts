import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVote {
  juror: string;
  approve: boolean;
  weight: number;
}

export interface IEnvironmentalDispute extends Document {
  disputeId: string;
  challenger: string;
  targetEntity: string;
  claimType: "FALSE_ORACLE_DATA" | "DOUBLE_COUNTED_CREDIT" | "UNVERIFIED_GENERATION";
  evidenceHash: string;
  challengerBond: number;
  votes: IVote[];
  status: "PENDING" | "UPHELD" | "DISMISSED";
  quorumRequired: number;
  penaltyAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const EnvironmentalDisputeSchema = new Schema<IEnvironmentalDispute>(
  {
    disputeId: { type: String, required: true, unique: true, index: true },
    challenger: { type: String, required: true },
    targetEntity: { type: String, required: true },
    claimType: {
      type: String,
      enum: ["FALSE_ORACLE_DATA", "DOUBLE_COUNTED_CREDIT", "UNVERIFIED_GENERATION"],
      required: true,
    },
    evidenceHash: { type: String, required: true },
    challengerBond: { type: Number, required: true, min: 0 },
    votes: [
      {
        juror: { type: String, required: true },
        approve: { type: Boolean, required: true },
        weight: { type: Number, default: 1 },
      },
    ],
    status: {
      type: String,
      enum: ["PENDING", "UPHELD", "DISMISSED"],
      default: "PENDING",
    },
    quorumRequired: { type: Number, default: 3 },
    penaltyAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const EnvironmentalDispute: Model<IEnvironmentalDispute> =
  mongoose.models.EnvironmentalDispute ||
  mongoose.model<IEnvironmentalDispute>("EnvironmentalDispute", EnvironmentalDisputeSchema);

export default EnvironmentalDispute;
