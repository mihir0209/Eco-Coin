export interface HydrophoneAcousticStatus {
  measuredSplDb: number;
  backgroundSplDb: number;
  isCetaceanExclusionZoneBreached: boolean;
  mitigationAction: "PROCEED_DISPERSAL" | "RAMP_DOWN_ACOUSTIC" | "EMERGENCY_SHUTDOWN";
}

export function evaluateMarineAcousticSafety(
  measuredPressureMicroPa: number,
  backgroundNoiseDb: number = 85.0, // Typical ocean ambient noise ~85-90 dB re 1 uPa
  cetaceanDetectionProximityMeters: number = 3000.0
): HydrophoneAcousticStatus {
  if (measuredPressureMicroPa <= 0) {
    return { measuredSplDb: 0, backgroundSplDb: backgroundNoiseDb, isCetaceanExclusionZoneBreached: false, mitigationAction: "PROCEED_DISPERSAL" };
  }

  // Sound Pressure Level SPL (dB re 1 uPa) = 20 * log10(P / P_ref), P_ref = 1 uPa
  const splDb = Number((20.0 * Math.log10(measuredPressureMicroPa)).toFixed(1));

  // NOAA Marine Mammal Acoustic Thresholds: Level B harassment > 120 dB (continuous) / 160 dB (impulsive).
  // Marine mammal within 1000m exclusion zone triggers emergency shutdown.
  let action: "PROCEED_DISPERSAL" | "RAMP_DOWN_ACOUSTIC" | "EMERGENCY_SHUTDOWN" = "PROCEED_DISPERSAL";
  let breach = false;

  if (cetaceanDetectionProximityMeters <= 1000.0 || splDb >= 160.0) {
    action = "EMERGENCY_SHUTDOWN";
    breach = true;
  } else if (cetaceanDetectionProximityMeters <= 2000.0 || splDb >= 120.0) {
    action = "RAMP_DOWN_ACOUSTIC";
    breach = true;
  }

  return {
    measuredSplDb: splDb,
    backgroundSplDb: backgroundNoiseDb,
    isCetaceanExclusionZoneBreached: breach,
    mitigationAction: action,
  };
}
