"use client";

import { useState, useCallback } from "react";
import { Metrics } from "@/lib/metrics";

interface AISummaryProps {
  metrics: Metrics | null;
}

interface SummaryData {
  summary: string;
  shouldIBuy: string;
}

export default function AISummary({ metrics }: AISummaryProps) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!metrics) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metrics),
      });
      if (!res.ok) {
        throw new Error("AI summary temporarily unavailable");
      }
      const result = await res.json();
      setData(result);
      setHasFetched(true);
    } catch {
      setError("AI summary temporarily unavailable");
      setHasFetched(true);
    } finally {
      setLoading(false);
    }
  }, [metrics]);

  // Auto-fetch on first render with metrics
  if (metrics && !hasFetched && !loading) {
    fetchSummary();
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          AI Market Analysis
        </h2>
        <button
          onClick={fetchSummary}
          disabled={loading || !metrics}
          className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
        >
          {loading ? "Analyzing..." : "Refresh analysis"}
        </button>
      </div>

      {loading && !data && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-700 rounded w-5/6" />
          <div className="h-4 bg-gray-700 rounded w-4/6" />
          <div className="h-8 bg-gray-800 rounded w-full mt-4" />
          <div className="h-4 bg-gray-700 rounded w-5/6" />
          <div className="h-4 bg-gray-700 rounded w-3/6" />
        </div>
      )}

      {error && !data && (
        <div className="text-amber-400 text-sm">
          <p>{error} — metrics below are still live.</p>
          <button
            onClick={fetchSummary}
            className="mt-2 text-blue-400 hover:text-blue-300 underline"
          >
            Retry
          </button>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">
              Summary
            </h3>
            <p className="text-gray-200 leading-relaxed">{data.summary}</p>
          </div>
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">
              Should I buy today?
            </h3>
            <div className="text-gray-200 leading-relaxed whitespace-pre-line">
              {data.shouldIBuy}
            </div>
          </div>
        </div>
      )}

      {!metrics && !loading && (
        <p className="text-gray-500 text-sm">
          Loading market data before generating analysis...
        </p>
      )}
    </div>
  );
}
