import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGreenBond extends Document {
  bondId: string;
  issuer: string;
  projectType: "solar" | "wind" | "hydro" | "geothermal";
  principalAmount: number;
  couponRateBps: number;
  totalEpochs: number;
  currentEpoch: number;
  couponsPaid: number;
  committedYieldKwh: number;
  actualYieldKwh: number;
  escrowCollateral: number;
  status: "active" | "matured" | "slashed";
  createdAt: Date;
}

const GreenBondSchema: Schema<IGreenBond> = new Schema({
  bondId: { type: String, required: true, unique: true, index: true },
  issuer: { type: String, required: true },
  projectType: {
    type: String,
    enum: ["solar", "wind", "hydro", "geothermal"],
    default: "solar",
  },
  principalAmount: { type: Number, required: true },
  couponRateBps: { type: Number, required: true }, // e.g. 500 = 5%
  totalEpochs: { type: Number, required: true },
  currentEpoch: { type: Number, default: 0 },
  couponsPaid: { type: Number, default: 0 },
  committedYieldKwh: { type: Number, required: true },
  actualYieldKwh: { type: Number, default: 0 },
  escrowCollateral: { type: Number, required: true },
  status: { type: String, enum: ["active", "matured", "slashed"], default: "active" },
  createdAt: { type: Date, default: Date.now },
});

export const GreenBond: Model<IGreenBond> =
  mongoose.models.GreenBond || mongoose.model<IGreenBond>("GreenBond", GreenBondSchema);

export default GreenBond;
