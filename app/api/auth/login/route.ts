import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// POST /api/auth/login - Login user
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check password (in production, use bcrypt.compare)
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Return user data without password
    const userResponse = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      totalEcoCoins: user.totalEcoCoins,
      devicesOwned: user.devicesOwned,
      devicesRecycled: user.devicesRecycled,
      co2Saved: user.co2Saved,
    };

    return NextResponse.json({
      success: true,
      data: userResponse,
      message: 'Login successful!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
