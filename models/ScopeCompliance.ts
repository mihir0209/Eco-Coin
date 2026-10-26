import mongoose, { Schema, Document, Model } from "mongoose";

export interface IScopeCompliance extends Document {
  reportId: string;
  enterpriseId: string;
  periodYear: number;
  scope1EmissionsKg: number; // direct combustion
  scope2EmissionsKg: number; // purchased electricity
  scope3EmissionsKg: number; // supply chain & travel
  grossEmissionsKg: number;
  retiredOffsetCreditsKg: number;
  netEmissionsKg: number;
  esgRating: "AAA" | "AA" | "A" | "B" | "C" | "NON_COMPLIANT";
  tamperSealSha256: string;
  issuedAt: Date;
}

const ScopeComplianceSchema: Schema<IScopeCompliance> = new Schema({
  reportId: { type: String, required: true, unique: true, index: true },
  enterpriseId: { type: String, required: true, index: true },
  periodYear: { type: Number, required: true },
  scope1EmissionsKg: { type: Number, required: true },
  scope2EmissionsKg: { type: Number, required: true },
  scope3EmissionsKg: { type: Number, required: true },
  grossEmissionsKg: { type: Number, required: true },
  retiredOffsetCreditsKg: { type: Number, default: 0 },
  netEmissionsKg: { type: Number, required: true },
  esgRating: { type: String, enum: ["AAA", "AA", "A", "B", "C", "NON_COMPLIANT"], required: true },
  tamperSealSha256: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
});

export const ScopeCompliance: Model<IScopeCompliance> =
  mongoose.models.ScopeCompliance ||
  mongoose.model<IScopeCompliance>("ScopeCompliance", ScopeComplianceSchema);

export default ScopeCompliance;
