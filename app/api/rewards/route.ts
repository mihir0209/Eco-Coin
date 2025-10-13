import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Reward from '@/models/Reward';

// GET /api/rewards - Get all active rewards
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive');
    const id = searchParams.get('id');

    if (id) {
      const reward = await Reward.findById(id);
      if (!reward) {
        return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: reward });
    }

    let query: any = {};
    if (isActive !== null) query.isActive = isActive === 'true';

    const rewards = await Reward.find(query).sort({ costInCoins: 1 });
    return NextResponse.json({ success: true, data: rewards });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/rewards - Create a new reward
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const reward = await Reward.create(body);

    return NextResponse.json({ success: true, data: reward }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// PUT /api/rewards - Update a reward
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Reward ID is required' }, { status: 400 });
    }

    const reward = await Reward.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: reward });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/rewards - Delete a reward
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Reward ID is required' }, { status: 400 });
    }

    const reward = await Reward.findByIdAndDelete(id);

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
