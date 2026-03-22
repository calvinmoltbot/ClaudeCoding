"use client";

import { useState, useEffect, useCallback } from "react";
import { OptionsChain } from "@/lib/yahoo";
import { computeMaxPain } from "@/lib/metrics";
import OptionsTable from "@/components/OptionsTable";

export default function ChainPage() {
  const [expiries, setExpiries] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [chain, setChain] = useState<OptionsChain | null>(null);
  const [spotPrice, setSpotPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staleWarning, setStaleWarning] = useState<string | null>(null);

  const fetchExpiries = useCallback(async () => {
    try {
      const res = await fetch("/api/expiries");
      if (!res.ok) throw new Error("Failed to fetch expiries");
      const data = await res.json();
      if (data.stale) setStaleWarning("Using cached data");
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

      if (!optRes.ok || !quoteRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const optData = await optRes.json();
      const quoteData = await quoteRes.json();

      if (optData.stale || quoteData.stale) {
        setStaleWarning("Showing cached data — live data temporarily unavailable");
      } else {
        setStaleWarning(null);
      }

      setChain(optData.data);
      setSpotPrice(quoteData.data.price);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chain");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpiries();
  }, [fetchExpiries]);

  useEffect(() => {
    if (selectedExpiry) {
      fetchChain(selectedExpiry);
    }
  }, [selectedExpiry, fetchChain]);

  const maxPain =
    chain && spotPrice ? computeMaxPain(chain, spotPrice) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Options Chain</h1>
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

      {staleWarning && (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg px-4 py-2 text-sm text-amber-400">
          {staleWarning}
        </div>
      )}

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
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-gray-800 rounded" />
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-800/50 rounded" />
          ))}
        </div>
      ) : chain ? (
        <OptionsTable
          calls={chain.calls}
          puts={chain.puts}
          spotPrice={spotPrice}
          maxPain={maxPain}
        />
      ) : null}
    </div>
  );
}
