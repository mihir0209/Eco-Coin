import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import LocationProof from '@/models/LocationProof';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GreenZone {
  id: string;
  name: string;
  centroid: GeoPoint;
  radiusMeters: number;
  polygon?: GeoPoint[];
}

// Preset verified environmental action hubs
export const VERIFIED_GREEN_ZONES: Record<string, GreenZone> = {
  'zone-central-recycling': {
    id: 'zone-central-recycling',
    name: 'Central Eco-Hub & Recycling Depot',
    centroid: { latitude: 37.7749, longitude: -122.4194 }, // SF
    radiusMeters: 500,
  },
  'zone-solar-microgrid': {
    id: 'zone-solar-microgrid',
    name: 'Metropolitan Community Solar Microgrid',
    centroid: { latitude: 37.7833, longitude: -122.4167 },
    radiusMeters: 750,
  },
  'zone-urban-forest': {
    id: 'zone-urban-forest',
    name: 'Presidio Urban Afforestation Sector',
    centroid: { latitude: 37.7989, longitude: -122.4662 },
    radiusMeters: 1200,
  },
};

export const MAX_REASONABLE_VELOCITY_KMH = 150.0; // 150 km/h urban limit

/**
 * Calculates Haversine distance in meters between two coordinates.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Ray-casting algorithm to test if a point is within a polygon.
 */
export function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  const x = point.longitude;
  const y = point.latitude;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude, yi = polygon[i].latitude;
    const xj = polygon[j].longitude, yj = polygon[j].latitude;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface LocationVerificationInput {
  deviceId: string;
  latitude: number;
  longitude: number;
  timestamp: number | string | Date;
  zoneId?: string;
  actionType?: string;
  maxVelocityKmh?: number;
}

export interface LocationVerificationResult {
  verified: boolean;
  error?: string;
  code?: string;
  distanceMeters?: number;
  velocityKmH?: number;
  zoneName?: string;
  proofReceipt?: string;
}

/**
 * Verifies location coordinates, enforces geofencing, detects teleportation/spoofing,
 * and generates a tamper-evident cryptographic receipt.
 */
export async function verifyAndRecordLocationProof(
  input: LocationVerificationInput
): Promise<LocationVerificationResult> {
  const {
    deviceId,
    latitude,
    longitude,
    zoneId,
    actionType = 'environmental_action',
    maxVelocityKmh = MAX_REASONABLE_VELOCITY_KMH,
  } = input;

  // 1. Coordinate Validity Check
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return {
      verified: false,
      code: 'INVALID_COORDINATES',
      error: 'Coordinates must be valid numbers within [-90, 90] and [-180, 180]',
    };
  }

  // Parse Timestamp
  const now = Date.now();
  const tsMs =
    typeof input.timestamp === 'number'
      ? input.timestamp < 1e11
        ? input.timestamp * 1000
        : input.timestamp
      : new Date(input.timestamp).getTime();

  if (isNaN(tsMs)) {
    return {
      verified: false,
      code: 'INVALID_TIMESTAMP',
      error: 'Invalid timestamp format',
    };
  }

  await connectDB();
  await LocationProof.init();

  // 2. Geofence Zone Boundary Check (if zoneId is specified)
  let zoneName = 'Universal Green Action Area';
  let distToCentroid = 0;
  if (zoneId) {
    const zone = VERIFIED_GREEN_ZONES[zoneId];
    if (!zone) {
      return {
        verified: false,
        code: 'UNKNOWN_ZONE',
        error: `Designated zone '${zoneId}' is not registered`,
      };
    }
    zoneName = zone.name;
    distToCentroid = calculateHaversineDistance(
      latitude,
      longitude,
      zone.centroid.latitude,
      zone.centroid.longitude
    );

    if (distToCentroid > zone.radiusMeters) {
      return {
        verified: false,
        code: 'OUT_OF_GEOFENCE_BOUNDS',
        error: `Location is ${Math.round(distToCentroid)}m from zone centroid, exceeding allowed radius of ${zone.radiusMeters}m`,
        distanceMeters: distToCentroid,
      };
    }
  }

  // 3. Teleportation & Velocity Anomaly Detection
  // Find the latest previous proof for this device
  const previousProof = await LocationProof.findOne({ deviceId })
    .sort({ timestamp: -1 })
    .lean();

  let calculatedVelocityKmH = 0;
  if (previousProof) {
    const prevTsMs = new Date(previousProof.timestamp).getTime();
    const timeDeltaSeconds = Math.abs(tsMs - prevTsMs) / 1000;
    const distanceMeters = calculateHaversineDistance(
      previousProof.latitude,
      previousProof.longitude,
      latitude,
      longitude
    );

    if (timeDeltaSeconds > 0) {
      calculatedVelocityKmH = (distanceMeters / 1000) / (timeDeltaSeconds / 3600);
      if (calculatedVelocityKmH > maxVelocityKmh) {
        return {
          verified: false,
          code: 'TELEPORTATION_SPOOFING_DETECTED',
          error: `Impossible velocity detected: ${Math.round(calculatedVelocityKmH)} km/h exceeds maximum allowed threshold of ${maxVelocityKmh} km/h`,
          velocityKmH: calculatedVelocityKmH,
          distanceMeters,
        };
      }
    } else if (distanceMeters > 50) {
      return {
        verified: false,
        code: 'TELEPORTATION_SPOOFING_DETECTED',
        error: `Simultaneous contradictory coordinates reported for deviceId ${deviceId}`,
        distanceMeters,
      };
    }
  }

  // 4. Cryptographic Proof Receipt Generation
  const secretKey = process.env.LOCATION_SECRET_KEY || 'eco-coin-default-location-salt';
  const payloadToSign = `${deviceId}:${latitude.toFixed(6)}:${longitude.toFixed(6)}:${tsMs}:${zoneId || 'none'}:${actionType}`;
  const proofReceipt = crypto
    .createHmac('sha256', secretKey)
    .update(payloadToSign)
    .digest('hex');

  // 5. Persist Verified Proof
  await LocationProof.create({
    deviceId,
    latitude,
    longitude,
    timestamp: new Date(tsMs),
    zoneId: zoneId || null,
    actionType,
    velocityKmH: calculatedVelocityKmH,
    distanceToCentroid: distToCentroid,
    proofReceipt,
  });

  return {
    verified: true,
    distanceMeters: distToCentroid,
    velocityKmH: calculatedVelocityKmH,
    zoneName,
    proofReceipt,
  };
}
