import mongoose, { Document, Schema } from "mongoose";

export interface IVendorSplit {
  vendorId: string;
  vendorName: string;
  splitPercentage: number; // 0.0 to 100.0
  withholdingTaxRate: number; // statutory withholding rate (e.g., 0.15 for 15%)
  allocatedNetTokens?: number;
  withheldTaxTokens?: number;
}

export interface ICarbonTaxSplitter extends Document {
  agreementId: string;
  payerEntity: string;
  totalGrossTokens: number;
  cbamTaxRate: number; // Carbon Border Adjustment Mechanism tax rate
  totalTaxWithheld: number;
  totalNetDisbursed: number;
  vendorSplits: IVendorSplit[];
  status: "PENDING" | "EXECUTED" | "VOIDED";
  settlementNonce: string;
  executedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSplitSchema = new Schema(
  {
    vendorId: { type: String, required: true },
    vendorName: { type: String, required: true },
    splitPercentage: { type: Number, required: true, min: 0.01, max: 100.0 },
    withholdingTaxRate: { type: Number, required: true, min: 0.0, max: 1.0 },
    allocatedNetTokens: { type: Number },
    withheldTaxTokens: { type: Number },
  },
  { _id: false }
);

const CarbonTaxSplitterSchema: Schema = new Schema(
  {
    agreementId: { type: String, required: true, unique: true, index: true },
    payerEntity: { type: String, required: true },
    totalGrossTokens: { type: Number, required: true, min: 0.0001 },
    cbamTaxRate: { type: Number, required: true, min: 0.0, max: 1.0 },
    totalTaxWithheld: { type: Number, default: 0.0 },
    totalNetDisbursed: { type: Number, default: 0.0 },
    vendorSplits: { type: [VendorSplitSchema], required: true },
    status: {
      type: String,
      enum: ["PENDING", "EXECUTED", "VOIDED"],
      default: "PENDING",
      index: true,
    },
    settlementNonce: { type: String, required: true, unique: true, index: true },
    executedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.CarbonTaxSplitter ||
  mongoose.model<ICarbonTaxSplitter>("CarbonTaxSplitter", CarbonTaxSplitterSchema);
