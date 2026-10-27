import mongoose, { Document, Schema } from "mongoose";

export interface IZkCarbonProvenance extends Document {
  proofId: string;
  batchRootHash: string;
  vintageYear: number;
  projectCountry: string;
  commitmentHash: string;
  isVerified: boolean;
}

const ZkCarbonProvenanceSchema: Schema = new Schema(
  {
    proofId: { type: String, required: true, unique: true, index: true },
    batchRootHash: { type: String, required: true },
    vintageYear: { type: Number, required: true },
    projectCountry: { type: String, required: true },
    commitmentHash: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default (mongoose.models.ZkCarbonProvenance as mongoose.Model<IZkCarbonProvenance>) ||
  mongoose.model<IZkCarbonProvenance>("ZkCarbonProvenance", ZkCarbonProvenanceSchema);
