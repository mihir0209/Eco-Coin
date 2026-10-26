import mongoose, { Schema, Document, Model } from "mongoose";

export interface IZkEmissionsProof extends Document {
  proofId: string;
  corporateEntityId: string;
  auditYear: number;
  emissionsCapMt: number;
  pedersenCommitment: string;
  proofSignature: string;
  nullifierHash: string;
  verified: boolean;
  verifiedAt: Date;
}

const ZkEmissionsProofSchema: Schema<IZkEmissionsProof> = new Schema({
  proofId: { type: String, required: true, unique: true, index: true },
  corporateEntityId: { type: String, required: true, index: true },
  auditYear: { type: Number, required: true },
  emissionsCapMt: { type: Number, required: true, min: 0 },
  pedersenCommitment: { type: String, required: true },
  proofSignature: { type: String, required: true },
  nullifierHash: { type: String, required: true, unique: true, index: true },
  verified: { type: Boolean, default: false },
  verifiedAt: { type: Date, default: Date.now },
});

export const ZkEmissionsProof: Model<IZkEmissionsProof> =
  mongoose.models.ZkEmissionsProof ||
  mongoose.model<IZkEmissionsProof>("ZkEmissionsProof", ZkEmissionsProofSchema);

export default ZkEmissionsProof;
