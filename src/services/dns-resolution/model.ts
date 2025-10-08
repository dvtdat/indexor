import mongoose, { Schema, Document, Model } from "mongoose";

export interface DnsResult {
  hostname: string;
  ipAddresses: string[];
  resolvedAt: Date;
  ttl?: number;
}

export interface DnsResultDocument extends DnsResult, Document {
  _id: mongoose.Types.ObjectId;
  expiresAt?: Date;
}

const dnsResultSchema = new Schema<DnsResultDocument>(
  {
    hostname: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ipAddresses: {
      type: [String],
      required: true,
    },
    resolvedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    ttl: {
      type: Number,
      required: false,
    },
    expiresAt: {
      type: Date,
      required: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

dnsResultSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const DnsResultModel: Model<DnsResultDocument> =
  mongoose.models.DnsResult ||
  mongoose.model<DnsResultDocument>("DnsResult", dnsResultSchema);
