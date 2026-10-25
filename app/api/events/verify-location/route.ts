import { NextRequest, NextResponse } from 'next/server';
import { verifyAndRecordLocationProof } from '@/lib/geofence';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deviceId, latitude, longitude, timestamp, zoneId, actionType, maxVelocityKmh } = body;

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing required field: deviceId' },
        { status: 400 }
      );
    }

    const result = await verifyAndRecordLocationProof({
      deviceId,
      latitude,
      longitude,
      timestamp: timestamp || Date.now(),
      zoneId,
      actionType,
      maxVelocityKmh,
    });

    if (!result.verified) {
      const status = result.code === 'TELEPORTATION_SPOOFING_DETECTED' ? 403 : 400;
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          distanceMeters: result.distanceMeters,
          velocityKmH: result.velocityKmH,
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      zoneName: result.zoneName,
      distanceMeters: result.distanceMeters,
      velocityKmH: result.velocityKmH,
      proofReceipt: result.proofReceipt,
    });
  } catch (error: any) {
    console.error('Location proof verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error during location verification' },
      { status: 500 }
    );
  }
}
