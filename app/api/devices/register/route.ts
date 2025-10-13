import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DeviceCode from '@/models/DeviceCode';
import Device from '@/models/Device';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { code, userId } = await req.json();

    // Validate input
    if (!code || !userId) {
      return NextResponse.json(
        { error: 'Code and userId are required' },
        { status: 400 }
      );
    }

    // Validate code format (8 alphanumeric chars + hyphen + 4 digits)
    const codeRegex = /^[A-Z0-9]{8}-[0-9]{4}$/;
    if (!codeRegex.test(code.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid code format. Expected format: ABCD1234-2500' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find the device code
    const deviceCode = await DeviceCode.findOne({ code: code.toUpperCase() });
    
    if (!deviceCode) {
      return NextResponse.json(
        { error: 'Invalid device code. This code does not exist in our system.' },
        { status: 404 }
      );
    }

    // Check if device code is already registered
    if (deviceCode.isRegistered) {
      return NextResponse.json(
        { error: 'This device code has already been registered.' },
        { status: 400 }
      );
    }

    // Create the device
    const newDevice = await Device.create({
      userId: new mongoose.Types.ObjectId(userId),
      name: `${deviceCode.brand} ${deviceCode.deviceModel}`,
      type: deviceCode.deviceType,
      health: 100, // New device starts with 100% health
      eolPrediction: '36+ months', // New device has long life expectancy
      ecoCoins: deviceCode.ecoCoinsValue,
      status: 'good',
      lastCheck: new Date(),
      batteryHealth: deviceCode.deviceType !== 'monitor' && deviceCode.deviceType !== 'desktop' ? 100 : null,
      performanceScore: 100,
      isRecycled: false,
    });

    // Mark device code as registered
    deviceCode.isRegistered = true;
    deviceCode.registeredBy = new mongoose.Types.ObjectId(userId);
    deviceCode.registeredAt = new Date();
    await deviceCode.save();

    // Award eco coins to user immediately upon registration
    user.totalEcoCoins += deviceCode.ecoCoinsValue;
    user.devicesOwned += 1;
    await user.save();

    // Create transaction record
    await Transaction.create({
      userId: new mongoose.Types.ObjectId(userId),
      type: 'earn',
      amount: deviceCode.ecoCoinsValue,
      description: `Registered new device: ${deviceCode.brand} ${deviceCode.deviceModel}`,
      deviceId: newDevice._id,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully registered ${deviceCode.brand} ${deviceCode.deviceModel}!`,
      device: {
        _id: newDevice._id,
        name: newDevice.name,
        type: newDevice.type,
        health: newDevice.health,
        ecoCoins: newDevice.ecoCoins,
        status: newDevice.status,
      },
      ecoCoinsEarned: deviceCode.ecoCoinsValue,
      newBalance: user.totalEcoCoins,
      deviceInfo: {
        brand: deviceCode.brand,
        model: deviceCode.deviceModel,
        type: deviceCode.deviceType,
        specifications: deviceCode.specifications,
      },
    });
  } catch (error) {
    console.error('Error registering device:', error);
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    );
  }
}
