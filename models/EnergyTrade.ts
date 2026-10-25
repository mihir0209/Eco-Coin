import mongoose, { Schema, Document } from "mongoose";

export interface IEnergyTrade extends Document {
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  buyOrderId: mongoose.Types.ObjectId;
  sellOrderId: mongoose.Types.ObjectId;
  unitsKwh: number;
  clearingPrice: number;
  totalEcoCoins: number;
  transmissionLossFee: number;
  createdAt: Date;
}

const EnergyTradeSchema: Schema = new Schema(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    buyOrderId: {
      type: Schema.Types.ObjectId,
      ref: "EnergyOrder",
      required: true,
    },
    sellOrderId: {
      type: Schema.Types.ObjectId,
      ref: "EnergyOrder",
      required: true,
    },
    unitsKwh: {
      type: Number,
      required: true,
    },
    clearingPrice: {
      type: Number,
      required: true,
    },
    totalEcoCoins: {
      type: Number,
      required: true,
    },
    transmissionLossFee: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.EnergyTrade ||
  mongoose.model<IEnergyTrade>("EnergyTrade", EnergyTradeSchema);
