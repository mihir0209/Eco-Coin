import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  avatar?: string;
  totalEcoCoins: number;
  devicesOwned: number;
  devicesRecycled: number;
  co2Saved: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    avatar: {
      type: String,
      default: '',
    },
    totalEcoCoins: {
      type: Number,
      default: 0,
      min: 0,
    },
    devicesOwned: {
      type: Number,
      default: 0,
      min: 0,
    },
    devicesRecycled: {
      type: Number,
      default: 0,
      min: 0,
    },
    co2Saved: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const User = models.User || model<IUser>('User', UserSchema);

export default User;
