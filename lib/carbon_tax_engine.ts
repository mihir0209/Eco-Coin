import crypto from "crypto";
import CarbonTaxAudit, { ICarbonTaxAudit } from "@/models/CarbonTaxAudit";
import OffsetCertificate from "@/models/OffsetCertificate";

export type TaxJurisdiction =
  | "EU_ETS"
  | "CALIFORNIA_CAT"
  | "UK_ETS"
  | "SINGAPORE_CARBON_TAX"
  | "GLOBAL_VOLUNTARY";

export interface JurisdictionRule {
  name: string;
  pricePerTonUsd: number;
  freeAllowanceKg: number;
  taxableScopes: ("scope1" | "scope2" | "scope3")[];
}

export const JURISDICTION_RULES: Record<TaxJurisdiction, JurisdictionRule> = {
  EU_ETS: {
    name: "European Union Emissions Trading System",
    pricePerTonUsd: 85.0,
    freeAllowanceKg: 10000,
    taxableScopes: ["scope1", "scope2"],
  },
  CALIFORNIA_CAT: {
    name: "California Cap-and-Trade Program",
    pricePerTonUsd: 38.0,
    freeAllowanceKg: 5000,
    taxableScopes: ["scope1", "scope2"],
  },
  UK_ETS: {
    name: "United Kingdom Emissions Trading Scheme",
    pricePerTonUsd: 72.0,
    freeAllowanceKg: 8000,
    taxableScopes: ["scope1", "scope2"],
  },
  SINGAPORE_CARBON_TAX: {
    name: "Singapore Carbon Pricing Act",
    pricePerTonUsd: 25.0,
    freeAllowanceKg: 2000,
    taxableScopes: ["scope1"],
  },
  GLOBAL_VOLUNTARY: {
    name: "Global Voluntary ESG Compliance Benchmark",
    pricePerTonUsd: 15.0,
    freeAllowanceKg: 0,
    taxableScopes: ["scope1", "scope2", "scope3"],
  },
};

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function computeAuditHash(data: {
  userId: string;
  organizationName: string;
  reportingYear: number;
  jurisdiction: string;
  totalGrossCo2Kg: number;
  totalOffsetsAppliedKg: number;
  netTaxableCo2Kg: number;
  estimatedTaxLiabilityUsd: number;
}): string {
  const payload = [
    data.userId,
    data.organizationName,
    data.reportingYear,
    data.jurisdiction,
    data.totalGrossCo2Kg.toFixed(2),
    data.totalOffsetsAppliedKg.toFixed(2),
    data.netTaxableCo2Kg.toFixed(2),
    data.estimatedTaxLiabilityUsd.toFixed(2),
  ].join("##");
  return sha256(payload);
}

export interface TaxCalculationInput {
  userId: string;
  organizationName: string;
  reportingYear: number;
  jurisdiction: TaxJurisdiction;
  grossScope1Kg: number;
  grossScope2Kg: number;
  grossScope3Kg: number;
  offsetsToApplyKg?: number;
}

export interface TaxCalculationResult {
  jurisdiction: TaxJurisdiction;
  rule: JurisdictionRule;
  totalGrossCo2Kg: number;
  applicableGrossCo2Kg: number;
  totalOffsetsAppliedKg: number;
  netTaxableCo2Kg: number;
  carbonPricePerTonUsd: number;
  estimatedTaxLiabilityUsd: number;
  complianceStatus: "COMPLIANT" | "SURPLUS" | "DEFICIT";
  auditHash: string;
}

export function calculateCarbonTax(input: TaxCalculationInput): TaxCalculationResult {
  const {
    userId,
    organizationName,
    reportingYear,
    jurisdiction = "GLOBAL_VOLUNTARY",
    grossScope1Kg = 0,
    grossScope2Kg = 0,
    grossScope3Kg = 0,
    offsetsToApplyKg = 0,
  } = input;

  if (grossScope1Kg < 0 || grossScope2Kg < 0 || grossScope3Kg < 0 || offsetsToApplyKg < 0) {
    throw new Error("Emissions and offsets values cannot be negative numbers");
  }

  const rule = JURISDICTION_RULES[jurisdiction] || JURISDICTION_RULES.GLOBAL_VOLUNTARY;

  const totalGrossCo2Kg = Number((grossScope1Kg + grossScope2Kg + grossScope3Kg).toFixed(2));

  let applicableGrossCo2Kg = 0;
  if (rule.taxableScopes.includes("scope1")) applicableGrossCo2Kg += grossScope1Kg;
  if (rule.taxableScopes.includes("scope2")) applicableGrossCo2Kg += grossScope2Kg;
  if (rule.taxableScopes.includes("scope3")) applicableGrossCo2Kg += grossScope3Kg;
  applicableGrossCo2Kg = Number(applicableGrossCo2Kg.toFixed(2));

  const afterAllowance = Math.max(0, applicableGrossCo2Kg - rule.freeAllowanceKg);
  const netTaxableCo2Kg = Number(Math.max(0, afterAllowance - offsetsToApplyKg).toFixed(2));

  const netTaxableTons = netTaxableCo2Kg / 1000;
  const estimatedTaxLiabilityUsd = Number((netTaxableTons * rule.pricePerTonUsd).toFixed(2));

  let complianceStatus: "COMPLIANT" | "SURPLUS" | "DEFICIT";
  if (netTaxableCo2Kg === 0) {
    complianceStatus = offsetsToApplyKg > afterAllowance ? "SURPLUS" : "COMPLIANT";
  } else {
    complianceStatus = "DEFICIT";
  }

  const auditHash = computeAuditHash({
    userId,
    organizationName,
    reportingYear,
    jurisdiction,
    totalGrossCo2Kg,
    totalOffsetsAppliedKg: offsetsToApplyKg,
    netTaxableCo2Kg,
    estimatedTaxLiabilityUsd,
  });

  return {
    jurisdiction,
    rule,
    totalGrossCo2Kg,
    applicableGrossCo2Kg,
    totalOffsetsAppliedKg: offsetsToApplyKg,
    netTaxableCo2Kg,
    carbonPricePerTonUsd: rule.pricePerTonUsd,
    estimatedTaxLiabilityUsd,
    complianceStatus,
    auditHash,
  };
}

export async function generateAndSaveCarbonTaxAudit(input: TaxCalculationInput): Promise<ICarbonTaxAudit> {
  let offsets = input.offsetsToApplyKg;

  // If offsetsToApplyKg is not explicitly specified, aggregate verified retired certificates from DB
  if (offsets === undefined) {
    const certs = await OffsetCertificate.find({
      userId: input.userId,
      status: "RETIRED",
    });
    offsets = certs.reduce((acc, c) => acc + (c.co2KgRetired || 0), 0);
  }

  const result = calculateCarbonTax({ ...input, offsetsToApplyKg: offsets });

  const record = await CarbonTaxAudit.create({
    userId: input.userId,
    organizationName: input.organizationName,
    reportingYear: input.reportingYear,
    jurisdiction: input.jurisdiction,
    grossScope1Kg: input.grossScope1Kg,
    grossScope2Kg: input.grossScope2Kg,
    grossScope3Kg: input.grossScope3Kg,
    totalGrossCo2Kg: result.totalGrossCo2Kg,
    totalOffsetsAppliedKg: result.totalOffsetsAppliedKg,
    netTaxableCo2Kg: result.netTaxableCo2Kg,
    carbonPricePerTonUsd: result.carbonPricePerTonUsd,
    estimatedTaxLiabilityUsd: result.estimatedTaxLiabilityUsd,
    complianceStatus: result.complianceStatus,
    auditHash: result.auditHash,
  });

  return record;
}
