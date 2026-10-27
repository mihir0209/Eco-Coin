import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeActionId,
  queueGovernanceAction,
  executeGovernanceAction,
  vetoGovernanceAction,
  MINIMUM_TIMELOCK_DELAY_SEC,
} from "../../lib/governance_timelock";
import GovernanceTimelock from "../../models/GovernanceTimelock";

vi.mock("../../models/GovernanceTimelock", () => {
  const store = new Map<string, any>();
  return {
    default: {
      findOne: vi.fn(async (q: any) => {
        if (q.actionId && store.has(q.actionId)) {
          const doc = store.get(q.actionId);
          return {
            ...doc,
            save: vi.fn(async function () {
              store.set(this.actionId, { ...this });
              return this;
            }),
          };
        }
        return null;
      }),
      create: vi.fn(async (doc: any) => {
        const item = { ...doc, _id: "time_" + Math.random().toString(36).substring(7) };
        store.set(doc.actionId, item);
        return item;
      }),
      _set: (id: string, doc: any) => store.set(id, doc),
      _clear: () => store.clear(),
    },
  };
});

describe("Multi-Sig Governance Timelock & Veto Controller", () => {
  beforeEach(() => {
    (GovernanceTimelock as any)._clear();
    vi.clearAllMocks();
  });

  it("computes deterministic SHA-256 action IDs", () => {
    const id1 = computeActionId("0xCarbonTreasury", "mint(address,uint256)", { to: "0xAdmin", amount: 1000 }, 1800000);
    const id2 = computeActionId("0xCarbonTreasury", "mint(address,uint256)", { to: "0xAdmin", amount: 1000 }, 1800000);
    const id3 = computeActionId("0xCarbonTreasury", "mint(address,uint256)", { to: "0xAdmin", amount: 2000 }, 1800000);

    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1).toHaveLength(64);
  });

  it("enforces minimum timelock delay requirement upon queuing", async () => {
    // Attempting to queue with only 300 seconds delay (< 3600s minimum)
    await expect(
      queueGovernanceAction({
        targetContract: "0xCarbonTreasury",
        actionSignature: "setFee(uint256)",
        payloadParams: { feeBps: 50 },
        proposer: "0xProposer01",
        delaySeconds: 300,
      })
    ).rejects.toThrow("below required minimum");
  });

  it("queues valid proposal with correct ETA and QUEUED status", async () => {
    const doc = await queueGovernanceAction({
      targetContract: "0xCarbonTreasury",
      actionSignature: "upgradeBridge(address)",
      payloadParams: { newBridge: "0xNewBridgeV2" },
      proposer: "0xProposer01",
      delaySeconds: 7200,
    });

    expect(doc.status).toBe("QUEUED");
    expect(doc.actionId).toBeDefined();
    expect(doc.eta.getTime()).toBeGreaterThan(Date.now() + 7000 * 1000);
  });

  it("denies premature execution before ETA expires", async () => {
    const futureEta = new Date(Date.now() + 3600 * 1000);
    (GovernanceTimelock as any)._set("action-premature", {
      actionId: "action-premature",
      targetContract: "0xCarbonTreasury",
      actionSignature: "drain()",
      payloadParams: {},
      proposer: "0xAttacker",
      eta: futureEta,
      delaySeconds: 3600,
      gracePeriodSeconds: 86400,
      status: "QUEUED",
    });

    await expect(
      executeGovernanceAction("action-premature", "0xAttacker")
    ).rejects.toThrow("Timelock has not expired yet");
  });

  it("executes valid transaction once ETA is reached", async () => {
    const pastEta = new Date(Date.now() - 1000); // 1 second ago
    (GovernanceTimelock as any)._set("action-ready", {
      actionId: "action-ready",
      targetContract: "0xCarbonTreasury",
      actionSignature: "setRewardRate(uint256)",
      payloadParams: { rate: 100 },
      proposer: "0xProposer",
      eta: pastEta,
      delaySeconds: 3600,
      gracePeriodSeconds: 86400,
      status: "QUEUED",
    });

    const result = await executeGovernanceAction("action-ready", "0xExecutor");
    expect(result.status).toBe("EXECUTED");
    expect(result.executedBy).toBe("0xExecutor");
    expect(result.executedAt).toBeDefined();
  });

  it("marks action EXPIRED if attempted after grace period", async () => {
    const staleEta = new Date(Date.now() - 90000 * 1000); // Beyond 86400s grace
    (GovernanceTimelock as any)._set("action-stale", {
      actionId: "action-stale",
      targetContract: "0xCarbonTreasury",
      actionSignature: "emergencyWithdraw()",
      payloadParams: {},
      proposer: "0xProposer",
      eta: staleEta,
      delaySeconds: 3600,
      gracePeriodSeconds: 86400,
      status: "QUEUED",
    });

    await expect(
      executeGovernanceAction("action-stale", "0xExecutor")
    ).rejects.toThrow("expired past the grace period");
  });

  it("allows Security Council to veto malicious queued proposals", async () => {
    (GovernanceTimelock as any)._set("action-malicious", {
      actionId: "action-malicious",
      targetContract: "0xCarbonTreasury",
      actionSignature: "setOwner(address)",
      payloadParams: { newOwner: "0xRogueActor" },
      proposer: "0xCompromisedKey",
      eta: new Date(Date.now() + 100000),
      delaySeconds: 3600,
      gracePeriodSeconds: 86400,
      status: "QUEUED",
    });

    const vetoed = await vetoGovernanceAction(
      "action-malicious",
      "0xSecurityCouncilMultisig",
      "Compromised proposal key identified"
    );

    expect(vetoed.status).toBe("VETOED");
    expect(vetoed.vetoedBy).toBe("0xSecurityCouncilMultisig");
    expect(vetoed.vetoReason).toContain("Compromised proposal key");

    // Once vetoed, cannot be executed
    await expect(
      executeGovernanceAction("action-malicious", "0xAnyone")
    ).rejects.toThrow("cannot be executed");
  });
});
