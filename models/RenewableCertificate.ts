import mongoose, { Schema, Document, Model } from "mongoose";

export type EnergySourceType = "SOLAR" | "WIND" | "HYDRO" | "GEOTHERMAL";

export interface IRenewableCertificate extends Document {
  recId: string;
  generatorId: string;
  gridRegion: string;
  energySource: EnergySourceType;
  megawattHours: number;
  meterMerkleRoot: string;
  vintageYear: number;
  ownerId: string;
  status: "ACTIVE" | "LISTED" | "RETIRED" | "SLASHED";
  generatorSignature: string;
  mintedAt: Date;
  retiredAt?: Date;
  retirementBeneficiary?: string;
}

const RenewableCertificateSchema: Schema<IRenewableCertificate> = new Schema({
  recId: { type: String, required: true, unique: true, index: true },
  generatorId: { type: String, required: true, index: true },
  gridRegion: { type: String, required: true, index: true },
  energySource: {
    type: String,
    enum: ["SOLAR", "WIND", "HYDRO", "GEOTHERMAL"],
    required: true,
  },
  megawattHours: { type: Number, required: true, min: 0.1 },
  meterMerkleRoot: { type: String, required: true },
  vintageYear: { type: Number, required: true },
  ownerId: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ["ACTIVE", "LISTED", "RETIRED", "SLASHED"],
    default: "ACTIVE",
  },
  generatorSignature: { type: String, required: true },
  mintedAt: { type: Date, default: Date.now },
  retiredAt: { type: Date },
  retirementBeneficiary: { type: String },
});

export const RenewableCertificate: Model<IRenewableCertificate> =
  mongoose.models.RenewableCertificate ||
  mongoose.model<IRenewableCertificate>("RenewableCertificate", RenewableCertificateSchema);

export default RenewableCertificate;
