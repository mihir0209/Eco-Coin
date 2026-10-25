import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICarbonTaxAudit extends Document {
  userId: string;
  organizationName: string;
  reportingYear: number;
  jurisdiction: "EU_ETS" | "CALIFORNIA_CAT" | "UK_ETS" | "SINGAPORE_CARBON_TAX" | "GLOBAL_VOLUNTARY";
  grossScope1Kg: number;
  grossScope2Kg: number;
  grossScope3Kg: number;
  totalGrossCo2Kg: number;
  totalOffsetsAppliedKg: number;
  netTaxableCo2Kg: number;
  carbonPricePerTonUsd: number;
  estimatedTaxLiabilityUsd: number;
  complianceStatus: "COMPLIANT" | "SURPLUS" | "DEFICIT";
  auditHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const CarbonTaxAuditSchema = new Schema<ICarbonTaxAudit>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    organizationName: {
      type: String,
      required: true,
    },
    reportingYear: {
      type: Number,
      required: true,
    },
    jurisdiction: {
      type: String,
      enum: ["EU_ETS", "CALIFORNIA_CAT", "UK_ETS", "SINGAPORE_CARBON_TAX", "GLOBAL_VOLUNTARY"],
      default: "GLOBAL_VOLUNTARY",
      required: true,
    },
    grossScope1Kg: {
      type: Number,
      required: true,
      min: 0,
    },
    grossScope2Kg: {
      type: Number,
      required: true,
      min: 0,
    },
    grossScope3Kg: {
      type: Number,
      required: true,
      min: 0,
    },
    totalGrossCo2Kg: {
      type: Number,
      required: true,
      min: 0,
    },
    totalOffsetsAppliedKg: {
      type: Number,
      required: true,
      min: 0,
    },
    netTaxableCo2Kg: {
      type: Number,
      required: true,
      min: 0,
    },
    carbonPricePerTonUsd: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedTaxLiabilityUsd: {
      type: Number,
      required: true,
      min: 0,
    },
    complianceStatus: {
      type: String,
      enum: ["COMPLIANT", "SURPLUS", "DEFICIT"],
      required: true,
    },
    auditHash: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

CarbonTaxAuditSchema.index({ userId: 1, reportingYear: -1 });

const CarbonTaxAudit: Model<ICarbonTaxAudit> =
  mongoose.models.CarbonTaxAudit ||
  mongoose.model<ICarbonTaxAudit>("CarbonTaxAudit", CarbonTaxAuditSchema);

export default CarbonTaxAudit;
