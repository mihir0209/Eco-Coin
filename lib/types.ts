// Type definitions for the application

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  totalEcoCoins: number;
  devicesOwned: number;
  devicesRecycled: number;
  co2Saved: number;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  _id: string;
  userId: string;
  name: string;
  type: 'smartphone' | 'laptop' | 'monitor' | 'tablet' | 'other';
  health: number;
  eolPrediction: string;
  ecoCoins: number;
  status: 'good' | 'warning' | 'critical';
  lastCheck: string;
  batteryHealth?: number;
  performanceScore: number;
  isRecycled: boolean;
  recycledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  message: string;
  type: 'critical' | 'warning' | 'info';
  ecoCoins: number;
  isRead: boolean;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  _id: string;
  userId: string;
  type: 'earn' | 'redeem' | 'recycle';
  amount: number;
  description: string;
  deviceId?: string;
  rewardId?: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reward {
  _id: string;
  title: string;
  description: string;
  costInCoins: number;
  category: 'discount' | 'environmental' | 'donation' | 'other';
  isActive: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  user: User;
  devices: Device[];
  recycledDevices: Device[];
  recentTransactions: Transaction[];
  earnings: {
    thisMonth: number;
    lastMonth: number;
    allTime: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
