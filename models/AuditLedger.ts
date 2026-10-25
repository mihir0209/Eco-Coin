import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IAuditLedger extends Document {
  _id: string;
  sequence: number;
  deviceId: string;
  nonce: string;
  timestamp: Date;
  eventType: string;
  payload: any;
  signature: string;
  previousHash: string;
  hash: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLedgerSchema = new Schema<IAuditLedger>(
  {
    sequence: {
      type: Number,
      required: true,
      unique: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    nonce: {
      type: String,
      required: true,
      unique: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    signature: {
      type: String,
      required: true,
    },
    previousHash: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying device audit logs by timestamp
AuditLedgerSchema.index({ deviceId: 1, timestamp: -1 });

const AuditLedger =
  models.AuditLedger || model<IAuditLedger>('AuditLedger', AuditLedgerSchema);

export default AuditLedger;
