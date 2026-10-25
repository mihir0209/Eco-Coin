import mongoose, { Document, Model, Schema } from "mongoose";

export interface IVaultTranche {
  trancheNumber: number;
  releasePercentage: number;
  amountEcoCoins: number;
  milestoneDescription: string;
  oracleAttestationHash?: string;
  released: boolean;
  releasedAt?: Date;
}

export interface IVaultInvestor {
  investorId: string;
  amount: number;
  investedAt: Date;
}

export interface IEcoVault extends Document {
  vaultId: string;
  creatorId: string;
  projectName: string;
  targetFundingEcoCoins: number;
  fundedEcoCoins: number;
  yieldRateApy: number;
  status: "FUNDING" | "ACTIVE" | "COMPLETED" | "DEFAULTED";
  tranches: IVaultTranche[];
  investors: IVaultInvestor[];
  createdAt: Date;
  updatedAt: Date;
}

const VaultTrancheSchema = new Schema<IVaultTranche>(
  {
    trancheNumber: { type: Number, required: true },
    releasePercentage: { type: Number, required: true, min: 1, max: 100 },
    amountEcoCoins: { type: Number, required: true, min: 0.1 },
    milestoneDescription: { type: String, required: true },
    oracleAttestationHash: { type: String },
    released: { type: Boolean, default: false },
    releasedAt: { type: Date },
  },
  { _id: false }
);

const VaultInvestorSchema = new Schema<IVaultInvestor>(
  {
    investorId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    investedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const EcoVaultSchema = new Schema<IEcoVault>(
  {
    vaultId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    creatorId: {
      type: String,
      required: true,
      index: true,
    },
    projectName: {
      type: String,
      required: true,
    },
    targetFundingEcoCoins: {
      type: Number,
      required: true,
      min: 1,
    },
    fundedEcoCoins: {
      type: Number,
      default: 0,
      min: 0,
    },
    yieldRateApy: {
      type: Number,
      required: true,
      min: 0.1,
      max: 50,
    },
    status: {
      type: String,
      enum: ["FUNDING", "ACTIVE", "COMPLETED", "DEFAULTED"],
      default: "FUNDING",
    },
    tranches: {
      type: [VaultTrancheSchema],
      required: true,
    },
    investors: {
      type: [VaultInvestorSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

EcoVaultSchema.index({ creatorId: 1, status: 1 });

const EcoVault: Model<IEcoVault> =
  mongoose.models.EcoVault ||
  mongoose.model<IEcoVault>("EcoVault", EcoVaultSchema);

export default EcoVault;
