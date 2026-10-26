import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUpstreamLink {
  supplierNodeId: string;
  allocationPercentage: number; // 0 to 100
  reportedEmissionsMt: number;
}

export interface ITierNEmissionNode extends Document {
  nodeId: string;
  entityName: string;
  tierLevel: number; // 0 = OEM, 1 = Tier 1, 2 = Tier 2, etc.
  upstreamSuppliers: IUpstreamLink[];
  directEmissionsMt: number;
  cumulativeScope3Mt: number;
  tamperProofHash: string;
  createdAt: Date;
}

const TierNEmissionNodeSchema: Schema<ITierNEmissionNode> = new Schema({
  nodeId: { type: String, required: true, unique: true, index: true },
  entityName: { type: String, required: true },
  tierLevel: { type: Number, required: true, min: 0 },
  upstreamSuppliers: [
    {
      supplierNodeId: { type: String, required: true },
      allocationPercentage: { type: Number, required: true, min: 0, max: 100 },
      reportedEmissionsMt: { type: Number, required: true, min: 0 },
    },
  ],
  directEmissionsMt: { type: Number, required: true, min: 0 },
  cumulativeScope3Mt: { type: Number, default: 0 },
  tamperProofHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const TierNEmissionNode: Model<ITierNEmissionNode> =
  mongoose.models.TierNEmissionNode ||
  mongoose.model<ITierNEmissionNode>("TierNEmissionNode", TierNEmissionNodeSchema);

export default TierNEmissionNode;
