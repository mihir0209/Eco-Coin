import crypto from "crypto";
import MultiOracleSubmission, { IMultiOracleSubmission, IOracleReport } from "@/models/MultiOracleSubmission";

export interface AggregateConsensusResult {
  approved: boolean;
  reason?: string;
  consensusEnergyKwh?: number;
  consensusCarbonOffsetKg?: number;
  outlierOracleIds: string[];
  medianEnergy: number;
  medianCarbon: number;
}

export function verifyOracleSignature(oracleId: string, energyKwh: number, carbonKg: number, epoch: number, signature: string, secretKey: string = "oracle_signing_key"): boolean {
  const payload = `${oracleId}:${energyKwh}:${carbonKg}:${epoch}`;
  const expectedSignature = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
  return signature === expectedSignature;
}

export function generateOracleSignature(oracleId: string, energyKwh: number, carbonKg: number, epoch: number, secretKey: string = "oracle_signing_key"): string {
  const payload = `${oracleId}:${energyKwh}:${carbonKg}:${epoch}`;
  return crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
}

export function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function filterOutliers(reports: IOracleReport[], varianceThresholdPercent: number = 15.0): { validReports: IOracleReport[]; outlierIds: string[]; medianEnergy: number; medianCarbon: number } {
  if (reports.length === 0) {
    return { validReports: [], outlierIds: [], medianEnergy: 0, medianCarbon: 0 };
  }

  const medianEnergy = calculateMedian(reports.map(r => r.energyProducedKwh));
  const medianCarbon = calculateMedian(reports.map(r => r.carbonOffsetKg));

  const validReports: IOracleReport[] = [];
  const outlierIds: string[] = [];

  for (const report of reports) {
    const energyDeviationPct = Math.abs((report.energyProducedKwh - medianEnergy) / (medianEnergy || 1)) * 100;
    const carbonDeviationPct = Math.abs((report.carbonOffsetKg - medianCarbon) / (medianCarbon || 1)) * 100;

    if (energyDeviationPct <= varianceThresholdPercent && carbonDeviationPct <= varianceThresholdPercent) {
      validReports.push(report);
    } else {
      outlierIds.push(report.oracleId);
    }
  }

  return { validReports, outlierIds, medianEnergy, medianCarbon };
}

export async function processMultiOracleConsensus(submissionId: string): Promise<AggregateConsensusResult> {
  const submission = await MultiOracleSubmission.findOne({ submissionId });
  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  if (submission.reports.length < submission.thresholdRequired) {
    submission.status = "pending";
    await submission.save();
    return {
      approved: false,
      reason: `Insufficient oracle reports. Required: ${submission.thresholdRequired}, received: ${submission.reports.length}`,
      outlierOracleIds: [],
      medianEnergy: 0,
      medianCarbon: 0,
    };
  }

  const { validReports, outlierIds, medianEnergy, medianCarbon } = filterOutliers(submission.reports, submission.varianceThresholdPercent);

  if (validReports.length < submission.thresholdRequired) {
    submission.status = "disputed";
    await submission.save();
    return {
      approved: false,
      reason: `Outlier rejection dropped valid report count (${validReports.length}) below threshold (${submission.thresholdRequired})`,
      outlierOracleIds: outlierIds,
      medianEnergy,
      medianCarbon,
    };
  }

  const consensusEnergy = calculateMedian(validReports.map(r => r.energyProducedKwh));
  const consensusCarbon = calculateMedian(validReports.map(r => r.carbonOffsetKg));

  submission.status = "approved";
  submission.consensusEnergyKwh = consensusEnergy;
  submission.consensusCarbonOffsetKg = consensusCarbon;
  submission.consensusReachedAt = new Date();
  await submission.save();

  return {
    approved: true,
    consensusEnergyKwh: consensusEnergy,
    consensusCarbonOffsetKg: consensusCarbon,
    outlierOracleIds: outlierIds,
    medianEnergy,
    medianCarbon,
  };
}
