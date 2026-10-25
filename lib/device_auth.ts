import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Device from '@/models/Device';
import { NextRequest } from 'next/server';

/**
 * Generate a cryptographically secure 256-bit secret key in hex format.
 */
export function generateDeviceSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Deterministically serializes a payload by recursively sorting keys.
 * Ensures identical cryptographic hashes across different platforms/runtimes.
 */
export function canonicalizePayload(payload: any): string {
  if (payload === null || payload === undefined) {
    return '';
  }
  if (typeof payload === 'string') {
    return payload;
  }
  if (typeof payload !== 'object') {
    return String(payload);
  }

  const sortKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(sortKeys);
    }
    const sorted: Record<string, any> = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = sortKeys(obj[key]);
      });
    return sorted;
  };

  return JSON.stringify(sortKeys(payload));
}

/**
 * Creates the canonical signing message string: (payload + timestamp + nonce)
 */
export function createSigningString(
  payload: any,
  timestamp: string | number | Date,
  nonce: string
): string {
  const tsStr =
    timestamp instanceof Date
      ? String(timestamp.getTime())
      : String(timestamp);
  const canonical = canonicalizePayload(payload);
  return `${canonical}:${tsStr}:${nonce}`;
}

/**
 * Computes an HMAC-SHA256 signature for (payload + timestamp + nonce) using device's secret key.
 */
export function signPayload(
  payload: any,
  timestamp: string | number | Date,
  nonce: string,
  secretKey: string
): string {
  if (!secretKey) {
    throw new Error('Device secretKey is required for signing');
  }
  const message = createSigningString(payload, timestamp, nonce);
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
}

/**
 * Constant-time signature verification preventing timing attack vulnerabilities.
 */
export function verifyDeviceSignature({
  payload,
  timestamp,
  nonce,
  signature,
  secretKey,
}: {
  payload: any;
  timestamp: string | number | Date;
  nonce: string;
  signature: string;
  secretKey: string;
}): boolean {
  if (!signature || !secretKey || !nonce || timestamp === undefined || timestamp === null) {
    return false;
  }

  try {
    const expected = signPayload(payload, timestamp, nonce, secretKey);
    const sigBuf = Buffer.from(signature.trim().toLowerCase(), 'hex');
    const expBuf = Buffer.from(expected.toLowerCase(), 'hex');

    if (sigBuf.length !== expBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

export interface AttestationCredentials {
  deviceId: string;
  payload: any;
  timestamp: string | number | Date;
  nonce: string;
  signature: string;
}

/**
 * Authenticates an inbound device submission.
 * Verifies that:
 * 1. Required attestation fields (deviceId, timestamp, nonce, signature) are present.
 * 2. Device exists and has an authorized secret key.
 * 3. HMAC-SHA256 signature matches expected digest.
 *
 * Rejects unauthorized submissions with 401 status.
 */
export async function authenticateDeviceSubmission(
  credentials: Partial<AttestationCredentials>,
  options?: { secretKey?: string }
): Promise<{
  authorized: boolean;
  status: number;
  error?: string;
  device?: any;
}> {
  const { deviceId, payload, timestamp, nonce, signature } = credentials;

  if (!deviceId || !signature || !nonce || timestamp === undefined || timestamp === null) {
    return {
      authorized: false,
      status: 401,
      error: 'Unauthorized: Missing required attestation headers/parameters (deviceId, timestamp, nonce, signature)',
    };
  }

  let secretKey = options?.secretKey;
  let device: any = null;

  if (!secretKey) {
    await connectDB();
    device = await Device.findById(deviceId);
    if (!device) {
      return {
        authorized: false,
        status: 401,
        error: `Unauthorized: Unknown or unverified device ID '${deviceId}'`,
      };
    }
    secretKey = device.secretKey;
  }

  if (!secretKey) {
    return {
      authorized: false,
      status: 401,
      error: 'Unauthorized: Device has no configured cryptographic secret key',
    };
  }

  const isValid = verifyDeviceSignature({
    payload,
    timestamp,
    nonce,
    signature,
    secretKey,
  });

  if (!isValid) {
    return {
      authorized: false,
      status: 401,
      error: 'Unauthorized: Cryptographic HMAC-SHA256 signature verification failed',
    };
  }

  return {
    authorized: true,
    status: 200,
    device,
  };
}

/**
 * Extracts device attestation parameters from either HTTP headers or JSON body.
 */
export function extractDeviceCredentials(
  request: NextRequest,
  body?: any
): Partial<AttestationCredentials> {
  const headers = request.headers;

  const headerDeviceId = headers.get('x-device-id');
  const headerSignature = headers.get('x-device-signature');
  const headerTimestamp = headers.get('x-device-timestamp');
  const headerNonce = headers.get('x-device-nonce');

  let rawPayload: any;
  if (body?.payload !== undefined) {
    rawPayload = body.payload;
  } else if (body?.events !== undefined) {
    rawPayload = body.events;
  } else {
    rawPayload = body;
  }

  return {
    deviceId: headerDeviceId || body?.deviceId,
    signature: headerSignature || body?.signature,
    timestamp: headerTimestamp || body?.timestamp,
    nonce: headerNonce || body?.nonce,
    payload: rawPayload,
  };
}
