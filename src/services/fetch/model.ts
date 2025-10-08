import mongoose, { Schema, Document, Model } from "mongoose";

export interface FetchResult {
  url: string;
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  contentType: string;
  responseTime: number;
  fetchedAt: Date;
}

export interface FetchResultDocument extends FetchResult, Document {
  _id: mongoose.Types.ObjectId;
  domain: string;
}

const fetchResultSchema = new Schema<FetchResultDocument>(
  {
    url: {
      type: String,
      required: true,
      index: true,
    },
    domain: {
      type: String,
      required: true,
      index: true,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    headers: {
      type: Map,
      of: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    contentType: {
      type: String,
      required: true,
    },
    responseTime: {
      type: Number,
      required: true,
    },
    fetchedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const FetchResultModel: Model<FetchResultDocument> =
  mongoose.models.FetchResult ||
  mongoose.model<FetchResultDocument>("FetchResult", fetchResultSchema);
