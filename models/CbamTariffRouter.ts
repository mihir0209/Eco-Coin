import mongoose, { Document, Schema } from "mongoose";

export interface ICbamTariffRouter extends Document {
  importId: string;
  importerAddress: string;
  goodsCategory: "STEEL" | "ALUMINUM" | "CEMENT" | "FERTILIZERS" | "HYDROGEN";
  embeddedEmissionsTCO2e: number;
  originCountryTaxPaidUsd: number;
  euBenchmarkPricePerTonUsd: number;
  netPayableCbamTariffUsd: number;
  status: "CALCULATED" | "PAID" | "EXEMPT";
}

const CbamTariffRouterSchema: Schema = new Schema(
  {
    importId: { type: String, required: true, unique: true, index: true },
    importerAddress: { type: String, required: true },
    goodsCategory: {
      type: String,
      enum: ["STEEL", "ALUMINUM", "CEMENT", "FERTILIZERS", "HYDROGEN"],
      required: true,
    },
    embeddedEmissionsTCO2e: { type: Number, required: true, min: 0 },
    originCountryTaxPaidUsd: { type: Number, required: true, min: 0 },
    euBenchmarkPricePerTonUsd: { type: Number, required: true, min: 0 },
    netPayableCbamTariffUsd: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["CALCULATED", "PAID", "EXEMPT"],
      default: "CALCULATED",
    },
  },
  { timestamps: true }
);

export default (mongoose.models.CbamTariffRouter as mongoose.Model<ICbamTariffRouter>) ||
  mongoose.model<ICbamTariffRouter>("CbamTariffRouter", CbamTariffRouterSchema);
