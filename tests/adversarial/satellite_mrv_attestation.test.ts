import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import {
  computeNdvi,
  isPointInsidePolygon,
  evaluateCanopyHealth,
  verifyOracleSignatures,
  processSatelliteAttestation,
} from "../../lib/satellite_mrv_attestation";
import SatelliteMrvAttestation from "../../models/SatelliteMrvAttestation";

vi.mock("../../models/SatelliteMrvAttestation", () => {
  const store = new Map<string, any>();
  return {
    default: {
      findOne: vi.fn(async (q: any) => {
        if (q.attestationId && store.has(q.attestationId)) {
          const doc = store.get(q.attestationId);
          return {
            ...doc,
            save: vi.fn(async function () {
              store.set(this.attestationId, { ...this });
              return this;
            }),
          };
        }
        return null;
      }),
      create: vi.fn(async (doc: any) => {
        const item = { ...doc, _id: "mrv_" + Math.random().toString(36).substring(7) };
        store.set(doc.attestationId, item);
        return item;
      }),
      _clear: () => store.clear(),
    },
  };
});

describe("Satellite MRV Geospatial Attestation & Deforestation Sentinel", () => {
  const trustedKeys: Record<string, string> = {
    "oracle-copernicus-01": "copernicus_secret_key_4432109876543210",
    "oracle-usgs-02": "usgs_landsat_secret_key_abcdef1234567890",
    "oracle-planet-03": "planet_scope_secret_key_9876543210fedcba",
  };

  const samplePolygon: [number, number][] = [
    [-3.4653, -62.2159],
    [-3.4653, -62.1500],
    [-3.5200, -62.1500],
    [-3.5200, -62.2159],
  ];

  beforeEach(() => {
    (SatelliteMrvAttestation as any)._clear();
    vi.clearAllMocks();
  });

  function signPayload(oracleId: string, payload: string, timestamp: number): string {
    const key = trustedKeys[oracleId];
    return crypto.createHmac("sha256", key).update(`${payload}:${timestamp}`).digest("hex");
  }

  it("accurately computes NDVI reflectance ratios across vegetation bands", () => {
    // Dense vegetation: high NIR (0.8), low RED (0.1) -> (0.8 - 0.1) / (0.8 + 0.1) = 0.7778
    const denseForestNdvi = computeNdvi(0.8, 0.1);
    expect(denseForestNdvi).toBeCloseTo(0.7778, 3);

    // Bare soil / barren land: NIR ~ RED -> near 0
    const barrenNdvi = computeNdvi(0.2, 0.2);
    expect(barrenNdvi).toBe(0);

    // Deep water: NIR < RED
    const waterNdvi = computeNdvi(0.05, 0.15);
    expect(waterNdvi).toBeLessThan(0);

    // Division by zero guard
    expect(computeNdvi(0, 0)).toBe(0);

    // Negative reflectance rejection
    expect(() => computeNdvi(-0.1, 0.5)).toThrow();
  });

  it("verifies geospatial ray-casting polygon boundary containment", () => {
    // Point clearly inside the polygon
    const insidePoint: [number, number] = [-3.4900, -62.1800];
    expect(isPointInsidePolygon(insidePoint, samplePolygon)).toBe(true);

    // Point outside the bounding box
    const outsidePoint: [number, number] = [-3.6000, -62.1800];
    expect(isPointInsidePolygon(outsidePoint, samplePolygon)).toBe(false);

    // Degenerate polygon (< 3 vertices) returns false
    expect(isPointInsidePolygon(insidePoint, [[0, 0], [1, 1]])).toBe(false);
  });

  it("detects canopy stability and healthy vegetation", () => {
    const health = evaluateCanopyHealth(0.82, 0.75, 1000);
    expect(health.deforestationDetected).toBe(false);
    expect(health.canopyCondition).toBe("THRIVING");
    expect(health.penaltyTCO2e).toBe(0);
  });

  it("triggers critical deforestation alert and carbon penalty on severe canopy loss", () => {
    // Baseline was 0.80, current satellite reading dropped to 0.55 (delta = -0.25)
    const health = evaluateCanopyHealth(0.55, 0.80, 2000);
    expect(health.deforestationDetected).toBe(true);
    expect(health.canopyCondition).toBe("CRITICAL_DEFORESTATION");
    // Penalty = 2000 * 0.25 * 1.5 = 750 tCO2e
    expect(health.penaltyTCO2e).toBe(750);
  });

  it("verifies multi-oracle cryptographic signatures and enforces quorum", () => {
    const payload = "ATT-001:PROJ-AMAZON-01:0.75:SENTINEL_2";
    const ts = Date.now();

    const validSignatures = [
      { oracleId: "oracle-copernicus-01", signature: signPayload("oracle-copernicus-01", payload, ts), timestamp: ts },
      { oracleId: "oracle-usgs-02", signature: signPayload("oracle-usgs-02", payload, ts), timestamp: ts },
    ];

    const result = verifyOracleSignatures(payload, validSignatures, trustedKeys, 2);
    expect(result.valid).toBe(true);
    expect(result.verifiedCount).toBe(2);

    // Adversarial: Submitting forged signature
    const forgedSignatures = [
      { oracleId: "oracle-copernicus-01", signature: "deadbeef0000111122223333444455556666777788889999aaaabbbbccccdddd", timestamp: ts },
      { oracleId: "oracle-usgs-02", signature: signPayload("oracle-usgs-02", payload, ts), timestamp: ts },
    ];
    const forgedResult = verifyOracleSignatures(payload, forgedSignatures, trustedKeys, 2);
    expect(forgedResult.valid).toBe(false);
    expect(forgedResult.verifiedCount).toBe(1);
  });

  it("processes end-to-end satellite attestation successfully with healthy canopy", async () => {
    const ts = Date.now();
    const ndvi = computeNdvi(0.85, 0.15); // 0.70
    const payload = `ATT-HEALTHY-01:PROJ-PARÁ-09:${ndvi}:SENTINEL_2`;

    const signatures = [
      { oracleId: "oracle-copernicus-01", signature: signPayload("oracle-copernicus-01", payload, ts), timestamp: ts },
      { oracleId: "oracle-planet-03", signature: signPayload("oracle-planet-03", payload, ts), timestamp: ts },
    ];

    const doc = await processSatelliteAttestation(
      {
        attestationId: "ATT-HEALTHY-01",
        projectId: "PROJ-PARÁ-09",
        polygon: samplePolygon,
        spectralBands: { nir: 0.85, red: 0.15 },
        baselineNdvi: 0.68,
        satelliteProvider: "SENTINEL_2",
        oracleSignatures: signatures,
      },
      trustedKeys,
      2,
      5000
    );

    expect(doc.status).toBe("VERIFIED");
    expect(doc.penaltyTCO2e).toBe(0);
    expect(doc.ndviScore).toBe(0.7);
  });

  it("penalizes and marks deforestation alert on illegal logging event", async () => {
    const ts = Date.now();
    const ndvi = computeNdvi(0.35, 0.35); // 0.00 (drastic clear-cut)
    const payload = `ATT-LOGGING-01:PROJ-CONGO-02:${ndvi}:PLANET_SCOPE`;

    const signatures = [
      { oracleId: "oracle-planet-03", signature: signPayload("oracle-planet-03", payload, ts), timestamp: ts },
      { oracleId: "oracle-usgs-02", signature: signPayload("oracle-usgs-02", payload, ts), timestamp: ts },
    ];

    const doc = await processSatelliteAttestation(
      {
        attestationId: "ATT-LOGGING-01",
        projectId: "PROJ-CONGO-02",
        polygon: samplePolygon,
        spectralBands: { nir: 0.35, red: 0.35 },
        baselineNdvi: 0.75,
        satelliteProvider: "PLANET_SCOPE",
        oracleSignatures: signatures,
      },
      trustedKeys,
      2,
      10000
    );

    expect(doc.status).toBe("ALERT_DEFORESTATION");
    expect(doc.deltaNdvi).toBe(-0.75);
    expect(doc.penaltyTCO2e).toBeGreaterThan(0);
  });
});
