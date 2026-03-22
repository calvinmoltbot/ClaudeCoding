"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Metrics, computeAllMetrics } from "@/lib/metrics";
import { OptionsChain } from "@/lib/yahoo";
import {
  getIVRankSignal,
  getPutCallSignal,
  getMaxPainSignal,
  getGEXSignal,
  getExpectedMoveSignal,
  getSkewSignal,
  getIVSentiment,
} from "@/lib/signals";
import SignalCard from "@/components/SignalCard";
import AISummary from "@/components/AISummary";
import InfoTooltip from "@/components/Tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";

function isMarketOpen(): boolean {
  const now = new Date();
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const day = et.getDay();
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const time = hours * 60 + minutes;
  return day >= 1 && day <= 5 && time >= 570 && time < 960;
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-700 rounded w-1/3" />
      <div className="h-8 bg-gray-700 rounded w-1/2" />
      <div className="h-4 bg-gray-700 rounded w-full" />
      <div className="h-4 bg-gray-700 rounded w-5/6" />
    </div>
  );
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staleWarning, setStaleWarning] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setStaleWarning(null);

      const [quoteRes, expiriesRes] = await Promise.all([
        fetch("/api/quote"),
        fetch("/api/expiries"),
      ]);

      if (!quoteRes.ok || !expiriesRes.ok) {
        throw new Error("Failed to fetch market data");
      }

      const quoteData = await quoteRes.json();
      const expiriesData = await expiriesRes.json();

      if (quoteData.stale || expiriesData.stale) {
        setStaleWarning(
          `Showing cached data from ${new Date(quoteData.cachedAt || Date.now()).toLocaleTimeString()} — live data temporarily unavailable`
        );
      }

      // Get nearest expiry options
      const expiries: string[] = expiriesData.data;
      if (expiries.length === 0) throw new Error("No expiry dates available");

      const optionsRes = await fetch(
        `/api/options?expiry=${expiries[0]}`
      );
      if (!optionsRes.ok) throw new Error("Failed to fetch options chain");

      const optionsData = await optionsRes.json();
      const chain: OptionsChain = optionsData.data;

      if (optionsData.stale) {
        setStaleWarning(
          `Showing cached data — live data temporarily unavailable`
        );
      }

      const computed = computeAllMetrics(
        chain,
        quoteData.data.price,
        quoteData.data.change,
        quoteData.data.changePercent,
        []
      );

      setMetrics(computed);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load data";
      setError(msg);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 5 minutes during market hours
    const checkAndRefresh = () => {
      if (isMarketOpen()) {
        fetchData();
      }
    };

    intervalRef.current = setInterval(checkAndRefresh, 5 * 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  if (error && !metrics) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-xl p-6 text-center">
        <p className="text-red-400 text-lg mb-3">
          Market data temporarily unavailable
        </p>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  const marketOpen = isMarketOpen();
  const ivSentiment = metrics ? getIVSentiment(metrics.ivRank) : "normal";

  const ivCompData = metrics
    ? [
        { name: "Implied Vol", value: metrics.atmIV },
        { name: "Historical Vol", value: metrics.historicalVolatility },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header info bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!marketOpen && (
            <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-full">
              Market closed
            </span>
          )}
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="text-sm px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stale data warning */}
      {staleWarning && (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg px-4 py-2 text-sm text-amber-400">
          {staleWarning}
        </div>
      )}

      {/* AI Summary */}
      <AISummary metrics={metrics} />

      {/* Signal Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-900 border border-gray-700 rounded-xl p-5"
            >
              <Skeleton />
            </div>
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Current Price */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <div className="text-sm text-gray-400 mb-1">NVDA Price</div>
            <div className="text-3xl font-bold text-white">
              ${metrics.spotPrice.toFixed(2)}
            </div>
            <div
              className={`text-lg font-medium mt-1 ${
                metrics.change >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {metrics.change >= 0 ? "+" : ""}
              {metrics.change.toFixed(2)} ({metrics.changePercent >= 0 ? "+" : ""}
              {metrics.changePercent.toFixed(2)}%)
            </div>
          </div>

          {/* 2. IV vs Historical Vol */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-gray-400">IV vs Historical Vol</span>
              <InfoTooltip text="How much the market thinks the price will swing — higher means more expected movement." />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-bold text-white">
                {metrics.atmIV.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-400">vs</span>
              <span className="text-lg font-bold text-gray-400">
                {metrics.historicalVolatility.toFixed(1)}%
              </span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                ivSentiment === "low"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : ivSentiment === "normal"
                    ? "bg-gray-500/20 text-gray-400"
                    : ivSentiment === "elevated"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-red-500/20 text-red-400"
              }`}
            >
              {ivSentiment}
            </span>
            <div className="h-16 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ivCompData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#9CA3AF", fontSize: 10 }}
                    width={80}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {ivCompData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={index === 0 ? "#3B82F6" : "#6B7280"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. IV Rank */}
          <SignalCard signal={getIVRankSignal(metrics.ivRank)}>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  metrics.ivRank < 30
                    ? "bg-emerald-500"
                    : metrics.ivRank <= 60
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, metrics.ivRank)}%` }}
              />
            </div>
          </SignalCard>

          {/* 4. Put/Call Ratio */}
          <SignalCard signal={getPutCallSignal(metrics.putCallRatio)} />

          {/* 5. Expected Move */}
          <SignalCard
            signal={getExpectedMoveSignal(
              metrics.expectedMoveDollar,
              metrics.expectedMovePercent,
              metrics.spotPrice
            )}
          >
            <div className="text-xs text-gray-500">
              Range: ${(metrics.spotPrice - metrics.expectedMoveDollar).toFixed(2)} — $
              {(metrics.spotPrice + metrics.expectedMoveDollar).toFixed(2)}
            </div>
          </SignalCard>

          {/* 6. Max Pain */}
          <SignalCard
            signal={getMaxPainSignal(
              metrics.maxPainGapPercent,
              metrics.maxPain,
              metrics.spotPrice
            )}
          >
            <div className="text-xs text-gray-500">
              Gap: ${metrics.maxPainGap.toFixed(2)} (
              {metrics.maxPainGapPercent.toFixed(1)}%)
            </div>
          </SignalCard>

          {/* 7. Net GEX */}
          <SignalCard signal={getGEXSignal(metrics.netGex)}>
            <div className="text-xs text-gray-500">
              Regime:{" "}
              {metrics.netGex > 0 ? (
                <span className="text-emerald-400">Pinned</span>
              ) : (
                <span className="text-red-400">Acceleration</span>
              )}
            </div>
          </SignalCard>

          {/* 8. Gamma Flip Level */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm text-gray-400">Gamma Flip</span>
              <InfoTooltip text="Measures whether market makers will amplify or dampen price moves." />
            </div>
            <div className="text-2xl font-bold text-white">
              ${metrics.gammaFlipLevel.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Price is{" "}
              {metrics.spotPrice > metrics.gammaFlipLevel ? (
                <span className="text-emerald-400">above</span>
              ) : (
                <span className="text-red-400">below</span>
              )}{" "}
              the flip level
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mt-2">
              {metrics.spotPrice > metrics.gammaFlipLevel
                ? "Price is in the positive gamma zone — moves are being dampened by market makers."
                : "Price is in the negative gamma zone — moves could be amplified."}
            </p>
          </div>

          {/* 9. Volatility Skew */}
          <SignalCard signal={getSkewSignal(metrics.volatilitySkew)} />
        </div>
      ) : null}
    </div>
  );
}
