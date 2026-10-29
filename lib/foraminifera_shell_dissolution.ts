export interface ForaminiferaDissolutionStatus {
  calciteSaturationOmega: number;
  shellDissolutionRatePctPerYear: number;
  benthicCarbonPermanenceVerified: boolean;
  preservationTier: "PRISTINE_PRESERVATION" | "MODERATE_LYSOCLINE_DISSOLUTION" | "RAPID_CCD_CORROSION";
}

export function evaluateForaminiferaShellDissolution(
  waterDepthMeters: number,
  dissolvedCarbonateUmolPerKg: number,
  dissolvedCalciumUmolPerKg: number = 10280.0,
  waterTempCelsius: number = 2.0
): ForaminiferaDissolutionStatus {
  // Apparent solubility product K'sp of calcite increases with depth/pressure:
  // K'sp ~ 4.5e-7 * (1 + depth / 1000 * 0.18) (mol/kg)^2
  const kSpPrime = 4.5e-7 * (1.0 + (waterDepthMeters / 1000.0) * 0.18);
  const ionProduct = (dissolvedCalciumUmolPerKg * 1e-6) * (dissolvedCarbonateUmolPerKg * 1e-6);
  // Omega = [Ca2+][CO3 2-] / K'sp
  const omega = Number((ionProduct / kSpPrime).toFixed(3));

  let rate = 0.0;
  let tier: "PRISTINE_PRESERVATION" | "MODERATE_LYSOCLINE_DISSOLUTION" | "RAPID_CCD_CORROSION" = "PRISTINE_PRESERVATION";

  if (omega >= 1.0) {
    // Supersaturated: no dissolution
    rate = 0.1;
    tier = "PRISTINE_PRESERVATION";
  } else if (omega >= 0.70) {
    // Lysocline zone
    rate = Number(((1.0 - omega) * 20.0).toFixed(2));
    tier = "MODERATE_LYSOCLINE_DISSOLUTION";
  } else {
    // Below CCD (Carbonate Compensation Depth): rapid undersaturated dissolution
    rate = Number(((1.0 - omega) * 60.0).toFixed(2));
    tier = "RAPID_CCD_CORROSION";
  }

  const isPermanent = omega >= 0.90;

  return {
    calciteSaturationOmega: omega,
    shellDissolutionRatePctPerYear: rate,
    benthicCarbonPermanenceVerified: isPermanent,
    preservationTier: tier,
  };
}
