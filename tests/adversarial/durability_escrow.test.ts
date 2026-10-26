import { describe, it, expect } from "vitest";
import {
  buildDurabilityEscrow,
  verifyPermanenceMilestone,
  triggerReversalSlashing,
} from "../../lib/durability_escrow";

describe("Biochar & DAC Carbon Durability Escrow Suite", () => {
  it("should initialize a 100-year biochar escrow with 10 tranches of 10-year intervals", () => {
    const escrow = buildDurabilityEscrow({
      projectId: "PROJ-BIOCHAR-FINLAND",
      removalType: "BIOCHAR",
      durabilityYears: 100,
      totalTonsLocked: 5000,
      totalEscrowTokens: 100000,
      milestoneIntervalYears: 10,
    });

    expect(escrow.escrowId).toMatch(/^ESCROW-BIOCHAR-[A-F0-9]{12}$/);
    expect(escrow.totalMilestones).toBe(10);
    expect(escrow.completedMilestones).toBe(0);
    expect(escrow.vestedTokens).toBe(0);
    expect(escrow.status).toBe("ACTIVE");
  });

  it("should reject escrow with durability under 20 years", () => {
    expect(() =>
      buildDurabilityEscrow({
        projectId: "PROJ-SHORT-TERM",
        removalType: "BIOCHAR",
        durabilityYears: 15,
        totalTonsLocked: 100,
        totalEscrowTokens: 1000,
        milestoneIntervalYears: 5,
      })
    ).toThrow("Durability permanence must be at least 20 years");
  });

  it("should release tranche tokens upon valid sensor attestation", () => {
    const escrow = buildDurabilityEscrow({
      projectId: "PROJ-DAC-ICELAND",
      removalType: "DAC",
      durabilityYears: 1000,
      totalTonsLocked: 10000,
      totalEscrowTokens: 500000,
      milestoneIntervalYears: 100,
    });

    const release1 = verifyPermanenceMilestone(escrow, {
      sensorHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      leakageDetected: false,
      verificationDate: new Date(),
    });

    // 500,000 / 10 = 50,000 per milestone
    expect(release1.tokensReleased).toBe(50000);
    expect(release1.remainingLockedTokens).toBe(450000);
    expect(release1.completedMilestones).toBe(1);
    expect(release1.isFullyVested).toBe(false);
    expect(escrow.status).toBe("VERIFIED");
  });

  it("should reject milestone verification if sensor detects leakage or reversal", () => {
    const escrow = buildDurabilityEscrow({
      projectId: "PROJ-DAC-01",
      removalType: "DAC",
      durabilityYears: 100,
      totalTonsLocked: 1000,
      totalEscrowTokens: 20000,
      milestoneIntervalYears: 10,
    });

    expect(() =>
      verifyPermanenceMilestone(escrow, {
        sensorHash: "a1b2c3d4",
        leakageDetected: true,
        verificationDate: new Date(),
      })
    ).toThrow("leakage or reversal detected");
  });

  it("should trigger slashing upon reversal, sending 90% to insurance and 10% bounty", () => {
    const escrow = buildDurabilityEscrow({
      projectId: "PROJ-BIOCHAR-FAIL",
      removalType: "BIOCHAR",
      durabilityYears: 50,
      totalTonsLocked: 1000,
      totalEscrowTokens: 10000,
      milestoneIntervalYears: 10, // 5 milestones of 2,000 tokens
    });

    // Vest milestone 1
    verifyPermanenceMilestone(escrow, {
      sensorHash: "telemetry_good_1",
      leakageDetected: false,
      verificationDate: new Date(),
    });
    // Vested: 2,000. Remaining unvested: 8,000.

    const slashResult = triggerReversalSlashing(
      escrow,
      "Catastrophic biomass combustion detected via Sentinel-2 satellite",
      "auditor_whistleblower"
    );

    expect(slashResult.slashedTokens).toBe(8000);
    expect(slashResult.insurancePoolAllocation).toBe(7200); // 90%
    expect(slashResult.slasherReward).toBe(800); // 10%
    expect(escrow.status).toBe("SLASHED");

    // Double slash should fail
    expect(() =>
      triggerReversalSlashing(escrow, "Second slash", "attacker")
    ).toThrow("Escrow has already been slashed");
  });
});
