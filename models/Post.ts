import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPost extends Document {
  authorId: mongoose.Types.ObjectId;
  headline: string;
  description: string;
  body?: string;
  sourceLink?: string;
  sourceHash?: string;
  originSource?: string;
  category?: string;
  mediaUrl?: string; // Legacy
  mediaType?: 'image' | 'video' | 'text'; // Legacy
  imageUrl?: string;
  videoUrl?: string;
  factScore: number;
  factSummary?: string;
  confidence?: string;
  sourcesChecked?: number;
  reasoning?: string;
  isPublished: boolean;
  engagement: number;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema<IPost> = new Schema({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  headline: { type: String, required: true },
  description: { type: String, required: true },
  body: { type: String },
  sourceLink: { type: String },
  sourceHash: { type: String, index: true },
  originSource: { type: String },
  category: { type: String, index: true },
  mediaUrl: { type: String },
  mediaType: { type: String, enum: ['image', 'video', 'text'], default: 'text' },
  imageUrl: { type: String },
  videoUrl: { type: String },
  factScore: { type: Number, required: true, default: 0 },
  factSummary: { type: String },
  confidence: { type: String },
  sourcesChecked: { type: Number, default: 0 },
  reasoning: { type: String },
  isPublished: { type: Boolean, default: false },
  engagement: { type: Number, default: 0 }
}, { timestamps: true });

export const Post: Model<IPost> = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);
