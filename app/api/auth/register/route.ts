import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// POST /api/auth/register - Register a new user
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { name, email, password } = body;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create new user (storing password in plain text for simplicity - in production use bcrypt!)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password, // In production, hash this with bcrypt
      totalEcoCoins: 0,
      devicesOwned: 0,
      devicesRecycled: 0,
      co2Saved: 0,
    });

    // Return user without password
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      totalEcoCoins: user.totalEcoCoins,
      devicesOwned: user.devicesOwned,
      devicesRecycled: user.devicesRecycled,
      co2Saved: user.co2Saved,
    };

    return NextResponse.json(
      { 
        success: true, 
        data: userResponse,
        message: 'Account created successfully! Please login.' 
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
