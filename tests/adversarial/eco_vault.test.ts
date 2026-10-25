import { describe, it, expect, beforeAll, afterAll } from "vitest";
import connectDB, { disconnectDB } from "@/lib/mongodb";
import User from "@/models/User";
import EcoVault from "@/models/EcoVault";
import Transaction from "@/models/Transaction";
import {
  createEcoVault,
  investInVault,
  releaseVaultTranche,
  computeOracleAttestationHash,
} from "@/lib/eco_vault";
import { POST as createVaultHandler } from "@/app/api/vault/create/route";
import { POST as releaseTrancheHandler } from "@/app/api/vault/tranche/release/route";
import { NextRequest } from "next/server";

describe("Adversarial Decentralized Green Bond & Eco-Yield Vault Suite", () => {
  beforeAll(async () => {
    await connectDB();
    await User.init();
    await EcoVault.init();
    await Transaction.init();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it("creates green bond vault with milestone tranches totaling 100%", async () => {
    const creator = await User.create({
      name: "Solar Energy Project Ltd",
      email: `creator_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 0,
    });

    const vaultId = `VAULT-SOLAR-${Date.now()}`;
    const vault = await createEcoVault({
      vaultId,
      creatorId: creator._id.toString(),
      projectName: "Atacama Desert Solar Grid 50MW",
      targetFundingEcoCoins: 1000,
      yieldRateApy: 9.5,
      tranches: [
        { releasePercentage: 30, milestoneDescription: "Land clearing and inverter foundation" },
        { releasePercentage: 40, milestoneDescription: "Photovoltaic panel mounting & wiring" },
        { releasePercentage: 30, milestoneDescription: "Grid intertie & commercial operation" },
      ],
    });

    expect(vault.vaultId).toBe(vaultId);
    expect(vault.status).toBe("FUNDING");
    expect(vault.tranches.length).toBe(3);
    expect(vault.tranches[0].amountEcoCoins).toBe(300);
    expect(vault.tranches[1].amountEcoCoins).toBe(400);
    expect(vault.tranches[2].amountEcoCoins).toBe(300);
  });

  it("adversarial: rejects vault creation if tranches do not sum to 100%", async () => {
    await expect(
      createEcoVault({
        vaultId: `BAD-VAULT-${Date.now()}`,
        creatorId: "user_mock",
        projectName: "Flawed Vault",
        targetFundingEcoCoins: 500,
        yieldRateApy: 5.0,
        tranches: [
          { releasePercentage: 40, milestoneDescription: "Phase 1" },
          { releasePercentage: 40, milestoneDescription: "Phase 2" }, // Sum is 80%
        ],
      })
    ).rejects.toThrow(/percentages must sum to exactly 100%/);
  });

  it("enforces funding threshold transition from FUNDING to ACTIVE", async () => {
    const creator = await User.create({
      name: "Wind Power Dev",
      email: `wind_creator_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 0,
    });

    const investor = await User.create({
      name: "Green Yield Investor",
      email: `investor_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 2000,
    });

    const vaultId = `VAULT-WIND-${Date.now()}`;
    await createEcoVault({
      vaultId,
      creatorId: creator._id.toString(),
      projectName: "North Sea Offshore Wind Phase II",
      targetFundingEcoCoins: 500,
      yieldRateApy: 11.0,
      tranches: [{ releasePercentage: 100, milestoneDescription: "Turbine installation" }],
    });

    // Over-funding check
    await expect(
      investInVault({
        vaultId,
        investorId: investor._id.toString(),
        amount: 600, // target is 500
      })
    ).rejects.toThrow(/exceeds remaining target/);

    // Exact funding
    const updatedVault = await investInVault({
      vaultId,
      investorId: investor._id.toString(),
      amount: 500,
    });

    expect(updatedVault.fundedEcoCoins).toBe(500);
    expect(updatedVault.status).toBe("ACTIVE");

    const updatedInvestor = await User.findById(investor._id);
    expect(updatedInvestor?.totalEcoCoins).toBe(1500);
  });

  it("adversarial: strictly guards milestone sequential order and oracle attestation", async () => {
    const creator = await User.create({
      name: "BioGas Corp",
      email: `biogas_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 0,
    });

    const investor = await User.create({
      name: "Impact Investor",
      email: `impact_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 1000,
    });

    const vaultId = `VAULT-BIOGAS-${Date.now()}`;
    await createEcoVault({
      vaultId,
      creatorId: creator._id.toString(),
      projectName: "Agricultural Waste Bio-Digester",
      targetFundingEcoCoins: 300,
      yieldRateApy: 8.0,
      tranches: [
        { releasePercentage: 50, milestoneDescription: "Fermentation Tank Assembly" },
        { releasePercentage: 50, milestoneDescription: "Methane Capture Scrubbing" },
      ],
    });

    await investInVault({
      vaultId,
      investorId: investor._id.toString(),
      amount: 300,
    });

    // Adversarial: Attempting to release Tranche 2 before Tranche 1
    await expect(
      releaseVaultTranche({
        vaultId,
        trancheNumber: 2,
        oracleSecretKey: "super_secret_oracle_key_12345",
        milestoneEvidence: "Sensors online and producing biogas",
      })
    ).rejects.toThrow(/Prerequisite Tranche #1 has not been completed/);

    // Release Tranche 1 with valid oracle
    const v1 = await releaseVaultTranche({
      vaultId,
      trancheNumber: 1,
      oracleSecretKey: "super_secret_oracle_key_12345",
      milestoneEvidence: "Structural concrete verified by drone inspection",
    });

    expect(v1.tranches[0].released).toBe(true);
    expect(v1.tranches[0].oracleAttestationHash).toBeDefined();
    expect(v1.status).toBe("ACTIVE");

    const creatorCheck1 = await User.findById(creator._id);
    expect(creatorCheck1?.totalEcoCoins).toBe(150);

    // Release Tranche 2 completing vault
    const v2 = await releaseVaultTranche({
      vaultId,
      trancheNumber: 2,
      oracleSecretKey: "super_secret_oracle_key_12345",
      milestoneEvidence: "Flow meters registered 100,000 m3 methane",
    });

    expect(v2.tranches[1].released).toBe(true);
    expect(v2.status).toBe("COMPLETED");

    const creatorCheck2 = await User.findById(creator._id);
    expect(creatorCheck2?.totalEcoCoins).toBe(300);
  });

  it("handles REST API handlers for vault creation and tranche release", async () => {
    const creator = await User.create({
      name: "API Vault Creator",
      email: `api_vault_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 0,
    });

    const investor = await User.create({
      name: "API Vault Investor",
      email: `api_invest_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 500,
    });

    const vaultId = `VAULT-API-${Date.now()}`;
    const reqCreate = new NextRequest("http://localhost:3000/api/vault/create", {
      method: "POST",
      body: JSON.stringify({
        vaultId,
        creatorId: creator._id.toString(),
        projectName: "Geothermal Micro-Station",
        targetFundingEcoCoins: 200,
        yieldRateApy: 10.0,
        tranches: [{ releasePercentage: 100, milestoneDescription: "Turbine online" }],
      }),
    });

    const resCreate = await createVaultHandler(reqCreate);
    expect(resCreate.status).toBe(201);

    await investInVault({
      vaultId,
      investorId: investor._id.toString(),
      amount: 200,
    });

    const reqRelease = new NextRequest("http://localhost:3000/api/vault/tranche/release", {
      method: "POST",
      body: JSON.stringify({
        vaultId,
        trancheNumber: 1,
        oracleSecretKey: "oracle_authorized_key_9999",
        milestoneEvidence: "Wellhead temperature verified at 180C",
      }),
    });

    const resRelease = await releaseTrancheHandler(reqRelease);
    expect(resRelease.status).toBe(200);
    const bodyRelease = await resRelease.json();
    expect(bodyRelease.vault.status).toBe("COMPLETED");
  });
});
