import { describe, it, expect, beforeAll, afterAll } from "vitest";
import connectDB, { disconnectDB } from "@/lib/mongodb";
import User from "@/models/User";
import EnergyOrder from "@/models/EnergyOrder";
import EnergyTrade from "@/models/EnergyTrade";
import Transaction from "@/models/Transaction";
import {
  createEnergyOrder,
  matchMicrogridOrders,
  cancelEnergyOrder,
} from "@/lib/microgrid_matching";
import { POST as orderHandler } from "@/app/api/energy/order/route";
import { POST as matchHandler } from "@/app/api/energy/match/route";
import { NextRequest } from "next/server";

describe("Adversarial Peer-to-Peer Microgrid Settlement Suite", () => {
  beforeAll(async () => {
    await connectDB();
    await User.init();
    await EnergyOrder.init();
    await EnergyTrade.init();
    await Transaction.init();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it("matches orders using price-time priority and clears partial fills", async () => {
    const buyer = await User.create({
      name: "Commercial Consumer",
      email: `buyer_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 500,
    });
    const seller1 = await User.create({
      name: "Solar Rooftop A",
      email: `seller1_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 50,
    });
    const seller2 = await User.create({
      name: "Wind Turbine B",
      email: `seller2_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 50,
    });

    // Seller 1 offers 30 kWh @ 2.0 coins/kWh
    const sellOrder1 = await createEnergyOrder({
      userId: seller1._id.toString(),
      side: "sell",
      energyType: "solar",
      unitsKwh: 30,
      pricePerKwh: 2.0,
    });

    // Seller 2 offers 50 kWh @ 2.5 coins/kWh
    const sellOrder2 = await createEnergyOrder({
      userId: seller2._id.toString(),
      side: "sell",
      energyType: "solar",
      unitsKwh: 50,
      pricePerKwh: 2.5,
    });

    // Buyer wants 50 kWh @ up to 3.0 coins/kWh (escrow lock: 50 * 3 = 150)
    const buyOrder = await createEnergyOrder({
      userId: buyer._id.toString(),
      side: "buy",
      energyType: "solar",
      unitsKwh: 50,
      pricePerKwh: 3.0,
    });

    expect(buyOrder.escrowCoinsLocked).toBe(150);
    const buyerAfterOrder = await User.findById(buyer._id);
    expect(buyerAfterOrder?.totalEcoCoins).toBe(350);

    // Run matching engine
    const matchResult = await matchMicrogridOrders("solar");
    expect(matchResult.tradesExecuted).toBe(2);
    expect(matchResult.totalKwhCleared).toBe(50); // 30 from seller1 + 20 from seller2

    // Verify order statuses
    const updatedBuy = await EnergyOrder.findById(buyOrder._id);
    const updatedSell1 = await EnergyOrder.findById(sellOrder1._id);
    const updatedSell2 = await EnergyOrder.findById(sellOrder2._id);

    expect(updatedBuy?.status).toBe("filled");
    expect(updatedBuy?.remainingKwh).toBe(0);

    expect(updatedSell1?.status).toBe("filled");
    expect(updatedSell1?.remainingKwh).toBe(0);

    expect(updatedSell2?.status).toBe("partially_filled");
    expect(updatedSell2?.remainingKwh).toBe(30); // 50 - 20 = 30
  });

  it("strictly prevents wash and self-trading between same account orders", async () => {
    const washTrader = await User.create({
      name: "Wash Trader",
      email: `wash_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 400,
    });

    // Create buy order and sell order for same user
    const selfSell = await createEnergyOrder({
      userId: washTrader._id.toString(),
      side: "sell",
      energyType: "wind",
      unitsKwh: 20,
      pricePerKwh: 1.5,
    });

    const selfBuy = await createEnergyOrder({
      userId: washTrader._id.toString(),
      side: "buy",
      energyType: "wind",
      unitsKwh: 20,
      pricePerKwh: 2.0,
    });

    // Match cycle
    const result = await matchMicrogridOrders("wind");
    expect(result.tradesExecuted).toBe(0);

    const checkSell = await EnergyOrder.findById(selfSell._id);
    const checkBuy = await EnergyOrder.findById(selfBuy._id);
    expect(checkSell?.status).toBe("open");
    expect(checkBuy?.status).toBe("open");
  });

  it("releases escrow coins upon order cancellation", async () => {
    const cancelUser = await User.create({
      name: "Cancel User",
      email: `cancel_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 300,
    });

    const order = await createEnergyOrder({
      userId: cancelUser._id.toString(),
      side: "buy",
      energyType: "hydro",
      unitsKwh: 40,
      pricePerKwh: 2.5,
    });

    expect(order.escrowCoinsLocked).toBe(100);
    const userMid = await User.findById(cancelUser._id);
    expect(userMid?.totalEcoCoins).toBe(200);

    // Cancel order
    const cancelled = await cancelEnergyOrder(order._id.toString(), cancelUser._id.toString());
    expect(cancelled.status).toBe("cancelled");

    const userFinal = await User.findById(cancelUser._id);
    expect(userFinal?.totalEcoCoins).toBe(300);
  });

  it("handles HTTP API routes for order placement and matching", async () => {
    const apiBuyer = await User.create({
      name: "HTTP Buyer",
      email: `http_b_${Date.now()}@test.com`,
      password: "password123",
      totalEcoCoins: 500,
    });

    const req = new NextRequest("http://localhost:3000/api/energy/order", {
      method: "POST",
      body: JSON.stringify({
        userId: apiBuyer._id.toString(),
        side: "buy",
        energyType: "solar",
        unitsKwh: 10,
        pricePerKwh: 2.0,
      }),
    });

    const res = await orderHandler(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.order.status).toBe("open");

    // Match route trigger
    const matchReq = new NextRequest("http://localhost:3000/api/energy/match", {
      method: "POST",
      body: JSON.stringify({ energyType: "solar" }),
    });

    const matchRes = await matchHandler(matchReq);
    expect(matchRes.status).toBe(200);
    const matchJson = await matchRes.json();
    expect(matchJson.success).toBe(true);
  });
});
