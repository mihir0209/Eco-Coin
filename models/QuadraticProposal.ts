import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuadraticProposal extends Document {
  proposalId: string;
  title: string;
  description: string;
  creator: string;
  status: "active" | "passed" | "rejected";
  votingEnd: Date;
  totalCreditsSpent: number;
  totalQuadraticVotes: number;
  votes: Map<string, { credits: number; quadraticVotes: number; tier: number }>;
  createdAt: Date;
}

const QuadraticProposalSchema: Schema<IQuadraticProposal> = new Schema({
  proposalId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  creator: { type: String, required: true },
  status: { type: String, enum: ["active", "passed", "rejected"], default: "active" },
  votingEnd: { type: Date, required: true },
  totalCreditsSpent: { type: Number, default: 0 },
  totalQuadraticVotes: { type: Number, default: 0 },
  votes: { type: Map, of: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

export const QuadraticProposal: Model<IQuadraticProposal> =
  mongoose.models.QuadraticProposal ||
  mongoose.model<IQuadraticProposal>("QuadraticProposal", QuadraticProposalSchema);

export default QuadraticProposal;
