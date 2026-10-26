import crypto from "crypto";
import { ITierNEmissionNode, IUpstreamLink } from "@/models/TierNEmissionNode";

export interface SupplyChainNodeInput {
  nodeId: string;
  entityName: string;
  tierLevel: number;
  upstreamSuppliers: IUpstreamLink[];
  directEmissionsMt: number;
}

export function computeNodeHash(node: SupplyChainNodeInput, cumulativeScope3: number): string {
  const upstreamSerialized = node.upstreamSuppliers
    .map((u) => `${u.supplierNodeId}:${u.allocationPercentage}:${u.reportedEmissionsMt}`)
    .sort()
    .join("|");
  return crypto
    .createHash("sha256")
    .update(
      `${node.nodeId}:${node.entityName}:${node.tierLevel}:${node.directEmissionsMt}:${cumulativeScope3}:${upstreamSerialized}`
    )
    .digest("hex");
}

export function detectCycles(nodes: Map<string, SupplyChainNodeInput>): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(curr: string): boolean {
    visited.add(curr);
    recStack.add(curr);

    const node = nodes.get(curr);
    if (node) {
      for (const link of node.upstreamSuppliers) {
        if (!visited.has(link.supplierNodeId)) {
          if (dfs(link.supplierNodeId)) return true;
        } else if (recStack.has(link.supplierNodeId)) {
          return true; // Cycle detected
        }
      }
    }

    recStack.delete(curr);
    return false;
  }

  for (const nodeId of nodes.keys()) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) return true;
    }
  }
  return false;
}

export function calculateCascadingScope3(
  targetNodeId: string,
  network: Map<string, SupplyChainNodeInput>
): {
  totalScope3Mt: number;
  totalFootprintMt: number;
  provenanceBreakdown: Array<{ nodeId: string; tier: number; allocatedMt: number }>;
} {
  if (detectCycles(network)) {
    throw new Error("Circular supply chain dependency detected: illegal cycle in emissions DAG");
  }

  const target = network.get(targetNodeId);
  if (!target) {
    throw new Error(`Target node ${targetNodeId} not found in supply chain network`);
  }

  let totalScope3 = 0;
  const breakdown: Array<{ nodeId: string; tier: number; allocatedMt: number }> = [];

  function traverse(nodeId: string, factor: number) {
    const node = network.get(nodeId);
    if (!node) return;

    for (const link of node.upstreamSuppliers) {
      const supplier = network.get(link.supplierNodeId);
      const supplierDirect = supplier ? supplier.directEmissionsMt : link.reportedEmissionsMt;
      const effectiveFactor = factor * (link.allocationPercentage / 100);
      const allocatedDirect = supplierDirect * effectiveFactor;

      totalScope3 += allocatedDirect;
      breakdown.push({
        nodeId: link.supplierNodeId,
        tier: supplier ? supplier.tierLevel : node.tierLevel + 1,
        allocatedMt: parseFloat(allocatedDirect.toFixed(4)),
      });

      if (supplier && supplier.upstreamSuppliers.length > 0) {
        traverse(link.supplierNodeId, effectiveFactor);
      }
    }
  }

  traverse(targetNodeId, 1.0);

  const roundedScope3 = parseFloat(totalScope3.toFixed(4));
  return {
    totalScope3Mt: roundedScope3,
    totalFootprintMt: parseFloat((target.directEmissionsMt + roundedScope3).toFixed(4)),
    provenanceBreakdown: breakdown,
  };
}

export function buildSupplyChainMerkleRoot(breakdown: Array<{ nodeId: string; allocatedMt: number }>): string {
  if (breakdown.length === 0) {
    return crypto.createHash("sha256").update("EMPTY_SUPPLY_CHAIN").digest("hex");
  }

  let leaves = breakdown.map((item) =>
    crypto.createHash("sha256").update(`${item.nodeId}:${item.allocatedMt}`).digest("hex")
  );

  while (leaves.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < leaves.length; i += 2) {
      if (i + 1 < leaves.length) {
        next.push(crypto.createHash("sha256").update(leaves[i] + leaves[i + 1]).digest("hex"));
      } else {
        next.push(leaves[i]);
      }
    }
    leaves = next;
  }
  return leaves[0];
}
