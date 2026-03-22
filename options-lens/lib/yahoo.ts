/* eslint-disable @typescript-eslint/no-explicit-any */
import yahooFinance from "yahoo-finance2";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttlMs) {
    return entry.data as T;
  }
  return null;
}

function getStale<T>(key: string): { data: T; timestamp: number } | null {
  const entry = cache.get(key);
  if (entry) {
    return { data: entry.data as T, timestamp: entry.timestamp };
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

const FIVE_MIN = 5 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

export interface QuoteData {
  price: number;
  change: number;
  changePercent: number;
  high52: number;
  low52: number;
  marketCap: number;
  marketState: string;
}

export async function getQuote(): Promise<{
  data: QuoteData;
  stale?: boolean;
  cachedAt?: number;
}> {
  const cacheKey = "quote:NVDA";
  const cached = getCached<QuoteData>(cacheKey, FIVE_MIN);
  if (cached) return { data: cached };

  try {
    const result: any = await yahooFinance.quote("NVDA");
    const data: QuoteData = {
      price: result.regularMarketPrice ?? 0,
      change: result.regularMarketChange ?? 0,
      changePercent: result.regularMarketChangePercent ?? 0,
      high52: result.fiftyTwoWeekHigh ?? 0,
      low52: result.fiftyTwoWeekLow ?? 0,
      marketCap: result.marketCap ?? 0,
      marketState: result.marketState ?? "CLOSED",
    };
    setCache(cacheKey, data);
    return { data };
  } catch {
    const stale = getStale<QuoteData>(cacheKey);
    if (stale) {
      return { data: stale.data, stale: true, cachedAt: stale.timestamp };
    }
    throw new Error("Failed to fetch quote data and no cached data available");
  }
}

export async function getExpiries(): Promise<{
  data: string[];
  stale?: boolean;
  cachedAt?: number;
}> {
  const cacheKey = "expiries:NVDA";
  const cached = getCached<string[]>(cacheKey, ONE_HOUR);
  if (cached) return { data: cached };

  try {
    const result: any = await yahooFinance.options("NVDA");
    const dates = (result.expirationDates ?? []).map((d: any) => {
      const date = new Date(d);
      return date.toISOString().split("T")[0];
    });
    setCache(cacheKey, dates);
    return { data: dates };
  } catch {
    const stale = getStale<string[]>(cacheKey);
    if (stale) {
      return { data: stale.data, stale: true, cachedAt: stale.timestamp };
    }
    throw new Error(
      "Failed to fetch expiry dates and no cached data available"
    );
  }
}

export interface OptionContract {
  strike: number;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
}

export interface OptionsChain {
  calls: OptionContract[];
  puts: OptionContract[];
}

export async function getOptionsChain(expiry: string): Promise<{
  data: OptionsChain;
  stale?: boolean;
  cachedAt?: number;
}> {
  const cacheKey = `options:NVDA:${expiry}`;
  const cached = getCached<OptionsChain>(cacheKey, FIVE_MIN);
  if (cached) return { data: cached };

  try {
    const expiryDate = new Date(expiry + "T00:00:00Z");
    const result: any = await yahooFinance.options("NVDA", {
      date: expiryDate,
    });

    const mapContract = (c: any): OptionContract => ({
      strike: c.strike ?? 0,
      bid: c.bid ?? 0,
      ask: c.ask ?? 0,
      last: c.lastPrice ?? 0,
      volume: c.volume ?? 0,
      openInterest: c.openInterest ?? 0,
      impliedVolatility: c.impliedVolatility ?? 0,
    });

    const data: OptionsChain = {
      calls: (result.options?.[0]?.calls ?? []).map(mapContract),
      puts: (result.options?.[0]?.puts ?? []).map(mapContract),
    };
    setCache(cacheKey, data);
    return { data };
  } catch {
    const stale = getStale<OptionsChain>(cacheKey);
    if (stale) {
      return { data: stale.data, stale: true, cachedAt: stale.timestamp };
    }
    throw new Error(
      "Failed to fetch options chain and no cached data available"
    );
  }
}

export async function getHistoricalPrices(): Promise<number[]> {
  const cacheKey = "historical:NVDA";
  const cached = getCached<number[]>(cacheKey, ONE_HOUR);
  if (cached) return cached;

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    const result: any = await yahooFinance.historical("NVDA", {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    });

    const prices = result.map((r: any) => r.adjClose ?? r.close);
    setCache(cacheKey, prices);
    return prices;
  } catch {
    const stale = getStale<number[]>(cacheKey);
    if (stale) return stale.data;
    return [];
  }
}
