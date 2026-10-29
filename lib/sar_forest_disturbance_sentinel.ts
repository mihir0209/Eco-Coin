export interface SarDisturbanceStatus {
  isDeforestationAlert: boolean;
  backscatterDeltaDb: number;
  crossPolarizationRatio: number;
  confidenceScore: number;
}

export function detectSarForestDisturbance(
  baselineVhBackscatterDb: number, // e.g. -12.5 dB (dense canopy)
  observedVhBackscatterDb: number, // e.g. -18.0 dB (cleared canopy)
  observedVvBackscatterDb: number = -11.0
): SarDisturbanceStatus {
  // Volume scattering in forest canopies produces high VH backscatter.
  // Clearing/logging drops VH backscatter significantly (delta < -3.0 dB).
  const deltaVh = Number((observedVhBackscatterDb - baselineVhBackscatterDb).toFixed(2));
  const vhVvRatio = Number((observedVhBackscatterDb / Math.min(-1.0, observedVvBackscatterDb)).toFixed(2));

  const isDisturbed = deltaVh <= -3.5;
  const confidence = Math.min(1.0, Math.max(0.0, Math.abs(deltaVh) / 6.0));

  return {
    isDeforestationAlert: isDisturbed,
    backscatterDeltaDb: deltaVh,
    crossPolarizationRatio: vhVvRatio,
    confidenceScore: Number(confidence.toFixed(2)),
  };
}
