export interface NullifierSieveResult {
  isDoubleCountingDetected: boolean;
  certificateSerialNumber: string;
  retirementRegistry: string;
  nullifierHash: string;
}

export function sieveCarbonRetirementNullifier(
  certificateSerial: string,
  targetRegistry: string,
  existingRetiredNullifiers: Set<string>
): NullifierSieveResult {
  import hashlib = require("crypto");
  const nullifier = "0x" + hashlib.createHash("sha256").update(`${certificateSerial}:${targetRegistry}`).digest("hex");
  const isDuplicate = existingRetiredNullifiers.has(nullifier);

  return {
    isDoubleCountingDetected: isDuplicate,
    certificateSerialNumber: certificateSerial,
    retirementRegistry: targetRegistry,
    nullifierHash: nullifier,
  };
}
