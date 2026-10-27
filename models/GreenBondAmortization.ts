import mongoose, { Document, Schema } from "mongoose";

export interface IGreenBondAmortization extends Document {
  bondId: string;
  principalAmount: number;
  annualCouponRatePct: number;
  tenorYears: number;
  couponsPerYear: number;
  totalCoupons: number;
  paidCoupons: number;
  status: "ACTIVE" | "MATURED" | "DEFAULTED";
}

const GreenBondAmortizationSchema: Schema = new Schema(
  {
    bondId: { type: String, required: true, unique: true, index: true },
    principalAmount: { type: Number, required: true, min: 1 },
    annualCouponRatePct: { type: Number, required: true, min: 0 },
    tenorYears: { type: Number, required: true, min: 1 },
    couponsPerYear: { type: Number, default: 2 },
    totalCoupons: { type: Number, required: true },
    paidCoupons: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["ACTIVE", "MATURED", "DEFAULTED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

export default (mongoose.models.GreenBondAmortization as mongoose.Model<IGreenBondAmortization>) ||
  mongoose.model<IGreenBondAmortization>("GreenBondAmortization", GreenBondAmortizationSchema);
