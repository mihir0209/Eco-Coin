import crypto from "crypto";

export function generateBatchCommitment(
  projectId: string,
  serialNumber: string,
  vintage: number,
  secretSalt: string
): string {
  const payload = `${projectId}:${serialNumber}:${vintage}:${secretSalt}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function verifyProvenanceCommitment(
  projectId: string,
  serialNumber: string,
  vintage: number,
  secretSalt: string,
  expectedCommitment: string
): boolean {
  const computed = generateBatchCommitment(projectId, serialNumber, vintage, secretSalt);
  return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(expectedCommitment, "hex"));
}
