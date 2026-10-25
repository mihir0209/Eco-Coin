import crypto from "crypto";
import mongoose from "mongoose";
import ProductPassport, { IProductPassport, IPassportEvent } from "@/models/ProductPassport";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function computeEventLeafHash(event: {
  stage: string;
  location: string;
  actorId: string;
  metadataHash: string;
  timestamp: string | Date;
}): string {
  const tsStr = event.timestamp instanceof Date ? event.timestamp.toISOString() : String(event.timestamp);
  const raw = [event.stage, event.location, event.actorId, event.metadataHash, tsStr].join("|");
  return sha256(raw);
}

export function buildMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return sha256("EMPTY_TREE");
  if (leaves.length === 1) return leaves[0];

  let currentLevel = [...leaves];
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(sha256(currentLevel[i] + currentLevel[i + 1]));
      } else {
        // Odd leaf duplicate to maintain balance
        nextLevel.push(sha256(currentLevel[i] + currentLevel[i]));
      }
    }
    currentLevel = nextLevel;
  }
  return currentLevel[0];
}

export function generateMerkleProof(leaves: string[], targetIndex: number): string[] {
  if (targetIndex < 0 || targetIndex >= leaves.length) {
    throw new Error("Invalid target leaf index for Merkle proof");
  }

  const proof: string[] = [];
  let currentLevel = [...leaves];
  let index = targetIndex;

  while (currentLevel.length > 1) {
    const isRightNode = index % 2 === 1;
    const siblingIndex = isRightNode ? index - 1 : index + 1;

    if (siblingIndex < currentLevel.length) {
      proof.push(currentLevel[siblingIndex]);
    } else {
      proof.push(currentLevel[index]);
    }

    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(sha256(currentLevel[i] + currentLevel[i + 1]));
      } else {
        nextLevel.push(sha256(currentLevel[i] + currentLevel[i]));
      }
    }
    currentLevel = nextLevel;
    index = Math.floor(index / 2);
  }

  return proof;
}

export function verifyMerkleProof(
  leaf: string,
  proof: string[],
  root: string,
  targetIndex: number
): boolean {
  let computedHash = leaf;
  let index = targetIndex;

  for (const sibling of proof) {
    const isRightNode = index % 2 === 1;
    if (isRightNode) {
      computedHash = sha256(sibling + computedHash);
    } else {
      computedHash = sha256(computedHash + sibling);
    }
    index = Math.floor(index / 2);
  }

  return computedHash === root;
}

export async function createProductPassport(params: {
  passportId: string;
  productName: string;
  category: "electronics" | "battery" | "textile" | "automotive";
  ownerId: string;
  location: string;
  carbonFootprintKg: number;
}): Promise<IProductPassport> {
  const { passportId, productName, category, ownerId, location, carbonFootprintKg } = params;

  const initialEvent: IPassportEvent = {
    stage: "origin",
    location,
    actorId: ownerId,
    metadataHash: sha256(`ORIGIN_${passportId}_${category}`),
    timestamp: new Date(),
    leafHash: "",
  };
  initialEvent.leafHash = computeEventLeafHash(initialEvent);

  const merkleRoot = buildMerkleRoot([initialEvent.leafHash]);

  const passport = await ProductPassport.create({
    passportId,
    productName,
    category,
    currentOwnerId: new mongoose.Types.ObjectId(ownerId),
    merkleRoot,
    events: [initialEvent],
    isRecycled: false,
    carbonFootprintKg,
  });

  return passport;
}

export async function appendPassportStage(params: {
  passportId: string;
  stage: "manufacturing" | "distribution" | "refurbishing" | "recycled";
  location: string;
  actorId: string;
}): Promise<IProductPassport> {
  const { passportId, stage, location, actorId } = params;

  const passport = await ProductPassport.findOne({ passportId });
  if (!passport) throw new Error(`Product Passport not found: ${passportId}`);
  if (passport.isRecycled) throw new Error("Product lifecycle is already finalized as recycled.");

  const newEvent: IPassportEvent = {
    stage,
    location,
    actorId,
    metadataHash: sha256(`${stage.toUpperCase()}_${passportId}_${Date.now()}`),
    timestamp: new Date(),
    leafHash: "",
  };
  newEvent.leafHash = computeEventLeafHash(newEvent);

  passport.events.push(newEvent);

  const leaves = passport.events.map((e: IPassportEvent) => e.leafHash);
  passport.merkleRoot = buildMerkleRoot(leaves);

  if (stage === "recycled") {
    passport.isRecycled = true;
    // Circular economy reward
    const rewardCoins = 50;
    const owner = await User.findById(passport.currentOwnerId);
    if (owner) {
      owner.totalEcoCoins += rewardCoins;
      await owner.save();
      await Transaction.create({
        userId: owner._id,
        type: "recycle",
        amount: rewardCoins,
        description: `Circular Economy Recycling Reward: Passport ${passportId}`,
      });
    }
  }

  await passport.save();
  return passport;
}
