import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOffsetCertificate extends Document {
  certificateId: string;
  userId: string;
  beneficiaryName: string;
  scope: "scope1" | "scope2" | "scope3";
  co2KgRetired: number;
  ecoCoinsBurned: number;
  verificationHash: string;
  retirementReason: string;
  status: "RETIRED" | "REVOKED";
  createdAt: Date;
  updatedAt: Date;
}

const OffsetCertificateSchema = new Schema<IOffsetCertificate>(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    beneficiaryName: {
      type: String,
      required: true,
    },
    scope: {
      type: String,
      enum: ["scope1", "scope2", "scope3"],
      default: "scope3",
      required: true,
    },
    co2KgRetired: {
      type: Number,
      required: true,
      min: [0.01, "Minimum retired CO2 must be at least 0.01 kg"],
    },
    ecoCoinsBurned: {
      type: Number,
      required: true,
      min: [0.001, "Burned Eco-Coins must be positive"],
    },
    verificationHash: {
      type: String,
      required: true,
      unique: true,
    },
    retirementReason: {
      type: String,
      default: "Voluntary Carbon Offset",
    },
    status: {
      type: String,
      enum: ["RETIRED", "REVOKED"],
      default: "RETIRED",
    },
  },
  {
    timestamps: true,
  }
);

OffsetCertificateSchema.index({ userId: 1, createdAt: -1 });

const OffsetCertificate: Model<IOffsetCertificate> =
  mongoose.models.OffsetCertificate ||
  mongoose.model<IOffsetCertificate>("OffsetCertificate", OffsetCertificateSchema);

export default OffsetCertificate;
