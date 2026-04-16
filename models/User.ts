import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: 'READER' | 'AUTHOR';
  isVerifiedAuthor: boolean;
  trustScore?: number;
  totalPosts?: number;
  preferences: string[];
  likedPosts: mongoose.Types.ObjectId[];
  viewedPosts: mongoose.Types.ObjectId[];
  savedPosts: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  image: { type: String },
  role: { type: String, enum: ['READER', 'AUTHOR'], default: 'READER' },
  isVerifiedAuthor: { type: Boolean, default: false },
  trustScore: { type: Number, default: 0 },
  totalPosts: { type: Number, default: 0 },
  preferences: [{ type: String }],
  likedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
  viewedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
  savedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }]
}, { timestamps: true });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
