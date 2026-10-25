import { describe, it, expect, beforeAll, afterAll } from "vitest";
import connectDB, { disconnectDB } from "@/lib/mongodb";
import CarbonTaxAudit from "@/models/CarbonTaxAudit";
import OffsetCertificate from "@/models/OffsetCertificate";
import {
  calculateCarbonTax,
  generateAndSaveCarbonTaxAudit,
  JURISDICTION_RULES,
} from "@/lib/carbon_tax_engine";
import { POST as carbonTaxHandler } from "@/app/api/compliance/carbon-tax/route";
import { NextRequest } from "next/server";

describe("Adversarial Carbon Tax & Compliance Footprint Engine Suite", () => {
  beforeAll(async () => {
    await connectDB();
    await CarbonTaxAudit.init();
    await OffsetCertificate.init();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it("calculates EU ETS carbon tax liability applying free allowance and offsets", () => {
    const res = calculateCarbonTax({
      userId: "user_eu_1",
      organizationName: "Nordic Manufacturing AB",
      reportingYear: 2026,
      jurisdiction: "EU_ETS",
      grossScope1Kg: 40000, // 40 tons
      grossScope2Kg: 20000, // 20 tons -> total applicable 60,000 kg
      grossScope3Kg: 100000, // Scope 3 not taxed under EU ETS
      offsetsToApplyKg: 25000, // 25 tons offset
    });

    // Free allowance is 10,000 kg. Applicable is 60,000 kg.
    // After allowance = 50,000 kg.
    // Minus 25,000 kg offset = 25,000 kg net taxable (25 metric tons).
    // Price = $85 / ton => 25 * 85 = $2,125.00
    expect(res.totalGrossCo2Kg).toBe(160000);
    expect(res.applicableGrossCo2Kg).toBe(60000);
    expect(res.netTaxableCo2Kg).toBe(25000);
    expect(res.estimatedTaxLiabilityUsd).toBe(2125);
    expect(res.complianceStatus).toBe("DEFICIT");
    expect(res.auditHash).toBeDefined();
  });

  it("marks status as COMPLIANT or SURPLUS when offsets fully neutralize net liability", () => {
    const res = calculateCarbonTax({
      userId: "user_clean_1",
      organizationName: "Solar Powered Data Center Inc",
      reportingYear: 2026,
      jurisdiction: "CALIFORNIA_CAT",
      grossScope1Kg: 8000,
      grossScope2Kg: 2000, // Total applicable = 10,000 kg. Free allowance = 5,000 kg -> 5,000 kg net.
      grossScope3Kg: 0,
      offsetsToApplyKg: 8000, // Surplus offset by 3,000 kg
    });

    expect(res.netTaxableCo2Kg).toBe(0);
    expect(res.estimatedTaxLiabilityUsd).toBe(0);
    expect(res.complianceStatus).toBe("SURPLUS");
  });

  it("adversarial: strictly rejects negative emission or offset inputs", () => {
    expect(() =>
      calculateCarbonTax({
        userId: "hacker_1",
        organizationName: "Fraudulent Energy",
        reportingYear: 2026,
        jurisdiction: "GLOBAL_VOLUNTARY",
        grossScope1Kg: -500,
        grossScope2Kg: 1000,
        grossScope3Kg: 0,
      })
    ).toThrow(/cannot be negative/);

    expect(() =>
      calculateCarbonTax({
        userId: "hacker_1",
        organizationName: "Fraudulent Energy",
        reportingYear: 2026,
        jurisdiction: "GLOBAL_VOLUNTARY",
        grossScope1Kg: 500,
        grossScope2Kg: 1000,
        grossScope3Kg: 0,
        offsetsToApplyKg: -100,
      })
    ).toThrow(/cannot be negative/);
  });

  it("persists audit report and integrates with retired OffsetCertificate records", async () => {
    const uid = `user_audit_${Date.now()}`;

    // Seed a retired offset certificate
    await OffsetCertificate.create({
      certificateId: `CERT-TAX-${Date.now()}`,
      userId: uid,
      beneficiaryName: "Automated Tax Audit Unit",
      scope: "scope2",
      co2KgRetired: 5000,
      ecoCoinsBurned: 500,
      verificationHash: `hash_${Date.now()}`,
      status: "RETIRED",
    });

    const audit = await generateAndSaveCarbonTaxAudit({
      userId: uid,
      organizationName: "Eco Tech Ventures",
      reportingYear: 2026,
      jurisdiction: "SINGAPORE_CARBON_TAX",
      grossScope1Kg: 12000, // Singapore taxes Scope 1: allowance = 2,000 -> 10,000 kg - 5,000 offsets = 5,000 kg = 5 tons @ $25 = $125
      grossScope2Kg: 5000,
      grossScope3Kg: 20000,
    });

    expect(audit.netTaxableCo2Kg).toBe(5000);
    expect(audit.totalOffsetsAppliedKg).toBe(5000);
    expect(audit.estimatedTaxLiabilityUsd).toBe(125);
    expect(audit.complianceStatus).toBe("DEFICIT");
  });

  it("handles REST API endpoint POST /api/compliance/carbon-tax", async () => {
    const req = new NextRequest("http://localhost:3000/api/compliance/carbon-tax", {
      method: "POST",
      body: JSON.stringify({
        userId: `api_user_${Date.now()}`,
        organizationName: "Global Green Logistics",
        reportingYear: 2026,
        jurisdiction: "UK_ETS",
        grossScope1Kg: 15000,
        grossScope2Kg: 5000,
        grossScope3Kg: 0,
        offsetsToApplyKg: 12000,
      }),
    });

    const res = await carbonTaxHandler(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.audit.jurisdiction).toBe("UK_ETS");
  });
});
