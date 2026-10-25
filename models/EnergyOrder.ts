import mongoose, { Schema, Document } from "mongoose";

export interface IEnergyOrder extends Document {
  userId: mongoose.Types.ObjectId;
  side: "buy" | "sell";
  energyType: "solar" | "wind" | "hydro";
  unitsKwh: number;
  pricePerKwh: number;
  status: "open" | "partially_filled" | "filled" | "cancelled";
  filledKwh: number;
  remainingKwh: number;
  escrowCoinsLocked: number;
  createdAt: Date;
  updatedAt: Date;
}

const EnergyOrderSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    side: {
      type: String,
      enum: ["buy", "sell"],
      required: true,
      index: true,
    },
    energyType: {
      type: String,
      enum: ["solar", "wind", "hydro"],
      required: true,
    },
    unitsKwh: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerKwh: {
      type: Number,
      required: true,
      min: 0.01,
    },
    status: {
      type: String,
      enum: ["open", "partially_filled", "filled", "cancelled"],
      default: "open",
      index: true,
    },
    filledKwh: {
      type: Number,
      default: 0,
    },
    remainingKwh: {
      type: Number,
      required: true,
    },
    escrowCoinsLocked: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.EnergyOrder ||
  mongoose.model<IEnergyOrder>("EnergyOrder", EnergyOrderSchema);
