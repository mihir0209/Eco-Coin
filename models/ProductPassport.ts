import mongoose, { Schema, Document } from "mongoose";

export interface IPassportEvent {
  stage: "origin" | "manufacturing" | "distribution" | "refurbishing" | "recycled";
  location: string;
  actorId: string;
  metadataHash: string;
  timestamp: Date;
  leafHash: string;
}

export interface IProductPassport extends Document {
  passportId: string; // Unique Passport UUID / QR
  productName: string;
  category: "electronics" | "battery" | "textile" | "automotive";
  currentOwnerId: mongoose.Types.ObjectId;
  merkleRoot: string;
  events: IPassportEvent[];
  isRecycled: boolean;
  carbonFootprintKg: number;
  createdAt: Date;
  updatedAt: Date;
}

const PassportEventSchema: Schema = new Schema({
  stage: {
    type: String,
    enum: ["origin", "manufacturing", "distribution", "refurbishing", "recycled"],
    required: true,
  },
  location: { type: String, required: true },
  actorId: { type: String, required: true },
  metadataHash: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  leafHash: { type: String, required: true },
});

const ProductPassportSchema: Schema = new Schema(
  {
    passportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["electronics", "battery", "textile", "automotive"],
      required: true,
    },
    currentOwnerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    merkleRoot: {
      type: String,
      required: true,
    },
    events: [PassportEventSchema],
    isRecycled: {
      type: Boolean,
      default: false,
    },
    carbonFootprintKg: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ProductPassport ||
  mongoose.model<IProductPassport>("ProductPassport", ProductPassportSchema);
