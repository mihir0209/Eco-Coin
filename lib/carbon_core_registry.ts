export interface CarbonCoreSampleRecord {
  sampleId: string;
  geoPolygonBbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  coreDepthCm: number;
  bulkDensityGPerCm3: number;
  organicCarbonPct: number;
  merkleLeafHash: string;
}

export function registerPhysicalCarbonCore(
  sampleId: string,
  geoPolygonBbox: [number, number, number, number],
  coreDepthCm: number,
  bulkDensityGPerCm3: number,
  organicCarbonPct: number
): CarbonCoreSampleRecord {
  // Simple deterministic leaf hash computation
  const rawPayload = `${sampleId}:${geoPolygonBbox.join(",")}:${coreDepthCm}:${bulkDensityGPerCm3}:${organicCarbonPct}`;
  let hashVal = 0;
  for (let i = 0; i < rawPayload.length; i++) {
    hashVal = (hashVal << 5) - hashVal + rawPayload.charCodeAt(i);
    hashVal |= 0;
  }
  const hexHash = Math.abs(hashVal).toString(16).padStart(8, "0");

  return {
    sampleId,
    geoPolygonBbox,
    coreDepthCm,
    bulkDensityGPerCm3,
    organicCarbonPct,
    merkleLeafHash: `0x${hexHash}`,
  };
}
