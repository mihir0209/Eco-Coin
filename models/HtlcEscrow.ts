import mongoose, { Document, Schema } from "mongoose";

export interface IHtlcEscrow extends Document {
  escrowId: string;
  sender: string;
  recipient: string;
  amount: number;
  hashLock: string;
  timeLock: Date;
  state: "ACTIVE" | "CLAIMED" | "REFUNDED";
  preimage?: string;
  claimedAt?: Date;
  refundedAt?: Date;
  chain: string;
  counterpartyChain: string;
  createdAt: Date;
  updatedAt: Date;
}

const HtlcEscrowSchema: Schema = new Schema(
  {
    escrowId: { type: String, required: true, unique: true, index: true },
    sender: { type: String, required: true, index: true },
    recipient: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0.0001 },
    hashLock: { type: String, required: true, index: true },
    timeLock: { type: Date, required: true, index: true },
    state: {
      type: String,
      enum: ["ACTIVE", "CLAIMED", "REFUNDED"],
      default: "ACTIVE",
      index: true,
    },
    preimage: { type: String },
    claimedAt: { type: Date },
    refundedAt: { type: Date },
    chain: { type: String, required: true, default: "ECOCOIN-MAINNET" },
    counterpartyChain: { type: String, required: true, default: "ETH-CARBON" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.HtlcEscrow ||
  mongoose.model<IHtlcEscrow>("HtlcEscrow", HtlcEscrowSchema);
