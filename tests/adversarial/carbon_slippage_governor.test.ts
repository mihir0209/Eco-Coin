import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateAmmOutput,
  computeSlippage,
  checkVolatilityThreshold,
  evaluateAndExecuteSwap,
} from "../../lib/carbon_slippage_governor";
import CarbonSlippageGovernor from "../../models/CarbonSlippageGovernor";

vi.mock("../../models/CarbonSlippageGovernor", () => {
  const store = new Map<string, any>();
  return {
    default: {
      findOne: vi.fn(async (q: any) => {
        if (q.poolId && store.has(q.poolId)) {
          const doc = store.get(q.poolId);
          return {
            ...doc,
            save: vi.fn(async function () {
              store.set(this.poolId, { ...this });
              return this;
            }),
          };
        }
        return null;
      }),
      create: vi.fn(async (doc: any) => {
        const item = { ...doc, _id: "gov_" + Math.random().toString(36).substring(7) };
        store.set(doc.poolId, item);
        return item;
      }),
      _set: (poolId: string, doc: any) => store.set(poolId, doc),
      _clear: () => store.clear(),
    },
  };
});

describe("Carbon Slippage Governor & Volatility Circuit Breaker", () => {
  beforeEach(() => {
    (CarbonSlippageGovernor as any)._clear();
    vi.clearAllMocks();
  });

  it("calculates accurate constant product AMM output with fee deduction", () => {
    // 10,000 base reserve, 20,000 quote reserve, trade 100 in
    const output = calculateAmmOutput(100, 10000, 20000, 0.003);
    expect(output).toBeGreaterThan(190);
    expect(output).toBeLessThan(200);

    // Negative / zero reserves reject
    expect(() => calculateAmmOutput(-10, 1000, 1000)).toThrow();
    expect(() => calculateAmmOutput(10, 0, 1000)).toThrow();
  });

  it("computes slippage percentage accurately relative to spot price", () => {
    // Small trade: minimal slippage (< 1%)
    const outSmall = calculateAmmOutput(10, 10000, 20000);
    const slipSmall = computeSlippage(10, outSmall, 10000, 20000);
    expect(slipSmall).toBeLessThan(1.0);

    // Massive trade: high slippage (> 20%)
    const outLarge = calculateAmmOutput(5000, 10000, 20000);
    const slipLarge = computeSlippage(5000, outLarge, 10000, 20000);
    expect(slipLarge).toBeGreaterThan(20.0);
  });

  it("detects price volatility spikes exceeding threshold", () => {
    const history = [
      { price: 2.0, timestamp: Date.now() - 60000, tradeVolume: 500 },
      { price: 2.02, timestamp: Date.now() - 30000, tradeVolume: 300 },
    ];

    // Stable price change (+2.5% delta) -> not tripped
    const checkStable = checkVolatilityThreshold(history, 2.05, 600000, 15.0);
    expect(checkStable.tripped).toBe(false);

    // Flash-loan dump: price drops to 1.50 (-25% delta) -> TRIPPED
    const checkCrash = checkVolatilityThreshold(history, 1.50, 600000, 15.0);
    expect(checkCrash.tripped).toBe(true);
    expect(checkCrash.maxDeltaPct).toBeGreaterThan(20.0);
  });

  it("rejects trades exceeding maximum allowed slippage", async () => {
    (CarbonSlippageGovernor as any)._set("pool-eco-usdc", {
      poolId: "pool-eco-usdc",
      baseToken: "ECO",
      quoteToken: "USDC",
      reserveBase: 10000,
      reserveQuote: 25000,
      currentPrice: 2.5,
      circuitBreakerThresholdPct: 15,
      isCircuitBreakerTripped: false,
      priceHistory: [{ price: 2.5, timestamp: Date.now(), tradeVolume: 100 }],
    });

    // Attempting a 2000 ECO swap with strict 2% max slippage (actual will be ~16%)
    const result = await evaluateAndExecuteSwap("pool-eco-usdc", 2000, 2.0);
    expect(result.allowed).toBe(false);
    expect(result.slippagePct).toBeGreaterThan(2.0);
    expect(result.reason).toContain("exceeds maximum tolerance");
  });

  it("executes valid trades within slippage tolerance and updates state", async () => {
    (CarbonSlippageGovernor as any)._set("pool-eco-usdc", {
      poolId: "pool-eco-usdc",
      baseToken: "ECO",
      quoteToken: "USDC",
      reserveBase: 50000,
      reserveQuote: 100000,
      currentPrice: 2.0,
      circuitBreakerThresholdPct: 15,
      isCircuitBreakerTripped: false,
      priceHistory: [{ price: 2.0, timestamp: Date.now(), tradeVolume: 100 }],
    });

    const result = await evaluateAndExecuteSwap("pool-eco-usdc", 200, 5.0);
    expect(result.allowed).toBe(true);
    expect(result.slippagePct).toBeLessThan(5.0);
    expect(result.expectedOutput).toBeGreaterThan(390);
  });

  it("halts execution when volatility circuit breaker is active", async () => {
    (CarbonSlippageGovernor as any)._set("pool-halted", {
      poolId: "pool-halted",
      baseToken: "ECO",
      quoteToken: "USDC",
      reserveBase: 50000,
      reserveQuote: 100000,
      currentPrice: 2.0,
      circuitBreakerThresholdPct: 15,
      isCircuitBreakerTripped: true,
      trippedUntil: new Date(Date.now() + 600000), // Tripped for 10 min
      priceHistory: [],
    });

    const result = await evaluateAndExecuteSwap("pool-halted", 100, 5.0);
    expect(result.allowed).toBe(false);
    expect(result.circuitBreakerTripped).toBe(true);
    expect(result.reason).toContain("circuit breaker");
  });
});
