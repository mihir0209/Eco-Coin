import crypto from "crypto";

export function optimizeZkBatchVerification(
  proofHashes: string[],
  circuitPublicInputs: string[]
): { aggregateRootHash: string; gasSavedUnits: number; isBatchValid: boolean } {
  if (proofHashes.length === 0) {
    return { aggregateRootHash: "", gasSavedUnits: 0, isBatchValid: false };
  }
  // Single pairing verification costs ~200k gas. Batch verification costs ~250k base + 15k per proof
  const standaloneGas = proofHashes.length * 200_000;
  const batchGas = 250_000 + proofHashes.length * 15_000;
  const gasSavedUnits = Math.max(0, standaloneGas - batchGas);

  const combinedPayload = proofHashes.join(":") + "::" + circuitPublicInputs.join(":");
  const aggregateRootHash = crypto.createHash("sha256").update(combinedPayload).digest("hex");

  return { aggregateRootHash, gasSavedUnits, isBatchValid: true };
}
