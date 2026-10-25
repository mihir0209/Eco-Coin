import { NextRequest, NextResponse } from 'next/server';
import { EnergyOracleEngine } from '@/lib/energy_oracle';
import connectDB from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const telemetry = await EnergyOracleEngine.submitTelemetry(body);
    return NextResponse.json({ success: true, telemetry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Telemetry submission failed' }, { status: 400 });
  }
}
