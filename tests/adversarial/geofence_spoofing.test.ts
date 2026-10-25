import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import connectDB, { disconnectDB } from '@/lib/mongodb';
import { POST as verifyLocationHandler } from '@/app/api/events/verify-location/route';
import {
  calculateHaversineDistance,
  isPointInPolygon,
  VERIFIED_GREEN_ZONES,
  verifyAndRecordLocationProof,
} from '@/lib/geofence';
import LocationProof from '@/models/LocationProof';
import { NextRequest } from 'next/server';

describe('Adversarial Geofence Spoofing & Teleportation Detection Suite', () => {
  beforeAll(async () => {
    await connectDB();
    await LocationProof.init();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('verifies genuine location within green zone boundary', async () => {
    const zone = VERIFIED_GREEN_ZONES['zone-central-recycling'];
    // Submit coordinates 100 meters away from centroid (well within 500m radius)
    const req = new NextRequest('http://localhost:3000/api/events/verify-location', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: 'iot-sensor-genuine-01',
        latitude: zone.centroid.latitude + 0.0005,
        longitude: zone.centroid.longitude + 0.0005,
        timestamp: Date.now(),
        zoneId: 'zone-central-recycling',
        actionType: 'plastic_recycling_dropoff',
      }),
    });

    const res = await verifyLocationHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.verified).toBe(true);
    expect(data.proofReceipt).toBeDefined();
    expect(typeof data.proofReceipt).toBe('string');
    expect(data.distanceMeters).toBeLessThan(zone.radiusMeters);
  });

  it('rejects coordinates exceeding geofence radius boundary', async () => {
    const zone = VERIFIED_GREEN_ZONES['zone-central-recycling'];
    // Submit coordinates 20 km away
    const req = new NextRequest('http://localhost:3000/api/events/verify-location', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: 'iot-sensor-rogue-02',
        latitude: zone.centroid.latitude + 0.2, // ~22km away
        longitude: zone.centroid.longitude,
        timestamp: Date.now(),
        zoneId: 'zone-central-recycling',
      }),
    });

    const res = await verifyLocationHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe('OUT_OF_GEOFENCE_BOUNDS');
  });

  it('rejects invalid or out-of-range coordinates', async () => {
    const req = new NextRequest('http://localhost:3000/api/events/verify-location', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: 'iot-sensor-corrupted',
        latitude: 105.0, // Invalid: lat must be <= 90
        longitude: -122.4,
        timestamp: Date.now(),
      }),
    });

    const res = await verifyLocationHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe('INVALID_COORDINATES');
  });

  it('detects GPS teleportation spoofing between consecutive events (HTTP 403)', async () => {
    const deviceId = `teleport-device-${Date.now()}`;
    const baseTime = Date.now();

    // 1. Initial event in San Francisco (37.7749, -122.4194)
    const firstRes = await verifyAndRecordLocationProof({
      deviceId,
      latitude: 37.7749,
      longitude: -122.4194,
      timestamp: baseTime,
      actionType: 'transit_commute',
    });
    expect(firstRes.verified).toBe(true);

    // 2. Second event 2 minutes later in New York (40.7128, -74.0060) ~4100 km away!
    // Speed = 4100 km / (2/60 hr) = 123,000 km/h (Impossible travel velocity)
    const reqSpoofed = new NextRequest('http://localhost:3000/api/events/verify-location', {
      method: 'POST',
      body: JSON.stringify({
        deviceId,
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: baseTime + 120 * 1000, // 2 minutes later
        actionType: 'transit_commute',
      }),
    });

    const secondRes = await verifyLocationHandler(reqSpoofed);
    expect(secondRes.status).toBe(403);
    const errorData = await secondRes.json();
    expect(errorData.code).toBe('TELEPORTATION_SPOOFING_DETECTED');
    expect(errorData.velocityKmH).toBeGreaterThan(1000);
  });

  it('evaluates polygon ray-casting containment correctly', () => {
    const polygon = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 10 },
      { latitude: 10, longitude: 10 },
      { latitude: 10, longitude: 0 },
    ];

    expect(isPointInPolygon({ latitude: 5, longitude: 5 }, polygon)).toBe(true);
    expect(isPointInPolygon({ latitude: 15, longitude: 15 }, polygon)).toBe(false);
  });
});
