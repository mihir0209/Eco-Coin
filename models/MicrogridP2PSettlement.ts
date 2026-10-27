import mongoose, { Document, Schema } from "mongoose";

export interface IMicrogridP2PSettlement extends Document {
  settlementId: string;
  producerId: string;
  consumerId: string;
  energyKwh: number;
  ratePerKwh: number;
  totalCostUsd: number;
  gridLossFactor: number;
  netEnergyDelivered: number;
  status: "PENDING" | "SETTLED" | "DISPUTED";
}

const MicrogridP2PSettlementSchema: Schema = new Schema(
  {
    settlementId: { type: String, required: true, unique: true, index: true },
    producerId: { type: String, required: true },
    consumerId: { type: String, required: true },
    energyKwh: { type: Number, required: true, min: 0 },
    ratePerKwh: { type: Number, required: true, min: 0 },
    totalCostUsd: { type: Number, required: true, min: 0 },
    gridLossFactor: { type: Number, default: 0.05 },
    netEnergyDelivered: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PENDING", "SETTLED", "DISPUTED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

export default (mongoose.models.MicrogridP2PSettlement as mongoose.Model<IMicrogridP2PSettlement>) ||
  mongoose.model<IMicrogridP2PSettlement>("MicrogridP2PSettlement", MicrogridP2PSettlementSchema);
