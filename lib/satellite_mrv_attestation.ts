import crypto from "crypto";
import SatelliteMrvAttestation, {
  ISatelliteMrvAttestation,
  IOracleSignature,
} from "../models/SatelliteMrvAttestation";

export interface AttestationInput {
  attestationId: string;
  projectId: string;
  polygon: [number, number][];
  spectralBands: {
    nir: number;
    red: number;
    swir?: number;
  };
  baselineNdvi: number;
  satelliteProvider: "SENTINEL_2" | "LANDSAT_9" | "PLANET_SCOPE";
  oracleSignatures: IOracleSignature[];
}

export interface CanopyHealthEvaluation {
  ndviScore: number;
  deltaNdvi: number;
  deforestationDetected: boolean;
  canopyCondition: "THRIVING" | "STABLE" | "DEGRADED" | "CRITICAL_DEFORESTATION";
  penaltyTCO2e: number;
}

/**
 * Compute Normalized Difference Vegetation Index (NDVI):
 * NDVI = (NIR - RED) / (NIR + RED)
 * Range: [-1.0, 1.0].
 */
export function computeNdvi(nir: number, red: number): number {
  if (nir < 0 || red < 0) {
    throw new Error("Spectral reflectance bands must be non-negative");
  }
  const sum = nir + red;
  if (sum === 0) {
    return 0; // Prevent division by zero
  }
  const rawNdvi = (nir - red) / sum;
  return Number(Math.max(-1.0, Math.min(1.0, rawNdvi)).toFixed(4));
}

/**
 * Verify point containment inside geospatial polygon using Ray-Casting algorithm.
 */
export function isPointInsidePolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  if (polygon.length < 3) {
    return false;
  }
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Evaluate canopy health and assess potential deforestation penalties.
 * Degradation thresholds:
 * deltaNdvi >= -0.05 -> STABLE / THRIVING
 * deltaNdvi between -0.05 and -0.15 -> DEGRADED
 * deltaNdvi < -0.15 -> CRITICAL_DEFORESTATION (Triggers penalty calculation)
 */
export function evaluateCanopyHealth(
  ndviScore: number,
  baselineNdvi: number,
  projectBaseCredits: number = 1000
): CanopyHealthEvaluation {
  const deltaNdvi = Number((ndviScore - baselineNdvi).toFixed(4));

  if (deltaNdvi >= 0.05) {
    return {
      ndviScore,
      deltaNdvi,
      deforestationDetected: false,
      canopyCondition: "THRIVING",
      penaltyTCO2e: 0,
    };
  } else if (deltaNdvi >= -0.05) {
    return {
      ndviScore,
      deltaNdvi,
      deforestationDetected: false,
      canopyCondition: "STABLE",
      penaltyTCO2e: 0,
    };
  } else if (deltaNdvi >= -0.15) {
    return {
      ndviScore,
      deltaNdvi,
      deforestationDetected: false,
      canopyCondition: "DEGRADED",
      penaltyTCO2e: 0,
    };
  } else {
    // Deforestation event: Calculate quadratic carbon penalty proportional to canopy loss
    const lossMagnitude = Math.abs(deltaNdvi);
    const penaltyTCO2e = Number((projectBaseCredits * lossMagnitude * 1.5).toFixed(2));
    return {
      ndviScore,
      deltaNdvi,
      deforestationDetected: true,
      canopyCondition: "CRITICAL_DEFORESTATION",
      penaltyTCO2e,
    };
  }
}

/**
 * Verify cryptographic HMAC-SHA256 signatures from multi-oracle satellite attestations.
 */
export function verifyOracleSignatures(
  messagePayload: string,
  signatures: IOracleSignature[],
  trustedKeys: Record<string, string>,
  minQuorum: number = 2
): { valid: boolean; verifiedCount: number } {
  let verifiedCount = 0;

  for (const sigItem of signatures) {
    const key = trustedKeys[sigItem.oracleId];
    if (!key) continue;

    const hmac = crypto.createHmac("sha256", key);
    hmac.update(`${messagePayload}:${sigItem.timestamp}`);
    const expected = hmac.digest("hex");

    if (crypto.timingSafeEqual(Buffer.from(sigItem.signature, "hex"), Buffer.from(expected, "hex"))) {
      verifiedCount++;
    }
  }

  return {
    valid: verifiedCount >= minQuorum,
    verifiedCount,
  };
}

/**
 * Process end-to-end Satellite MRV Attestation.
 */
export async function processSatelliteAttestation(
  input: AttestationInput,
  trustedKeys: Record<string, string>,
  minQuorum: number = 2,
  projectBaseCredits: number = 1000
): Promise<ISatelliteMrvAttestation> {
  if (input.polygon.length < 3) {
    throw new Error("Geospatial polygon boundary must have at least 3 vertices");
  }

  const ndviScore = computeNdvi(input.spectralBands.nir, input.spectralBands.red);
  const health = evaluateCanopyHealth(ndviScore, input.baselineNdvi, projectBaseCredits);

  // Construct canonical payload for signature verification
  const payload = `${input.attestationId}:${input.projectId}:${ndviScore}:${input.satelliteProvider}`;
  const sigResult = verifyOracleSignatures(payload, input.oracleSignatures, trustedKeys, minQuorum);

  if (!sigResult.valid) {
    throw new Error(`Insufficient valid satellite oracle signatures (${sigResult.verifiedCount}/${minQuorum})`);
  }

  const status = health.deforestationDetected ? "ALERT_DEFORESTATION" : "VERIFIED";

  return await SatelliteMrvAttestation.create({
    attestationId: input.attestationId,
    projectId: input.projectId,
    polygon: input.polygon,
    spectralBands: input.spectralBands,
    ndviScore,
    baselineNdvi: input.baselineNdvi,
    deltaNdvi: health.deltaNdvi,
    satelliteProvider: input.satelliteProvider,
    oracleSignatures: input.oracleSignatures,
    status,
    penaltyTCO2e: health.penaltyTCO2e,
    verifiedAt: new Date(),
  });
}
