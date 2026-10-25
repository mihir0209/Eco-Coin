import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Device from '@/models/Device';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import Notification from '@/models/Notification';
import AuditLedger from '@/models/AuditLedger';
import {
  verifyDeviceSignature,
  extractDeviceCredentials,
} from '@/lib/device_auth';
import {
  recordAuditEntry,
  isNonceReplayed,
  verifyTimestamp,
  verifyLedgerIntegrity,
} from '@/lib/audit_ledger';

export interface SyncQueuedEvent {
  eventId?: string;
  type: 'telemetry' | 'health_check' | 'recycle' | 'status' | string;
  payload?: any;
  timestamp?: number | string | Date;
  nonce?: string;
  signature?: string;
}

// POST /api/sync - Batch sync queued offline events idempotently or process signed device submissions
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad Request: Invalid JSON body' },
        { status: 400 }
      );
    }

    const credentials = extractDeviceCredentials(request, body);
    const deviceId = credentials.deviceId;

    // 1. Authenticate Device credentials
    if (!deviceId) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing required deviceId' },
        { status: 401 }
      );
    }

    const device = await Device.findById(deviceId);
    if (!device) {
      return NextResponse.json(
        { error: `Unauthorized: Unknown device '${deviceId}'` },
        { status: 401 }
      );
    }

    const deviceSecret = device.secretKey;
    if (!deviceSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Device has no configured secret key' },
        { status: 401 }
      );
    }

    const requestTimestamp = credentials.timestamp;
    const requestNonce = credentials.nonce;
    const requestSignature = credentials.signature;

    // If request has no signature and events have no signatures, reject with 401
    const hasEventSignature = Array.isArray(body?.events) && body.events.some((e: any) => !!e.signature);
    if (!requestSignature && !hasEventSignature) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing device signature on request or events' },
        { status: 401 }
      );
    }

    // 2. Request-level Attestation & Anti-Replay
    if (requestSignature) {
      // 2a. Timestamp validation (±300s window)
      if (requestTimestamp !== undefined && requestTimestamp !== null) {
        const timeCheck = verifyTimestamp(requestTimestamp, 300);
        if (!timeCheck.valid) {
          return NextResponse.json(
            { error: `Bad Request: ${timeCheck.error}` },
            { status: 400 }
          );
        }
      }

      // 2b. Anti-replay check on request nonce
      if (requestNonce) {
        const isReplay = await isNonceReplayed(requestNonce);
        if (isReplay) {
          return NextResponse.json(
            { error: `Replay detected: Nonce '${requestNonce}' has already been processed in the audit ledger` },
            { status: 409 }
          );
        }
      }

      // 2c. Cryptographic HMAC-SHA256 signature verification
      const isValid = verifyDeviceSignature({
        payload: credentials.payload,
        timestamp: requestTimestamp || '',
        nonce: requestNonce || '',
        signature: requestSignature,
        secretKey: deviceSecret,
      });

      if (!isValid) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid HMAC-SHA256 signature' },
          { status: 401 }
        );
      }
    }

    // 3. Extract events list (support batch events array or single event payload)
    let eventsList: SyncQueuedEvent[] = [];
    if (Array.isArray(body?.events)) {
      eventsList = body.events;
    } else if (
      body?.payload !== undefined ||
      body?.type !== undefined ||
      body?.quantity !== undefined ||
      body?.health !== undefined
    ) {
      eventsList = [
        {
          type: body.type || body.eventType || 'telemetry',
          payload: body.payload !== undefined ? body.payload : { ...body },
          nonce: requestNonce,
          signature: requestSignature,
          timestamp: requestTimestamp,
        },
      ];
    } else {
      return NextResponse.json(
        { error: "Bad Request: 'events' array or valid payload is required" },
        { status: 400 }
      );
    }

    // 4. Process Events Idempotently
    const results: any[] = [];
    let processedCount = 0;
    let duplicateCount = 0;
    const seenNoncesInBatch = new Set<string>();

    for (let i = 0; i < eventsList.length; i++) {
      const event = eventsList[i];
      const eventNonce =
        event.nonce ||
        (event.eventId ? `evt_${event.eventId}` : `${requestNonce || 'sync'}_item_${i}`);

      // Verify event-level signature if present and distinct from validated request signature
      if (event.signature && event.signature !== requestSignature) {
        const isValid = verifyDeviceSignature({
          payload: event.payload,
          timestamp: event.timestamp || requestTimestamp || '',
          nonce: eventNonce,
          signature: event.signature,
          secretKey: deviceSecret,
        });

        if (!isValid) {
          results.push({
            eventId: event.eventId || `item_${i}`,
            nonce: eventNonce,
            type: event.type,
            status: 'unauthorized',
            error: 'Invalid event HMAC-SHA256 signature',
          });
          continue;
        }
      }

      // Check Anti-Replay: duplicate within current batch OR already in audit ledger
      const isDuplicate =
        seenNoncesInBatch.has(eventNonce) ||
        (await isNonceReplayed(eventNonce));

      if (isDuplicate) {
        duplicateCount++;
        results.push({
          eventId: event.eventId || `item_${i}`,
          nonce: eventNonce,
          type: event.type,
          status: 'already_processed',
          replayed: true,
        });
        continue;
      }

      seenNoncesInBatch.add(eventNonce);

      // Execute Business Logic Idempotently
      const payload = event.payload || {};

      if (event.type === 'telemetry' || event.type === 'health_check') {
        if (typeof payload.health === 'number') {
          device.health = Math.max(0, Math.min(100, payload.health));
          if (device.health < 25) {
            device.status = 'critical';
          } else if (device.health < 50) {
            device.status = 'warning';
          } else {
            device.status = 'good';
          }
        }
        if (typeof payload.batteryHealth === 'number') {
          device.batteryHealth = Math.max(0, Math.min(100, payload.batteryHealth));
        }
        if (typeof payload.performanceScore === 'number') {
          device.performanceScore = Math.max(0, Math.min(100, payload.performanceScore));
        }
        device.lastCheck = new Date();
        await device.save();
      } else if (event.type === 'recycle') {
        if (!device.isRecycled) {
          device.isRecycled = true;
          device.recycledAt = new Date();
          await device.save();

          const user = await User.findById(device.userId);
          if (user) {
            user.totalEcoCoins += device.ecoCoins;
            user.devicesRecycled += 1;
            user.co2Saved += 0.5;
            await user.save();

            await Transaction.create({
              userId: user._id,
              type: 'recycle',
              amount: device.ecoCoins,
              description: `Batch Synced: Recycled ${device.name}`,
              deviceId: device._id,
              timestamp: new Date(),
            });

            await Notification.updateMany(
              { deviceId: device._id, userId: user._id, isRead: false },
              { isRead: true }
            );
          }
        }
      } else {
        // Generic status update
        device.lastCheck = new Date();
        await device.save();
      }

      // Persist in Cryptographic Hash Chain Audit Ledger
      const auditResult = await recordAuditEntry({
        deviceId: device._id.toString(),
        nonce: eventNonce,
        timestamp: event.timestamp || requestTimestamp || new Date(),
        eventType: event.type || 'unknown',
        payload,
        signature: event.signature || requestSignature || 'batch_signed',
        enforceWindow: false, // Offline queued events may have historical timestamps
      });

      if (auditResult.success && auditResult.entry) {
        processedCount++;
        results.push({
          eventId: event.eventId || `item_${i}`,
          nonce: eventNonce,
          type: event.type,
          status: 'processed',
          sequence: auditResult.entry.sequence,
          hash: auditResult.entry.hash,
        });
      } else if (auditResult.replayed || auditResult.status === 409) {
        if (eventsList.length === 1) {
          return NextResponse.json(
            { error: auditResult.error || `Replay detected: Nonce '${eventNonce}' has already been processed in the audit ledger` },
            { status: 409 }
          );
        }
        duplicateCount++;
        results.push({
          eventId: event.eventId || `item_${i}`,
          nonce: eventNonce,
          type: event.type,
          status: 'already_processed',
          replayed: true,
        });
      } else {
        if (eventsList.length === 1) {
          return NextResponse.json(
            { error: auditResult.error || 'Failed to record audit entry' },
            { status: auditResult.status || 500 }
          );
        }
        results.push({
          eventId: event.eventId || `item_${i}`,
          nonce: eventNonce,
          type: event.type,
          status: 'error',
          error: auditResult.error,
        });
      }
    }

    return NextResponse.json({
      success: true,
      deviceId: device._id,
      processedCount,
      duplicateCount,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error during sync' },
      { status: 500 }
    );
  }
}

// GET /api/sync - Inspect device sync ledger & cryptographic chain integrity
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('deviceId');

    let query: any = {};
    if (deviceId) {
      query.deviceId = deviceId;
    }

    const entries = await AuditLedger.find(query)
      .sort({ sequence: -1 })
      .limit(50);

    const integrity = await verifyLedgerIntegrity();

    return NextResponse.json({
      success: true,
      ledgerIntegrity: integrity,
      count: entries.length,
      data: entries,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve sync ledger' },
      { status: 500 }
    );
  }
}
