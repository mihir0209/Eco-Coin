import { describe, it, expect } from "vitest";
import {
  createHashLock,
  verifyPreimage,
  buildHtlcEscrow,
  claimHtlcRecord,
  refundHtlcRecord,
  InitiateEscrowParams,
} from "../../lib/htlc_atomic_swap";

describe("Cross-Chain HTLC Atomic Swap Carbon Credit Escrow Suite", () => {
  const secretPreimage = "super_confidential_cross_chain_secret_preimage_2026_xyz";
  const validHashLock = createHashLock(secretPreimage);

  const baseParams: InitiateEscrowParams = {
    escrowId: "HTLC-ESCROW-2026-CC01",
    sender: "0xSenderCorporateVault9988",
    recipient: "0xRecipientRenewableEnergy1122",
    amount: 500.0,
    hashLock: validHashLock,
    timeLock: new Date(Date.now() + 3600 * 1000), // 1 hour in future
    chain: "ECOCOIN-MAINNET",
    counterpartyChain: "ETH-CARBON-BRIDGE",
  };

  // 1. Unit Tests
  describe("Unit Tests: Cryptographic Hash Lock & Validation", () => {
    it("should deterministically generate SHA-256 hash lock", () => {
      const lock1 = createHashLock("test_secret_123");
      const lock2 = createHashLock("test_secret_123");
      expect(lock1).toBe(lock2);
      expect(lock1.length).toBe(64);
    });

    it("should verify correct preimage and reject corrupted preimage", () => {
      expect(verifyPreimage(secretPreimage, validHashLock)).toBe(true);
      expect(verifyPreimage("wrong_preimage_attempt", validHashLock)).toBe(false);
      expect(verifyPreimage("", validHashLock)).toBe(false);
    });

    it("should initialize valid HTLC escrow record in ACTIVE state", () => {
      const escrow = buildHtlcEscrow(baseParams);
      expect(escrow.escrowId).toBe("HTLC-ESCROW-2026-CC01");
      expect(escrow.amount).toBe(500.0);
      expect(escrow.state).toBe("ACTIVE");
      expect(escrow.preimage).toBeUndefined();
      expect(escrow.claimedAt).toBeUndefined();
      expect(escrow.refundedAt).toBeUndefined();
    });

    it("should reject escrow with zero or negative carbon amount", () => {
      expect(() => buildHtlcEscrow({ ...baseParams, amount: 0 })).toThrow(
        "Escrow carbon amount must be a positive finite number"
      );
      expect(() => buildHtlcEscrow({ ...baseParams, amount: -25 })).toThrow(
        "Escrow carbon amount must be a positive finite number"
      );
    });

    it("should reject escrow with expired or invalid past timelock", () => {
      const pastDate = new Date(Date.now() - 1000);
      expect(() => buildHtlcEscrow({ ...baseParams, timeLock: pastDate })).toThrow(
        "Timelock must be a valid future Date"
      );
    });

    it("should reject escrow with malformed hash lock length or format", () => {
      expect(() => buildHtlcEscrow({ ...baseParams, hashLock: "invalid_short_hash" })).toThrow(
        "Hashlock must be a 64-character hexadecimal SHA-256 string"
      );
    });
  });

  // 2. Integration Tests: Atomic Claim & Refund Lifecycle
  describe("Integration Tests: Escrow Settlement & Time-Lock Enforcement", () => {
    it("should successfully claim escrow before timelock using valid preimage", () => {
      const escrow = buildHtlcEscrow(baseParams);
      const claimTime = new Date(Date.now() + 60 * 1000); // 1 min later
      const claimed = claimHtlcRecord(escrow, secretPreimage, baseParams.recipient, claimTime);

      expect(claimed.state).toBe("CLAIMED");
      expect(claimed.preimage).toBe(secretPreimage);
      expect(claimed.claimedAt).toEqual(claimTime);
    });

    it("should successfully refund escrow after timelock expiration by original sender", () => {
      const escrow = buildHtlcEscrow(baseParams);
      const refundTime = new Date(escrow.timeLock.getTime() + 1000); // 1s past timelock
      const refunded = refundHtlcRecord(escrow, baseParams.sender, refundTime);

      expect(refunded.state).toBe("REFUNDED");
      expect(refunded.refundedAt).toEqual(refundTime);
    });

    it("should prevent premature refund when timelock is still active", () => {
      const escrow = buildHtlcEscrow(baseParams);
      const prematureTime = new Date(escrow.timeLock.getTime() - 10000); // 10s before timelock

      expect(() => refundHtlcRecord(escrow, baseParams.sender, prematureTime)).toThrow(
        /Timelock active: cannot refund prior to expiration/
      );
    });

    it("should prevent claim after timelock expiration", () => {
      const escrow = buildHtlcEscrow(baseParams);
      const expiredTime = new Date(escrow.timeLock.getTime() + 1000); // 1s past timelock

      expect(() => claimHtlcRecord(escrow, secretPreimage, baseParams.recipient, expiredTime)).toThrow(
        "Timelock expired: escrow can no longer be claimed, eligible for refund only"
      );
    });
  });

  // 3. Regression & Adversarial Tests: Unauthorized Callers & Double Actions
  describe("Regression & Adversarial Tests: Security Boundaries & Attack Defense", () => {
    it("should reject claim attempt by unauthorized third-party attacker", () => {
      const escrow = buildHtlcEscrow(baseParams);
      const claimTime = new Date(Date.now() + 60 * 1000);

      expect(() =>
        claimHtlcRecord(escrow, secretPreimage, "0xAttackerSnifferAgent666", claimTime)
      ).toThrow(/Unauthorized caller/);
    });

    it("should reject refund attempt by unauthorized third-party attacker", () => {
      const escrow = buildHtlcEscrow(baseParams);
      const refundTime = new Date(escrow.timeLock.getTime() + 1000);

      expect(() =>
        refundHtlcRecord(escrow, "0xAttackerSnifferAgent666", refundTime)
      ).toThrow(/Unauthorized caller/);
    });

    it("should reject claim with incorrect or guessed preimage", () => {
      const escrow = buildHtlcEscrow(baseParams);
      const claimTime = new Date(Date.now() + 60 * 1000);

      expect(() =>
        claimHtlcRecord(escrow, "brute_force_guess_attempt", baseParams.recipient, claimTime)
      ).toThrow("Cryptographic verification failed: invalid secret preimage for hash lock");
    });

    it("should prevent double-claim attacks on already claimed escrow", () => {
      const escrow = buildHtlcEscrow(baseParams);
      const claimTime = new Date(Date.now() + 60 * 1000);
      const claimed = claimHtlcRecord(escrow, secretPreimage, baseParams.recipient, claimTime);

      expect(() =>
        claimHtlcRecord(claimed, secretPreimage, baseParams.recipient, claimTime)
      ).toThrow("Escrow is already CLAIMED, cannot claim");
    });

    it("should prevent refund attacks on already claimed escrow", () => {
      const escrow = buildHtlcEscrow(baseParams);
      const claimTime = new Date(Date.now() + 60 * 1000);
      const claimed = claimHtlcRecord(escrow, secretPreimage, baseParams.recipient, claimTime);
      const refundTime = new Date(escrow.timeLock.getTime() + 1000);

      expect(() =>
        refundHtlcRecord(claimed, baseParams.sender, refundTime)
      ).toThrow("Escrow is already CLAIMED, cannot refund");
    });
  });
});
