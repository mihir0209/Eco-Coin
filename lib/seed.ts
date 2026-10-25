import User from '@/models/User';
import Device from '@/models/Device';
import Notification from '@/models/Notification';
import Transaction from '@/models/Transaction';
import Reward from '@/models/Reward';
import DeviceCode from '@/models/DeviceCode';

export async function seedDatabase(clearExisting = true): Promise<{
  userCount: number;
  deviceCount: number;
  rewardCount: number;
  notificationCount: number;
  transactionCount: number;
  deviceCodeCount: number;
}> {
  if (clearExisting) {
    await Promise.all([
      User.deleteMany({}),
      Device.deleteMany({}),
      Reward.deleteMany({}),
      Notification.deleteMany({}),
      Transaction.deleteMany({}),
      DeviceCode.deleteMany({}),
    ]);
  }

  // 1. Create primary demo user
  const user = await User.create({
    name: 'Mihir Patil',
    email: 'mihir.patil22@pccoepune.org',
    password: 'password123',
    avatar: '/placeholder.svg?height=32&width=32',
    totalEcoCoins: 1250,
    devicesOwned: 3,
    devicesRecycled: 7,
    co2Saved: 42,
  });

  // 2. Create sample devices for demo user
  const devices = await Device.insertMany([
    {
      userId: user._id,
      name: 'iPhone 12 Pro',
      type: 'smartphone',
      health: 23,
      eolPrediction: '2 months',
      ecoCoins: 150,
      status: 'critical',
      lastCheck: new Date(Date.now() - 2 * 60 * 60 * 1000),
      batteryHealth: 78,
      performanceScore: 65,
      isRecycled: false,
    },
    {
      userId: user._id,
      name: 'MacBook Air M1',
      type: 'laptop',
      health: 67,
      eolPrediction: '8 months',
      ecoCoins: 300,
      status: 'good',
      lastCheck: new Date(Date.now() - 24 * 60 * 60 * 1000),
      batteryHealth: 89,
      performanceScore: 85,
      isRecycled: false,
    },
    {
      userId: user._id,
      name: 'Dell Monitor 27"',
      type: 'monitor',
      health: 45,
      eolPrediction: '4 months',
      ecoCoins: 80,
      status: 'warning',
      lastCheck: new Date(Date.now() - 3 * 60 * 60 * 1000),
      batteryHealth: undefined,
      performanceScore: 72,
      isRecycled: false,
    },
  ]);

  // 3. Create notifications
  const notifications = await Notification.insertMany([
    {
      userId: user._id,
      deviceId: devices[0]._id,
      deviceName: devices[0].name,
      message: 'Device health critical - Ready for recycling',
      type: 'critical',
      ecoCoins: devices[0].ecoCoins,
      isRead: false,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      userId: user._id,
      deviceId: devices[2]._id,
      deviceName: devices[2].name,
      message: 'Performance degradation detected',
      type: 'warning',
      ecoCoins: devices[2].ecoCoins,
      isRead: false,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ]);

  // 4. Create rewards
  const rewards = await Reward.insertMany([
    {
      title: '10% Off New Device',
      description: 'Electronics store discount',
      costInCoins: 100,
      category: 'discount',
      isActive: true,
    },
    {
      title: 'Tree Planting',
      description: 'Plant a tree in your name',
      costInCoins: 50,
      category: 'environmental',
      isActive: true,
    },
    {
      title: 'Carbon Offset',
      description: 'Offset 1 ton of CO₂',
      costInCoins: 200,
      category: 'environmental',
      isActive: true,
    },
    {
      title: '20% Off Accessories',
      description: 'Discount on phone cases and accessories',
      costInCoins: 75,
      category: 'discount',
      isActive: true,
    },
    {
      title: 'Charity Donation',
      description: 'Donate to environmental causes',
      costInCoins: 150,
      category: 'donation',
      isActive: true,
    },
  ]);

  // 5. Create transaction history
  const transactions = await Transaction.insertMany([
    {
      userId: user._id,
      type: 'earn',
      amount: 180,
      description: 'Monthly recycling bonus',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      userId: user._id,
      type: 'earn',
      amount: 95,
      description: 'Recycled old tablet',
      timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    },
    {
      userId: user._id,
      type: 'redeem',
      amount: -50,
      description: 'Redeemed: Tree Planting',
      rewardId: rewards[1]._id,
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  ]);

  // 6. Create manufacturer device codes
  const deviceCodes = await DeviceCode.insertMany([
    {
      code: 'APIP1301-2500',
      deviceType: 'smartphone',
      brand: 'Apple',
      deviceModel: 'iPhone 13',
      ecoCoinsValue: 2500,
      specifications: {
        storage: '128GB',
        ram: '4GB',
        processor: 'A15 Bionic',
        screenSize: '6.1 inch',
        color: 'Midnight',
      },
      isRegistered: false,
    },
    {
      code: 'SAMGS231-1800',
      deviceType: 'smartphone',
      brand: 'Samsung',
      deviceModel: 'Galaxy S23',
      ecoCoinsValue: 1800,
      specifications: {
        storage: '256GB',
        ram: '8GB',
        processor: 'Snapdragon 8 Gen 2',
        screenSize: '6.1 inch',
        color: 'Phantom Black',
      },
      isRegistered: false,
    },
    {
      code: 'DELLXPS1-3500',
      deviceType: 'laptop',
      brand: 'Dell',
      deviceModel: 'XPS 13',
      ecoCoinsValue: 3500,
      specifications: {
        storage: '512GB SSD',
        ram: '16GB',
        processor: 'Intel i7-1165G7',
        screenSize: '13.4 inch',
        color: 'Platinum Silver',
      },
      isRegistered: false,
    },
    {
      code: 'HPENVYX3-3200',
      deviceType: 'laptop',
      brand: 'HP',
      deviceModel: 'Envy x360',
      ecoCoinsValue: 3200,
      specifications: {
        storage: '1TB SSD',
        ram: '16GB',
        processor: 'AMD Ryzen 7',
        screenSize: '15.6 inch',
        color: 'Natural Silver',
      },
      isRegistered: false,
    },
    {
      code: 'APIPAD91-2200',
      deviceType: 'tablet',
      brand: 'Apple',
      deviceModel: 'iPad (9th Gen)',
      ecoCoinsValue: 2200,
      specifications: {
        storage: '256GB',
        processor: 'A13 Bionic',
        screenSize: '10.2 inch',
        color: 'Space Gray',
      },
      isRegistered: false,
    },
    {
      code: 'SAMTABA8-1500',
      deviceType: 'tablet',
      brand: 'Samsung',
      deviceModel: 'Galaxy Tab A8',
      ecoCoinsValue: 1500,
      specifications: {
        storage: '128GB',
        ram: '4GB',
        screenSize: '10.5 inch',
        color: 'Gray',
      },
      isRegistered: false,
    },
    {
      code: 'APWATCH8-1200',
      deviceType: 'smartwatch',
      brand: 'Apple',
      deviceModel: 'Watch Series 8',
      ecoCoinsValue: 1200,
      specifications: {
        storage: '32GB',
        screenSize: '45mm',
        color: 'Midnight',
      },
      isRegistered: false,
    },
    {
      code: 'ASUSROG5-4000',
      deviceType: 'desktop',
      brand: 'ASUS',
      deviceModel: 'ROG Strix G15',
      ecoCoinsValue: 4000,
      specifications: {
        storage: '1TB SSD',
        ram: '32GB',
        processor: 'Intel i9-12900K',
        color: 'Black',
      },
      isRegistered: false,
    },
    {
      code: 'LGNVMON2-0800',
      deviceType: 'monitor',
      brand: 'LG',
      deviceModel: 'UltraWide 34"',
      ecoCoinsValue: 800,
      specifications: {
        screenSize: '34 inch',
        color: 'Black',
      },
      isRegistered: false,
    },
    {
      code: 'LENMTPX1-3000',
      deviceType: 'laptop',
      brand: 'Lenovo',
      deviceModel: 'ThinkPad X1 Carbon',
      ecoCoinsValue: 3000,
      specifications: {
        storage: '512GB SSD',
        ram: '16GB',
        processor: 'Intel i7-1165G7',
        screenSize: '14 inch',
        color: 'Black',
      },
      isRegistered: false,
    },
  ]);

  return {
    userCount: 1,
    deviceCount: devices.length,
    rewardCount: rewards.length,
    notificationCount: notifications.length,
    transactionCount: transactions.length,
    deviceCodeCount: deviceCodes.length,
  };
}

export async function autoSeedIfEmpty(): Promise<boolean> {
  const count = await User.countDocuments();
  if (count === 0) {
    console.log('🌱 Database is empty. Auto-seeding initial demo data...');
    await seedDatabase(false);
    console.log('✅ Auto-seed completed.');
    return true;
  }
  return false;
}
