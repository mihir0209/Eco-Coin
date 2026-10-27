import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateVrfSeedPair,
  calculateCandidateWeight,
  evaluateVrf,
  selectCandidateByEntropy,
  commitVrfLotteryRound,
  resolveVrfLottery,
} from "../../lib/vrf_sequestration_lottery";
import VrfSequestrationLottery, {
  IAuditorCandidate,
} from "../../models/VrfSequestrationLottery";

vi.mock("../../models/VrfSequestrationLottery", () => {
  const store = new Map<string, any>();
  return {
    default: {
      findOne: vi.fn(async (q: any) => {
        if (q.roundId && store.has(q.roundId)) {
          const doc = store.get(q.roundId);
          return {
            ...doc,
            save: vi.fn(async function () {
              store.set(this.roundId, { ...this });
              return this;
            }),
          };
        }
        return null;
      }),
      create: vi.fn(async (doc: any) => {
        const item = { ...doc, _id: "vrf_" + Math.random().toString(36).substring(7) };
        store.set(doc.roundId, item);
        return item;
      }),
      _clear: () => store.clear(),
    },
  };
});

describe("VRF-Seeded Sequestration Lottery & Auditor Selection", () => {
  beforeEach(() => {
    (VrfSequestrationLottery as any)._clear();
    vi.clearAllMocks();
  });

  const sampleCandidates: IAuditorCandidate[] = [
    {
      auditorId: "AUD-01",
      auditorName: "Verra Verified Inspector",
      stakedTokens: 10000,
      reputationScore: 95,
    },
    {
      auditorId: "AUD-02",
      auditorName: "Gold Standard Assayer",
      stakedTokens: 8000,
      reputationScore: 90,
    },
    {
      auditorId: "AUD-03-LOW-STAKE",
      auditorName: "Novice Auditor",
      stakedTokens: 500, // Below 1,000 threshold
      reputationScore: 80,
    },
  ];

  it("generates cryptographic VRF seed and valid SHA-256 commitment", () => {
    const { secretSeed, commitment } = generateVrfSeedPair();
    expect(secretSeed).toHaveLength(64);
    expect(commitment).toHaveLength(64);
  });

  it("enforces minimum stake thresholds and computes candidate weights", () => {
    const minStake = 1000;
    // AUD-01: 10,000 * 0.95 = 9,500
    expect(calculateCandidateWeight(sampleCandidates[0], minStake)).toBe(9500);
    // AUD-02: 8,000 * 0.90 = 7,200
    expect(calculateCandidateWeight(sampleCandidates[1], minStake)).toBe(7200);
    // AUD-03: stake 500 < minStake 1,000 => weight 0
    expect(calculateCandidateWeight(sampleCandidates[2], minStake)).toBe(0);
  });

  it("evaluates deterministic VRF entropy and proof", () => {
    const seed = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    const context = "ROUND-01:PROJECT-ALPHA";

    const eval1 = evaluateVrf(seed, context);
    const eval2 = evaluateVrf(seed, context);

    expect(eval1.entropy).toBeGreaterThanOrEqual(0);
    expect(eval1.entropy).toBeLessThan(1);
    expect(eval1.proof).toBe(eval2.proof);
    expect(eval1.entropy).toBe(eval2.entropy);
  });

  it("selects candidate reproducibly and excludes zero-weight candidates", () => {
    const minStake = 1000;
    // Low entropy should select AUD-01 (weight 9,500 / 16,700 = 56.8%)
    const resLow = selectCandidateByEntropy(sampleCandidates, minStake, 0.1);
    expect(resLow.selected.auditorId).toBe("AUD-01");

    // Higher entropy should select AUD-02
    const resHigh = selectCandidateByEntropy(sampleCandidates, minStake, 0.8);
    expect(resHigh.selected.auditorId).toBe("AUD-02");
  });

  it("throws if no candidates meet minimum stake requirement", () => {
    expect(() =>
      selectCandidateByEntropy(sampleCandidates, 50000, 0.5)
    ).toThrow("No eligible auditor candidates meet the minimum stake threshold");
  });

  it("commits and resolves a lottery round end-to-end", async () => {
    const { secretSeed, commitment } = generateVrfSeedPair();
    const roundId = "RND-2026-X1";

    const committed = await commitVrfLotteryRound({
      roundId,
      projectId: "PRJ-AMAZON-REFOREST-09",
      vrfSeedCommitment: commitment,
      minStakeRequired: 1000,
      candidates: sampleCandidates,
    });

    expect(committed.status).toBe("COMMITTED");

    // Resolve round
    const resolution = await resolveVrfLottery({
      roundId,
      revealedVrfSeed: secretSeed,
    });

    expect(resolution.roundId).toBe(roundId);
    expect(["AUD-01", "AUD-02"]).toContain(resolution.selectedAuditorId);
    expect(resolution.eligibleCandidatesCount).toBe(2);
    expect(resolution.selectionProof).toBeDefined();
  });

  it("rejects resolution if revealed seed does not match commitment", async () => {
    const { commitment } = generateVrfSeedPair();
    const roundId = "RND-2026-X2";

    await commitVrfLotteryRound({
      roundId,
      projectId: "PRJ-MANGROVE-01",
      vrfSeedCommitment: commitment,
      minStakeRequired: 1000,
      candidates: sampleCandidates,
    });

    // Attempt resolution with fraudulent / forged seed
    const fraudulentSeed = "0000000000000000000000000000000000000000000000000000000000000000";
    await expect(
      resolveVrfLottery({
        roundId,
        revealedVrfSeed: fraudulentSeed,
      })
    ).rejects.toThrow("Revealed VRF seed does not match the committed hash");
  });

  it("prevents double-resolution of an already resolved lottery", async () => {
    const { secretSeed, commitment } = generateVrfSeedPair();
    const roundId = "RND-2026-X3";

    await commitVrfLotteryRound({
      roundId,
      projectId: "PRJ-DIRECT-AIR-CAPTURE-04",
      vrfSeedCommitment: commitment,
      minStakeRequired: 1000,
      candidates: sampleCandidates,
    });

    await resolveVrfLottery({ roundId, revealedVrfSeed: secretSeed });

    // Second resolution must fail
    await expect(
      resolveVrfLottery({ roundId, revealedVrfSeed: secretSeed })
    ).rejects.toThrow("already resolved");
  });
});
