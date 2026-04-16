import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPost extends Document {
  authorId: mongoose.Types.ObjectId;
  headline: string;
  description: string;
  sourceLink?: string;
  originSource?: string;
  mediaUrl?: string;
  factScore: number;
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
  sourceLink: { type: String },
  originSource: { type: String },
  mediaUrl: { type: String },
  factScore: { type: Number, required: true, default: 0 },
  reasoning: { type: String },
  isPublished: { type: Boolean, default: false },
  engagement: { type: Number, default: 0 }
}, { timestamps: true });

export const Post: Model<IPost> = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);
