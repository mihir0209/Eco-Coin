import mongoose, { Document, Schema } from "mongoose";

export interface IMarathonRecord extends Document {
  recordId: string;
  category: string;
  metricValue: number;
  carbonOffsetTCO2e: number;
  metadata: any;
  createdAt: Date;
}

const MarathonRecordSchema = new Schema(
  {
    recordId: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true },
    metricValue: { type: Number, required: true },
    carbonOffsetTCO2e: { type: Number, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default (mongoose.models.MarathonRecord as mongoose.Model<IMarathonRecord>) ||
  mongoose.model<IMarathonRecord>("MarathonRecord", MarathonRecordSchema);
