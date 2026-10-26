import { describe, it, expect } from "vitest";
import {
  calculateCascadingScope3,
  detectCycles,
  computeNodeHash,
  buildSupplyChainMerkleRoot,
  SupplyChainNodeInput,
} from "../../lib/tier_n_emissions";

describe("Scope 3 Tier-N Cascading Supply Chain Emissions Ledger Suite", () => {
  it("should calculate cascading emissions accurately across 3 tiers", () => {
    // Network:
    // OEM (direct: 100) -> Tier 1 (direct: 50, 50% allocation)
    // Tier 1 -> Tier 2 (direct: 80, 25% allocation to T1)
    const network = new Map<string, SupplyChainNodeInput>([
      [
        "OEM-CORP",
        {
          nodeId: "OEM-CORP",
          entityName: "Global Auto OEM",
          tierLevel: 0,
          directEmissionsMt: 100,
          upstreamSuppliers: [
            { supplierNodeId: "T1-BATTERY", allocationPercentage: 50, reportedEmissionsMt: 50 },
          ],
        },
      ],
      [
        "T1-BATTERY",
        {
          nodeId: "T1-BATTERY",
          entityName: "Tier-1 Battery Manufacturer",
          tierLevel: 1,
          directEmissionsMt: 50,
          upstreamSuppliers: [
            { supplierNodeId: "T2-LITHIUM", allocationPercentage: 25, reportedEmissionsMt: 80 },
          ],
        },
      ],
      [
        "T2-LITHIUM",
        {
          nodeId: "T2-LITHIUM",
          entityName: "Tier-2 Lithium Refiner",
          tierLevel: 2,
          directEmissionsMt: 80,
          upstreamSuppliers: [],
        },
      ],
    ]);

    const result = calculateCascadingScope3("OEM-CORP", network);

    // T1 allocation: 50 * 0.50 = 25 MT
    // T2 allocation: 80 * (0.50 * 0.25 = 0.125) = 10 MT
    // Total Scope 3 = 35 MT
    expect(result.totalScope3Mt).toBe(35);
    expect(result.totalFootprintMt).toBe(135);
    expect(result.provenanceBreakdown).toHaveLength(2);
    expect(result.provenanceBreakdown[0].nodeId).toBe("T1-BATTERY");
    expect(result.provenanceBreakdown[0].allocatedMt).toBe(25);
    expect(result.provenanceBreakdown[1].nodeId).toBe("T2-LITHIUM");
    expect(result.provenanceBreakdown[1].allocatedMt).toBe(10);
  });

  it("should detect and reject circular supplier subcontracting cycles", () => {
    // A -> B -> C -> A
    const circularNetwork = new Map<string, SupplyChainNodeInput>([
      [
        "NODE-A",
        {
          nodeId: "NODE-A",
          entityName: "Company A",
          tierLevel: 0,
          directEmissionsMt: 10,
          upstreamSuppliers: [{ supplierNodeId: "NODE-B", allocationPercentage: 100, reportedEmissionsMt: 20 }],
        },
      ],
      [
        "NODE-B",
        {
          nodeId: "NODE-B",
          entityName: "Company B",
          tierLevel: 1,
          directEmissionsMt: 20,
          upstreamSuppliers: [{ supplierNodeId: "NODE-C", allocationPercentage: 100, reportedEmissionsMt: 30 }],
        },
      ],
      [
        "NODE-C",
        {
          nodeId: "NODE-C",
          entityName: "Company C",
          tierLevel: 2,
          directEmissionsMt: 30,
          upstreamSuppliers: [{ supplierNodeId: "NODE-A", allocationPercentage: 100, reportedEmissionsMt: 10 }],
        },
      ],
    ]);

    expect(detectCycles(circularNetwork)).toBe(true);
    expect(() => calculateCascadingScope3("NODE-A", circularNetwork)).toThrow(
      "Circular supply chain dependency detected"
    );
  });

  it("should reject calculations if target node is missing from network", () => {
    const emptyNetwork = new Map<string, SupplyChainNodeInput>();
    expect(() => calculateCascadingScope3("MISSING-OEM", emptyNetwork)).toThrow(
      "Target node MISSING-OEM not found"
    );
  });

  it("should compute verifiable Merkle root from provenance breakdown", () => {
    const breakdown = [
      { nodeId: "T1-BATTERY", allocatedMt: 25 },
      { nodeId: "T2-LITHIUM", allocatedMt: 10 },
    ];
    const root1 = buildSupplyChainMerkleRoot(breakdown);
    const root2 = buildSupplyChainMerkleRoot(breakdown);
    expect(root1).toBe(root2);
    expect(root1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should compute tamper-evident hash for supply chain node", () => {
    const node: SupplyChainNodeInput = {
      nodeId: "NODE-X",
      entityName: "Steel Foundry",
      tierLevel: 1,
      directEmissionsMt: 500,
      upstreamSuppliers: [{ supplierNodeId: "MINE-Y", allocationPercentage: 80, reportedEmissionsMt: 200 }],
    };
    const hash = computeNodeHash(node, 160);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
