/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ParsedContent {
  url: string;
  title?: string;
  description?: string;
  links: string[];
  images: string[];
  text: string;
  parsedAt: Date;
}

export interface ParsedContentDocument extends ParsedContent, Document {
  _id: mongoose.Types.ObjectId;
}

const parsedContentSchema = new Schema<ParsedContentDocument>(
  {
    url: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    title: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
    links: {
      type: [String],
      required: true,
      default: [],
    },
    images: {
      type: [String],
      required: true,
      default: [],
    },
    text: {
      type: String,
      required: true,
    },
    parsedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const ParsedContentModel: Model<ParsedContentDocument> =
  mongoose.models.ParsedContent ||
  mongoose.model<ParsedContentDocument>("ParsedContent", parsedContentSchema);
