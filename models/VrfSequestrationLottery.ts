import mongoose, { Document, Schema } from "mongoose";

export interface IAuditorCandidate {
  auditorId: string;
  auditorName: string;
  stakedTokens: number;
  reputationScore: number; // 0 to 100
  selectedAsAuditor?: boolean;
}

export interface IVrfSequestrationLottery extends Document {
  roundId: string;
  projectId: string;
  vrfSeedCommitment: string; // SHA-256 of private seed
  revealedVrfSeed?: string;
  candidates: IAuditorCandidate[];
  selectedAuditorId?: string;
  selectionProof?: string;
  status: "COMMITTED" | "RESOLVED" | "DISPUTED";
  minStakeRequired: number;
  createdAt: Date;
  resolvedAt?: Date;
}

const AuditorCandidateSchema = new Schema(
  {
    auditorId: { type: String, required: true },
    auditorName: { type: String, required: true },
    stakedTokens: { type: Number, required: true, min: 0 },
    reputationScore: { type: Number, required: true, min: 0, max: 100 },
    selectedAsAuditor: { type: Boolean, default: false },
  },
  { _id: false }
);

const VrfSequestrationLotterySchema: Schema = new Schema(
  {
    roundId: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    vrfSeedCommitment: { type: String, required: true },
    revealedVrfSeed: { type: String },
    candidates: { type: [AuditorCandidateSchema], required: true },
    selectedAuditorId: { type: String },
    selectionProof: { type: String },
    status: {
      type: String,
      enum: ["COMMITTED", "RESOLVED", "DISPUTED"],
      default: "COMMITTED",
    },
    minStakeRequired: { type: Number, required: true, min: 1 },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.VrfSequestrationLottery ||
  mongoose.model<IVrfSequestrationLottery>("VrfSequestrationLottery", VrfSequestrationLotterySchema);
