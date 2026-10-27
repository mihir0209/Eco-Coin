import mongoose, { Document, Schema } from "mongoose";

export interface IPqRetirementCertificate extends Document {
  certificateId: string;
  projectId: string;
  beneficiaryEntity: string;
  beneficiaryPublicKey: string;
  auditorPublicKey: string;
  tonnesRetired: number;
  classicalSignature: string;
  postQuantumSignature: string;
  hybridCommitmentHash: string;
  status: "PENDING" | "VERIFIED" | "REVOKED";
  retiredAt: Date;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PqRetirementCertificateSchema: Schema = new Schema(
  {
    certificateId: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    beneficiaryEntity: { type: String, required: true },
    beneficiaryPublicKey: { type: String, required: true },
    auditorPublicKey: { type: String, required: true },
    tonnesRetired: { type: Number, required: true, min: 0.001 },
    classicalSignature: { type: String, required: true },
    postQuantumSignature: { type: String, required: true },
    hybridCommitmentHash: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REVOKED"],
      default: "PENDING",
    },
    retiredAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.PqRetirementCertificate ||
  mongoose.model<IPqRetirementCertificate>("PqRetirementCertificate", PqRetirementCertificateSchema);
