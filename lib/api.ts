// API helper functions for making requests to the backend

import type {
  User,
  Device,
  Notification,
  Transaction,
  Reward,
  DashboardData,
  ApiResponse,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://eco-coin-bice.vercel.app';

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'An error occurred');
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

// User API
export const userApi = {
  getById: (id: string) => fetchAPI<User>(`/api/users?id=${id}`),
  getByEmail: (email: string) => fetchAPI<User>(`/api/users?email=${email}`),
  getAll: () => fetchAPI<User[]>(`/api/users`),
  create: (userData: Partial<User>) =>
    fetchAPI<User>(`/api/users`, {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  update: (id: string, userData: Partial<User>) =>
    fetchAPI<User>(`/api/users`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...userData }),
    }),
  delete: (id: string) =>
    fetchAPI<{}>(`/api/users?id=${id}`, { method: 'DELETE' }),
};

// Device API
export const deviceApi = {
  getById: (id: string) => fetchAPI<Device>(`/api/devices?id=${id}`),
  getByUserId: (userId: string, isRecycled?: boolean) => {
    const query = isRecycled !== undefined ? `&isRecycled=${isRecycled}` : '';
    return fetchAPI<Device[]>(`/api/devices?userId=${userId}${query}`);
  },
  getAll: () => fetchAPI<Device[]>(`/api/devices`),
  create: (deviceData: Partial<Device>) =>
    fetchAPI<Device>(`/api/devices`, {
      method: 'POST',
      body: JSON.stringify(deviceData),
    }),
  update: (id: string, deviceData: Partial<Device>) =>
    fetchAPI<Device>(`/api/devices`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...deviceData }),
    }),
  delete: (id: string) =>
    fetchAPI<{}>(`/api/devices?id=${id}`, { method: 'DELETE' }),
  recycle: (deviceId: string, userId: string) =>
    fetchAPI<{ device: Device; coinsAwarded: number; newBalance: number; co2Saved: number }>(
      `/api/devices/recycle`,
      {
        method: 'POST',
        body: JSON.stringify({ deviceId, userId }),
      }
    ),
};

// Notification API
export const notificationApi = {
  getByUserId: (userId: string, isRead?: boolean) => {
    const query = isRead !== undefined ? `&isRead=${isRead}` : '';
    return fetchAPI<Notification[]>(`/api/notifications?userId=${userId}${query}`);
  },
  create: (notificationData: Partial<Notification>) =>
    fetchAPI<Notification>(`/api/notifications`, {
      method: 'POST',
      body: JSON.stringify(notificationData),
    }),
  markAsRead: (id: string) =>
    fetchAPI<Notification>(`/api/notifications`, {
      method: 'PUT',
      body: JSON.stringify({ id, isRead: true }),
    }),
  delete: (id: string) =>
    fetchAPI<{}>(`/api/notifications?id=${id}`, { method: 'DELETE' }),
};

// Transaction API
export const transactionApi = {
  getByUserId: (userId: string, type?: string) => {
    const query = type ? `&type=${type}` : '';
    return fetchAPI<Transaction[]>(`/api/transactions?userId=${userId}${query}`);
  },
  create: (transactionData: Partial<Transaction>) =>
    fetchAPI<Transaction>(`/api/transactions`, {
      method: 'POST',
      body: JSON.stringify(transactionData),
    }),
};

// Reward API
export const rewardApi = {
  getById: (id: string) => fetchAPI<Reward>(`/api/rewards?id=${id}`),
  getAll: (isActive?: boolean) => {
    const query = isActive !== undefined ? `?isActive=${isActive}` : '';
    return fetchAPI<Reward[]>(`/api/rewards${query}`);
  },
  create: (rewardData: Partial<Reward>) =>
    fetchAPI<Reward>(`/api/rewards`, {
      method: 'POST',
      body: JSON.stringify(rewardData),
    }),
  update: (id: string, rewardData: Partial<Reward>) =>
    fetchAPI<Reward>(`/api/rewards`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...rewardData }),
    }),
  delete: (id: string) =>
    fetchAPI<{}>(`/api/rewards?id=${id}`, { method: 'DELETE' }),
  redeem: (rewardId: string, userId: string) =>
    fetchAPI<{ reward: Reward; coinsDeducted: number; newBalance: number }>(
      `/api/rewards/redeem`,
      {
        method: 'POST',
        body: JSON.stringify({ rewardId, userId }),
      }
    ),
};

// Dashboard API
export const dashboardApi = {
  getData: (userId: string) =>
    fetchAPI<DashboardData>(`/api/dashboard?userId=${userId}`),
};
