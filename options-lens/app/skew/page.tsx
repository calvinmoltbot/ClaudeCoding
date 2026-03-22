"use client";

import { useState, useEffect, useCallback } from "react";
import { OptionsChain } from "@/lib/yahoo";
import {
  computeATMIV,
  computeVolatilitySkew,
  computeGEX,
  computeMaxPain,
} from "@/lib/metrics";
import {
  getSkewSignal,
  getGEXSignal,
} from "@/lib/signals";
import SkewChart from "@/components/SkewChart";
import GexChart from "@/components/GexChart";
import SignalCard from "@/components/SignalCard";
import InfoTooltip from "@/components/Tooltip";

export default function SkewPage() {
  const [expiries, setExpiries] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [chain, setChain] = useState<OptionsChain | null>(null);
  const [spotPrice, setSpotPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpiries = useCallback(async () => {
    try {
      const res = await fetch("/api/expiries");
      if (!res.ok) throw new Error("Failed to fetch expiries");
      const data = await res.json();
      setExpiries(data.data);
      if (data.data.length > 0 && !selectedExpiry) {
        setSelectedExpiry(data.data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expiries");
    }
  }, [selectedExpiry]);

  const fetchChain = useCallback(async (expiry: string) => {
    if (!expiry) return;
    setLoading(true);
    setError(null);
    try {
      const [optRes, quoteRes] = await Promise.all([
        fetch(`/api/options?expiry=${expiry}`),
        fetch("/api/quote"),
      ]);

      if (!optRes.ok || !quoteRes.ok) throw new Error("Failed to fetch data");

      const optData = await optRes.json();
      const quoteData = await quoteRes.json();

      setChain(optData.data);
      setSpotPrice(quoteData.data.price);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpiries();
  }, [fetchExpiries]);

  useEffect(() => {
    if (selectedExpiry) fetchChain(selectedExpiry);
  }, [selectedExpiry, fetchChain]);

  const atmIV = chain && spotPrice ? computeATMIV(chain, spotPrice) * 100 : 0;
  const skewResult =
    chain && spotPrice ? computeVolatilitySkew(chain, spotPrice) : null;
  const gexResult =
    chain && spotPrice ? computeGEX(chain, spotPrice) : null;
  const maxPain =
    chain && spotPrice ? computeMaxPain(chain, spotPrice) : spotPrice;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Volatility Skew & GEX</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400">Expiry:</label>
          <select
            value={selectedExpiry}
            onChange={(e) => setSelectedExpiry(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm"
          >
            {expiries.map((exp) => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-xl p-6 text-center">
          <p className="text-red-400 mb-3">{error}</p>
          <button
            onClick={() => fetchChain(selectedExpiry)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="h-[350px] bg-gray-900 border border-gray-700 rounded-xl animate-pulse" />
          <div className="h-[350px] bg-gray-900 border border-gray-700 rounded-xl animate-pulse" />
        </div>
      ) : chain ? (
        <>
          {/* Charts */}
          <SkewChart
            data={skewResult?.skewData ?? []}
            spotPrice={spotPrice}
            maxPain={maxPain}
          />

          <GexChart
            data={gexResult?.gexByStrike ?? []}
            spotPrice={spotPrice}
            gammaFlipLevel={gexResult?.gammaFlipLevel ?? spotPrice}
          />

          {/* Key Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-sm text-gray-400">ATM IV</span>
                <InfoTooltip text="How much the market thinks the price will swing — higher means more expected movement." />
              </div>
              <div className="text-xl font-bold text-white">
                {atmIV.toFixed(1)}%
              </div>
            </div>

            <SignalCard
              signal={getSkewSignal(skewResult?.skew ?? 0)}
            />

            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-sm text-gray-400">Gamma Flip</span>
                <InfoTooltip text="Measures whether market makers will amplify or dampen price moves." />
              </div>
              <div className="text-xl font-bold text-white">
                ${(gexResult?.gammaFlipLevel ?? 0).toFixed(0)}
              </div>
            </div>

            <SignalCard signal={getGEXSignal(gexResult?.netGex ?? 0)} />
          </div>
        </>
      ) : null}
    </div>
  );
}
