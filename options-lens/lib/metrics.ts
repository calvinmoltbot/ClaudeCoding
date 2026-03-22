import { OptionContract, OptionsChain } from "./yahoo";

export interface Metrics {
  spotPrice: number;
  change: number;
  changePercent: number;
  atmIV: number;
  historicalVolatility: number;
  ivRank: number;
  expectedMoveDollar: number;
  expectedMovePercent: number;
  putCallRatio: number;
  maxPain: number;
  maxPainGap: number;
  maxPainGapPercent: number;
  netGex: number;
  gammaFlipLevel: number;
  volatilitySkew: number;
  gexByStrike: { strike: number; callGex: number; putGex: number }[];
  skewData: {
    strike: number;
    callIV: number;
    putIV: number;
  }[];
}

export function computeATMIV(
  chain: OptionsChain,
  spotPrice: number
): number {
  const atmCall = findNearestStrike(chain.calls, spotPrice);
  const atmPut = findNearestStrike(chain.puts, spotPrice);
  if (!atmCall && !atmPut) return 0;
  const callIV = atmCall?.impliedVolatility ?? 0;
  const putIV = atmPut?.impliedVolatility ?? 0;
  if (callIV && putIV) return (callIV + putIV) / 2;
  return callIV || putIV;
}

export function computeHistoricalVolatility(prices: number[]): number {
  if (prices.length < 31) return 0;
  const recent = prices.slice(-31);
  const returns: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    if (recent[i - 1] > 0) {
      returns.push(Math.log(recent[i] / recent[i - 1]));
    }
  }
  if (returns.length === 0) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance * 252);
}

export function computeIVRank(
  currentIV: number,
  prices: number[]
): number {
  if (prices.length < 60) return 50;
  // Approximate IV range from HV range over past year
  const hvValues: number[] = [];
  for (let i = 30; i < prices.length; i++) {
    const slice = prices.slice(i - 30, i);
    const rets: number[] = [];
    for (let j = 1; j < slice.length; j++) {
      if (slice[j - 1] > 0) rets.push(Math.log(slice[j] / slice[j - 1]));
    }
    if (rets.length > 0) {
      const m = rets.reduce((a, b) => a + b, 0) / rets.length;
      const v = rets.reduce((s, r) => s + (r - m) ** 2, 0) / rets.length;
      hvValues.push(Math.sqrt(v * 252));
    }
  }
  if (hvValues.length === 0) return 50;
  const low = Math.min(...hvValues);
  const high = Math.max(...hvValues);
  if (high === low) return 50;
  return Math.min(100, Math.max(0, ((currentIV - low) / (high - low)) * 100));
}

export function computeExpectedMove(
  chain: OptionsChain,
  spotPrice: number
): { dollar: number; percent: number } {
  const atmCall = findNearestStrike(chain.calls, spotPrice);
  const atmPut = findNearestStrike(chain.puts, spotPrice);
  const callBid = atmCall?.bid ?? 0;
  const putBid = atmPut?.bid ?? 0;
  const dollar = callBid + putBid;
  const percent = spotPrice > 0 ? (dollar / spotPrice) * 100 : 0;
  return { dollar, percent };
}

export function computePutCallRatio(chain: OptionsChain): number {
  const totalCallOI = chain.calls.reduce((s, c) => s + c.openInterest, 0);
  const totalPutOI = chain.puts.reduce((s, p) => s + p.openInterest, 0);
  if (totalCallOI === 0) return 0;
  return totalPutOI / totalCallOI;
}

export function computeMaxPain(
  chain: OptionsChain,
  spotPrice: number
): number {
  const strikes = new Set<number>();
  chain.calls.forEach((c) => strikes.add(c.strike));
  chain.puts.forEach((p) => strikes.add(p.strike));

  const strikeArray = Array.from(strikes).sort((a, b) => a - b);
  if (strikeArray.length === 0) return spotPrice;

  let minLoss = Infinity;
  let maxPainStrike = strikeArray[0];

  for (const testStrike of strikeArray) {
    let totalLoss = 0;
    for (const call of chain.calls) {
      if (testStrike > call.strike) {
        totalLoss += (testStrike - call.strike) * call.openInterest * 100;
      }
    }
    for (const put of chain.puts) {
      if (testStrike < put.strike) {
        totalLoss += (put.strike - testStrike) * put.openInterest * 100;
      }
    }
    if (totalLoss < minLoss) {
      minLoss = totalLoss;
      maxPainStrike = testStrike;
    }
  }
  return maxPainStrike;
}

export function computeGEX(
  chain: OptionsChain,
  spotPrice: number
): {
  gexByStrike: { strike: number; callGex: number; putGex: number }[];
  netGex: number;
  gammaFlipLevel: number;
} {
  const strikes = new Set<number>();
  chain.calls.forEach((c) => strikes.add(c.strike));
  chain.puts.forEach((p) => strikes.add(p.strike));
  const strikeArray = Array.from(strikes).sort((a, b) => a - b);

  const callMap = new Map(chain.calls.map((c) => [c.strike, c]));
  const putMap = new Map(chain.puts.map((p) => [p.strike, p]));

  const gexByStrike = strikeArray.map((strike) => {
    const gamma =
      0.05 *
      Math.exp(-0.5 * ((strike - spotPrice) / (spotPrice * 0.05)) ** 2);
    const call = callMap.get(strike);
    const put = putMap.get(strike);
    const callGex = call
      ? call.openInterest * gamma * 100 * spotPrice
      : 0;
    const putGex = put
      ? -(put.openInterest * gamma * 100 * spotPrice)
      : 0;
    return { strike, callGex, putGex };
  });

  const netGex = gexByStrike.reduce(
    (s, g) => s + g.callGex + g.putGex,
    0
  );

  // Find gamma flip level
  let gammaFlipLevel = spotPrice;
  let cumGex = 0;
  let prevCum = 0;
  for (const g of gexByStrike) {
    prevCum = cumGex;
    cumGex += g.callGex + g.putGex;
    if (
      (prevCum >= 0 && cumGex < 0) ||
      (prevCum < 0 && cumGex >= 0)
    ) {
      gammaFlipLevel = g.strike;
      break;
    }
  }

  return { gexByStrike, netGex, gammaFlipLevel };
}

export function computeVolatilitySkew(
  chain: OptionsChain,
  spotPrice: number
): {
  skew: number;
  skewData: { strike: number; callIV: number; putIV: number }[];
} {
  // Get all strikes with IV data
  const callMap = new Map(
    chain.calls
      .filter((c) => c.impliedVolatility > 0)
      .map((c) => [c.strike, c.impliedVolatility])
  );
  const putMap = new Map(
    chain.puts
      .filter((p) => p.impliedVolatility > 0)
      .map((p) => [p.strike, p.impliedVolatility])
  );

  const strikes = new Set<number>();
  chain.calls.forEach((c) => {
    if (c.impliedVolatility > 0) strikes.add(c.strike);
  });
  chain.puts.forEach((p) => {
    if (p.impliedVolatility > 0) strikes.add(p.strike);
  });

  const skewData = Array.from(strikes)
    .sort((a, b) => a - b)
    .map((strike) => ({
      strike,
      callIV: (callMap.get(strike) ?? 0) * 100,
      putIV: (putMap.get(strike) ?? 0) * 100,
    }));

  // Skew: compare 5% OTM put IV vs 5% OTM call IV
  const otmPutStrike = spotPrice * 0.95;
  const otmCallStrike = spotPrice * 1.05;

  const nearestPut = findNearestStrike(chain.puts, otmPutStrike);
  const nearestCall = findNearestStrike(chain.calls, otmCallStrike);

  const putIV = (nearestPut?.impliedVolatility ?? 0) * 100;
  const callIV = (nearestCall?.impliedVolatility ?? 0) * 100;
  const skew = putIV - callIV;

  return { skew, skewData };
}

export function computeAllMetrics(
  chain: OptionsChain,
  spotPrice: number,
  change: number,
  changePercent: number,
  historicalPrices: number[]
): Metrics {
  const atmIV = computeATMIV(chain, spotPrice);
  const historicalVolatility = computeHistoricalVolatility(historicalPrices);
  const ivRank = computeIVRank(atmIV, historicalPrices);
  const expectedMove = computeExpectedMove(chain, spotPrice);
  const putCallRatio = computePutCallRatio(chain);
  const maxPain = computeMaxPain(chain, spotPrice);
  const { gexByStrike, netGex, gammaFlipLevel } = computeGEX(
    chain,
    spotPrice
  );
  const { skew, skewData } = computeVolatilitySkew(chain, spotPrice);

  return {
    spotPrice,
    change,
    changePercent,
    atmIV: atmIV * 100,
    historicalVolatility: historicalVolatility * 100,
    ivRank,
    expectedMoveDollar: expectedMove.dollar,
    expectedMovePercent: expectedMove.percent,
    putCallRatio,
    maxPain,
    maxPainGap: Math.abs(spotPrice - maxPain),
    maxPainGapPercent:
      spotPrice > 0 ? (Math.abs(spotPrice - maxPain) / spotPrice) * 100 : 0,
    netGex,
    gammaFlipLevel,
    volatilitySkew: skew,
    gexByStrike,
    skewData,
  };
}

function findNearestStrike(
  contracts: OptionContract[],
  target: number
): OptionContract | null {
  if (contracts.length === 0) return null;
  let nearest = contracts[0];
  let minDiff = Math.abs(contracts[0].strike - target);
  for (const c of contracts) {
    const diff = Math.abs(c.strike - target);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = c;
    }
  }
  return nearest;
}
