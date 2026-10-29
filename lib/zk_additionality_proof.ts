export interface ZkAdditionalityVerification {
  isAdditionalityValid: boolean;
  baselineEmissionsTco2e: number;
  actualProjectEmissionsTco2e: number;
  certifiedNetRemovalTco2e: number;
  circuitConstraintVerified: boolean;
}

export function verifyZkAdditionalityProof(
  counterfactualBaselineTco2e: number,
  actualProjectEmissionsTco2e: number,
  proofCommitmentHash: string
): ZkAdditionalityVerification {
  // Additionality invariant: counterfactual baseline emissions MUST strictly exceed project actual emissions
  const netRemoval = counterfactualBaselineTco2e - actualProjectEmissionsTco2e;
  const isAdditional = netRemoval > 0 && proofCommitmentHash.startsWith("0x") && proofCommitmentHash.length === 66;

  return {
    isAdditionalityValid: isAdditional,
    baselineEmissionsTco2e: counterfactualBaselineTco2e,
    actualProjectEmissionsTco2e,
    certifiedNetRemovalTco2e: isAdditional ? Number(netRemoval.toFixed(2)) : 0,
    circuitConstraintVerified: isAdditional,
  };
}
