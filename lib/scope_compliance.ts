import crypto from "crypto";
import ScopeCompliance, { IScopeCompliance } from "@/models/ScopeCompliance";

export function determineEsgRating(grossKg: number, netKg: number): "AAA" | "AA" | "A" | "B" | "C" | "NON_COMPLIANT" {
  if (grossKg <= 0) return "AAA";
  const offsetRatio = Math.max(0, (grossKg - netKg) / grossKg);

  if (offsetRatio >= 1.0) return "AAA"; // 100% net zero or carbon negative
  if (offsetRatio >= 0.85) return "AA";
  if (offsetRatio >= 0.70) return "A";
  if (offsetRatio >= 0.50) return "B";
  if (offsetRatio >= 0.25) return "C";
  return "NON_COMPLIANT";
}

export function computeTamperSeal(
  reportId: string,
  enterpriseId: string,
  periodYear: number,
  grossKg: number,
  netKg: number,
  esgRating: string
): string {
  const payload = `${reportId}|${enterpriseId}|${periodYear}|${grossKg}|${netKg}|${esgRating}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function generateScopeComplianceReport(
  reportId: string,
  enterpriseId: string,
  periodYear: number,
  scope1Kg: number,
  scope2Kg: number,
  scope3Kg: number,
  retiredOffsetKg: number
): Promise<IScopeCompliance> {
  if (scope1Kg < 0 || scope2Kg < 0 || scope3Kg < 0 || retiredOffsetKg < 0) {
    throw new Error("Emissions and offset credits must be non-negative");
  }

  const grossEmissionsKg = scope1Kg + scope2Kg + scope3Kg;
  const netEmissionsKg = Math.max(0, grossEmissionsKg - retiredOffsetKg);
  const esgRating = determineEsgRating(grossEmissionsKg, netEmissionsKg);
  const tamperSealSha256 = computeTamperSeal(reportId, enterpriseId, periodYear, grossEmissionsKg, netEmissionsKg, esgRating);

  const report = await ScopeCompliance.create({
    reportId,
    enterpriseId,
    periodYear,
    scope1EmissionsKg: scope1Kg,
    scope2EmissionsKg: scope2Kg,
    scope3EmissionsKg: scope3Kg,
    grossEmissionsKg,
    retiredOffsetCreditsKg: retiredOffsetKg,
    netEmissionsKg,
    esgRating,
    tamperSealSha256,
    issuedAt: new Date(),
  });

  return report;
}

export function verifyComplianceTamperSeal(report: IScopeCompliance): boolean {
  const expected = computeTamperSeal(
    report.reportId,
    report.enterpriseId,
    report.periodYear,
    report.grossEmissionsKg,
    report.netEmissionsKg,
    report.esgRating
  );
  return expected === report.tamperSealSha256;
}
