import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface INotification extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  deviceId: mongoose.Types.ObjectId;
  deviceName: string;
  message: string;
  type: 'critical' | 'warning' | 'info';
  ecoCoins: number;
  isRead: boolean;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
    },
    deviceName: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['critical', 'warning', 'info'],
      default: 'info',
    },
    ecoCoins: {
      type: Number,
      default: 0,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ timestamp: -1 });

const Notification = models.Notification || model<INotification>('Notification', NotificationSchema);

export default Notification;
