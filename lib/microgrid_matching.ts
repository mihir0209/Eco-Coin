import mongoose from "mongoose";
import EnergyOrder, { IEnergyOrder } from "@/models/EnergyOrder";
import EnergyTrade, { IEnergyTrade } from "@/models/EnergyTrade";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

export interface MatchExecutionResult {
  tradesExecuted: number;
  totalKwhCleared: number;
  totalEcoCoinsExchanged: number;
  trades: IEnergyTrade[];
}

export async function createEnergyOrder(params: {
  userId: string;
  side: "buy" | "sell";
  energyType: "solar" | "wind" | "hydro";
  unitsKwh: number;
  pricePerKwh: number;
}): Promise<IEnergyOrder> {
  const { userId, side, energyType, unitsKwh, pricePerKwh } = params;

  if (unitsKwh <= 0) throw new Error("Units (kWh) must be greater than zero.");
  if (pricePerKwh <= 0) throw new Error("Price per kWh must be greater than zero.");

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found.");

  let escrowLocked = 0;
  if (side === "buy") {
    const requiredCoins = Math.ceil(unitsKwh * pricePerKwh);
    if (user.totalEcoCoins < requiredCoins) {
      throw new Error(`Insufficient EcoCoins for escrow. Required: ${requiredCoins}, Available: ${user.totalEcoCoins}`);
    }
    user.totalEcoCoins -= requiredCoins;
    await user.save();
    escrowLocked = requiredCoins;

    await Transaction.create({
      userId: user._id,
      type: "redeem",
      amount: requiredCoins,
      description: `Escrow lock for P2P energy purchase: ${unitsKwh} kWh @ ${pricePerKwh} coins/kWh`,
    });
  }

  const order = await EnergyOrder.create({
    userId: user._id,
    side,
    energyType,
    unitsKwh,
    pricePerKwh,
    status: "open",
    filledKwh: 0,
    remainingKwh: unitsKwh,
    escrowCoinsLocked: escrowLocked,
  });

  return order;
}

export async function matchMicrogridOrders(energyType?: string): Promise<MatchExecutionResult> {
  const query: any = { status: { $in: ["open", "partially_filled"] } };
  if (energyType) query.energyType = energyType;

  const buyOrders = await EnergyOrder.find({ ...query, side: "buy" })
    .sort({ pricePerKwh: -1, createdAt: 1 });
  const sellOrders = await EnergyOrder.find({ ...query, side: "sell" })
    .sort({ pricePerKwh: 1, createdAt: 1 });

  const executedTrades: IEnergyTrade[] = [];
  let totalKwhCleared = 0;
  let totalEcoCoinsExchanged = 0;

  for (const buy of buyOrders) {
    if (buy.remainingKwh <= 0) continue;

    for (const sell of sellOrders) {
      if (sell.remainingKwh <= 0) continue;
      // Prevent wash/self-trading
      if (buy.userId.toString() === sell.userId.toString()) continue;
      // Check if price overlaps
      if (buy.pricePerKwh < sell.pricePerKwh) break;

      const matchedKwh = Math.min(buy.remainingKwh, sell.remainingKwh);
      const clearingPrice = sell.pricePerKwh; // Maker price priority
      const totalCost = Math.round(matchedKwh * clearingPrice * 100) / 100;
      const transmissionFee = Math.round(totalCost * 0.02 * 100) / 100; // 2% grid loss
      const netSellerPayout = totalCost - transmissionFee;

      // Settle trade in DB
      const trade = await EnergyTrade.create({
        buyerId: buy.userId,
        sellerId: sell.userId,
        buyOrderId: buy._id,
        sellOrderId: sell._id,
        unitsKwh: matchedKwh,
        clearingPrice,
        totalEcoCoins: totalCost,
        transmissionLossFee: transmissionFee,
      });

      // Credit seller
      const seller = await User.findById(sell.userId);
      if (seller) {
        seller.totalEcoCoins += netSellerPayout;
        await seller.save();
        await Transaction.create({
          userId: seller._id,
          type: "earn",
          amount: netSellerPayout,
          description: `P2P Green Energy Sale: ${matchedKwh} kWh delivered (Net: ${netSellerPayout})`,
        });
      }

      // Refund buyer excess escrow if clearingPrice < bid price
      const priceDifference = buy.pricePerKwh - clearingPrice;
      if (priceDifference > 0) {
        const refundAmount = Math.round(matchedKwh * priceDifference * 100) / 100;
        const buyer = await User.findById(buy.userId);
        if (buyer && refundAmount > 0) {
          buyer.totalEcoCoins += refundAmount;
          await buyer.save();
        }
      }

      // Update buy order
      buy.remainingKwh -= matchedKwh;
      buy.filledKwh += matchedKwh;
      buy.status = buy.remainingKwh === 0 ? "filled" : "partially_filled";
      await buy.save();

      // Update sell order
      sell.remainingKwh -= matchedKwh;
      sell.filledKwh += matchedKwh;
      sell.status = sell.remainingKwh === 0 ? "filled" : "partially_filled";
      await sell.save();

      executedTrades.push(trade);
      totalKwhCleared += matchedKwh;
      totalEcoCoinsExchanged += totalCost;

      if (buy.remainingKwh <= 0) break;
    }
  }

  return {
    tradesExecuted: executedTrades.length,
    totalKwhCleared,
    totalEcoCoinsExchanged,
    trades: executedTrades,
  };
}

export async function cancelEnergyOrder(orderId: string, userId: string): Promise<IEnergyOrder> {
  const order = await EnergyOrder.findById(orderId);
  if (!order) throw new Error("Order not found.");
  if (order.userId.toString() !== userId) throw new Error("Unauthorized: cannot cancel order of another user.");
  if (["filled", "cancelled"].includes(order.status)) {
    throw new Error(`Order cannot be cancelled in state: ${order.status}`);
  }

  // Refund remaining escrow for buy order
  if (order.side === "buy" && order.escrowCoinsLocked > 0) {
    const refundRatio = order.remainingKwh / order.unitsKwh;
    const refundAmount = Math.floor(order.escrowCoinsLocked * refundRatio);
    const user = await User.findById(userId);
    if (user && refundAmount > 0) {
      user.totalEcoCoins += refundAmount;
      await user.save();
      await Transaction.create({
        userId: user._id,
        type: "earn",
        amount: refundAmount,
        description: `Escrow refund for cancelled P2P energy order: ${orderId}`,
      });
    }
  }

  order.status = "cancelled";
  await order.save();
  return order;
}
