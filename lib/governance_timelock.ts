import crypto from "crypto";
import GovernanceTimelock, {
  IGovernanceTimelock,
} from "../models/GovernanceTimelock";

export interface QueueTransactionInput {
  targetContract: string;
  actionSignature: string;
  payloadParams: any;
  proposer: string;
  delaySeconds: number; // Must be >= MIN_DELAY
  gracePeriodSeconds?: number;
}

export const MINIMUM_TIMELOCK_DELAY_SEC = 3600; // 1 hour minimum delay

/**
 * Generate a deterministic actionId hash from target, signature, payload, and ETA.
 */
export function computeActionId(
  targetContract: string,
  actionSignature: string,
  payloadParams: any,
  etaEpochSec: number
): string {
  const serialized = `${targetContract}:${actionSignature}:${JSON.stringify(payloadParams)}:${etaEpochSec}`;
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

/**
 * Queue a new governance transaction with a timelock delay.
 */
export async function queueGovernanceAction(
  input: QueueTransactionInput
): Promise<IGovernanceTimelock> {
  if (input.delaySeconds < MINIMUM_TIMELOCK_DELAY_SEC) {
    throw new Error(
      `Timelock delay (${input.delaySeconds}s) is below required minimum (${MINIMUM_TIMELOCK_DELAY_SEC}s)`
    );
  }

  const now = Date.now();
  const etaTime = now + input.delaySeconds * 1000;
  const etaEpochSec = Math.floor(etaTime / 1000);

  const actionId = computeActionId(
    input.targetContract,
    input.actionSignature,
    input.payloadParams,
    etaEpochSec
  );

  return await GovernanceTimelock.create({
    actionId,
    targetContract: input.targetContract,
    actionSignature: input.actionSignature,
    payloadParams: input.payloadParams,
    proposer: input.proposer,
    proposedAt: new Date(now),
    eta: new Date(etaTime),
    delaySeconds: input.delaySeconds,
    gracePeriodSeconds: input.gracePeriodSeconds || 86400,
    status: "QUEUED",
  });
}

/**
 * Execute a queued timelocked transaction once the delay has passed.
 */
export async function executeGovernanceAction(
  actionId: string,
  caller: string
): Promise<IGovernanceTimelock> {
  const action = await GovernanceTimelock.findOne({ actionId });
  if (!action) {
    throw new Error(`Governance action ${actionId} not found`);
  }

  if (action.status !== "QUEUED") {
    throw new Error(`Action ${actionId} cannot be executed; current status: ${action.status}`);
  }

  const now = new Date();

  // 1. Time Lock Check: Must not execute before ETA
  if (now < action.eta) {
    throw new Error(`Timelock has not expired yet (ETA: ${action.eta.toISOString()})`);
  }

  // 2. Grace Period Check: Must not execute after ETA + Grace Period
  const expirationTime = new Date(action.eta.getTime() + action.gracePeriodSeconds * 1000);
  if (now > expirationTime) {
    action.status = "EXPIRED";
    await action.save();
    throw new Error(`Action ${actionId} has expired past the grace period`);
  }

  action.status = "EXECUTED";
  action.executedBy = caller;
  action.executedAt = now;
  await action.save();

  return action;
}

/**
 * Security Council Emergency Veto: Immediately cancels any malicious queued proposal.
 */
export async function vetoGovernanceAction(
  actionId: string,
  vetoer: string,
  reason: string
): Promise<IGovernanceTimelock> {
  const action = await GovernanceTimelock.findOne({ actionId });
  if (!action) {
    throw new Error(`Governance action ${actionId} not found`);
  }

  if (action.status !== "QUEUED") {
    throw new Error(`Action ${actionId} cannot be vetoed; current status: ${action.status}`);
  }

  action.status = "VETOED";
  action.vetoedBy = vetoer;
  action.vetoReason = reason;
  await action.save();

  return action;
}
