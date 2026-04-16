import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: 'READER' | 'AUTHOR';
  trustScore?: number; // Only for authors
  totalPosts?: number; // Only for authors
  savedPosts: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional for Google OAuth users
  image: { type: String },
  role: { type: String, enum: ['READER', 'AUTHOR'], default: 'READER' },
  trustScore: { type: Number, default: 0 },
  totalPosts: { type: Number, default: 0 },
  savedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }]
}, { timestamps: true });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
