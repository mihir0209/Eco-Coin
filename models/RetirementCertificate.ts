import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRetirementCertificate extends Document {
  certificateId: string;
  owner: string;
  beneficiary: string;
  tonsRetired: number;
  creditStandard: "VERRA" | "GOLD_STANDARD" | "CER";
  retirementReason: string;
  certificateHash: string;
  metadataUri: string;
  status: "minted" | "revoked";
  retiredAt: Date;
}

const RetirementCertificateSchema: Schema<IRetirementCertificate> = new Schema({
  certificateId: { type: String, required: true, unique: true, index: true },
  owner: { type: String, required: true },
  beneficiary: { type: String, required: true },
  tonsRetired: { type: Number, required: true },
  creditStandard: {
    type: String,
    enum: ["VERRA", "GOLD_STANDARD", "CER"],
    default: "VERRA",
  },
  retirementReason: { type: String, required: true },
  certificateHash: { type: String, required: true },
  metadataUri: { type: String, required: true },
  status: { type: String, enum: ["minted", "revoked"], default: "minted" },
  retiredAt: { type: Date, default: Date.now },
});

export const RetirementCertificate: Model<IRetirementCertificate> =
  mongoose.models.RetirementCertificate ||
  mongoose.model<IRetirementCertificate>("RetirementCertificate", RetirementCertificateSchema);

export default RetirementCertificate;
