import mongoose, { Document, Schema } from "mongoose";

export interface IOracleSignature {
  oracleId: string;
  signature: string;
  timestamp: number;
}

export interface ISatelliteMrvAttestation extends Document {
  attestationId: string;
  projectId: string;
  polygon: [number, number][]; // Array of [latitude, longitude]
  spectralBands: {
    nir: number; // Near-Infrared
    red: number; // Red
    swir?: number; // Short-Wave Infrared
  };
  ndviScore: number; // Normalized Difference Vegetation Index: [-1.0, 1.0]
  baselineNdvi: number;
  deltaNdvi: number;
  satelliteProvider: "SENTINEL_2" | "LANDSAT_9" | "PLANET_SCOPE";
  oracleSignatures: IOracleSignature[];
  status: "VERIFIED" | "ALERT_DEFORESTATION" | "SUSPENDED" | "REJECTED";
  penaltyTCO2e: number;
  verifiedAt: Date;
}

const OracleSignatureSchema = new Schema(
  {
    oracleId: { type: String, required: true },
    signature: { type: String, required: true },
    timestamp: { type: Number, required: true },
  },
  { _id: false }
);

const SatelliteMrvAttestationSchema: Schema = new Schema(
  {
    attestationId: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    polygon: { type: [[Number]], required: true },
    spectralBands: {
      nir: { type: Number, required: true, min: 0 },
      red: { type: Number, required: true, min: 0 },
      swir: { type: Number, min: 0 },
    },
    ndviScore: { type: Number, required: true, min: -1.0, max: 1.0 },
    baselineNdvi: { type: Number, required: true, min: -1.0, max: 1.0 },
    deltaNdvi: { type: Number, required: true },
    satelliteProvider: {
      type: String,
      enum: ["SENTINEL_2", "LANDSAT_9", "PLANET_SCOPE"],
      required: true,
    },
    oracleSignatures: { type: [OracleSignatureSchema], required: true },
    status: {
      type: String,
      enum: ["VERIFIED", "ALERT_DEFORESTATION", "SUSPENDED", "REJECTED"],
      default: "VERIFIED",
    },
    penaltyTCO2e: { type: Number, default: 0, min: 0 },
    verifiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default (mongoose.models.SatelliteMrvAttestation as mongoose.Model<ISatelliteMrvAttestation>) ||
  mongoose.model<ISatelliteMrvAttestation>("SatelliteMrvAttestation", SatelliteMrvAttestationSchema);
