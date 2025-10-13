import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Device from '@/models/Device';
import User from '@/models/User';

// GET /api/devices - Get all devices or filter by userId
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const id = searchParams.get('id');
    const isRecycled = searchParams.get('isRecycled');

    if (id) {
      const device = await Device.findById(id);
      if (!device) {
        return NextResponse.json({ error: 'Device not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: device });
    }

    let query: any = {};
    if (userId) query.userId = userId;
    if (isRecycled !== null) query.isRecycled = isRecycled === 'true';

    const devices = await Device.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: devices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/devices - Create a new device
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    
    // Validate userId exists
    const user = await User.findById(body.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const device = await Device.create(body);

    // Update user's device count
    await User.findByIdAndUpdate(body.userId, {
      $inc: { devicesOwned: 1 },
    });

    return NextResponse.json({ success: true, data: device }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// PUT /api/devices - Update a device
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    const device = await Device.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: device });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/devices - Delete a device
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    const device = await Device.findById(id);
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    await Device.findByIdAndDelete(id);

    // Update user's device count
    await User.findByIdAndUpdate(device.userId, {
      $inc: { devicesOwned: -1 },
    });

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
