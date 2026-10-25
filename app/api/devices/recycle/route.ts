import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Device from '@/models/Device';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import Notification from '@/models/Notification';

// POST /api/devices/recycle - Recycle a device and award eco-coins
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { deviceId, userId } = body;

    if (!deviceId || !userId) {
      return NextResponse.json(
        { error: 'Device ID and User ID are required' },
        { status: 400 }
      );
    }

    // Find the device
    const device = await Device.findById(deviceId);
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    if (device.isRecycled) {
      return NextResponse.json(
        { error: 'Device has already been recycled' },
        { status: 400 }
      );
    }

    // Update device as recycled
    device.isRecycled = true;
    device.recycledAt = new Date();
    await device.save();

    // Award eco-coins to user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.totalEcoCoins += device.ecoCoins;
    user.devicesRecycled += 1;
    
    // Calculate CO2 saved (example: 0.5kg per device)
    const co2Saved = 0.5;
    user.co2Saved += co2Saved;
    
    await user.save();

    // Create transaction record
    await Transaction.create({
      userId,
      type: 'recycle',
      amount: device.ecoCoins,
      description: `Recycled ${device.name}`,
      deviceId,
      timestamp: new Date(),
    });

    // Mark notification as read if exists
    await Notification.updateMany(
      { deviceId, userId, isRead: false },
      { isRead: true }
    );

    return NextResponse.json({
      success: true,
      data: {
        device,
        coinsAwarded: device.ecoCoins,
        newBalance: user.totalEcoCoins,
        co2Saved,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
