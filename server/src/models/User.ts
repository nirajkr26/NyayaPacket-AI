import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'citizen' | 'lawyer' | 'volunteer' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  barCouncilId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['citizen', 'lawyer', 'volunteer', 'admin'],
      default: 'citizen',
      required: true,
    },
    barCouncilId: {
      type: String,
      trim: true,
      default: undefined,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
    autoIndex: true,
  }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
