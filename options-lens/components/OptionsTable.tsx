"use client";

import { useState } from "react";
import { OptionContract } from "@/lib/yahoo";
import InfoTooltip from "./Tooltip";

interface OptionsTableProps {
  calls: OptionContract[];
  puts: OptionContract[];
  spotPrice: number;
  maxPain: number;
}

type SortField = "strike" | "bid" | "ask" | "last" | "volume" | "openInterest" | "impliedVolatility";
type SortDir = "asc" | "desc";

export default function OptionsTable({
  calls,
  puts,
  spotPrice,
  maxPain,
}: OptionsTableProps) {
  const [sortField, setSortField] = useState<SortField>("strike");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const totalCallOI = calls.reduce((s, c) => s + c.openInterest, 0);
  const totalPutOI = puts.reduce((s, p) => s + p.openInterest, 0);
  const pcRatio = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;

  // Build combined rows by strike
  const strikeSet = new Set<number>();
  calls.forEach((c) => strikeSet.add(c.strike));
  puts.forEach((p) => strikeSet.add(p.strike));

  const callMap = new Map(calls.map((c) => [c.strike, c]));
  const putMap = new Map(puts.map((p) => [p.strike, p]));

  const avgVolume =
    [...calls, ...puts].reduce((s, c) => s + c.volume, 0) /
    Math.max([...calls, ...puts].length, 1);

  const allIVs = [...calls, ...puts]
    .map((c) => c.impliedVolatility)
    .filter((iv) => iv > 0);
  const minIV = Math.min(...allIVs, 0);
  const maxIV = Math.max(...allIVs, 1);

  let strikes = Array.from(strikeSet);
  strikes.sort((a, b) => {
    if (sortField === "strike") return sortDir === "asc" ? a - b : b - a;
    const getVal = (strike: number) => {
      const call = callMap.get(strike);
      const put = putMap.get(strike);
      const contract = call || put;
      if (!contract) return 0;
      return contract[sortField] ?? 0;
    };
    const va = getVal(a);
    const vb = getVal(b);
    return sortDir === "asc" ? va - vb : vb - va;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const ivColor = (iv: number) => {
    if (iv <= 0 || maxIV === minIV) return "";
    const pct = (iv - minIV) / (maxIV - minIV);
    if (pct < 0.33) return "text-emerald-400";
    if (pct < 0.66) return "text-amber-400";
    return "text-red-400";
  };

  const isATM = (strike: number) => {
    const diff = Math.abs(strike - spotPrice);
    const minDiff = Math.min(...strikes.map((s) => Math.abs(s - spotPrice)));
    return diff === minDiff;
  };

  const SortHeader = ({
    field,
    label,
  }: {
    field: SortField;
    label: string;
  }) => (
    <th
      className="px-2 py-2 text-xs font-medium text-gray-400 cursor-pointer hover:text-white select-none"
      onClick={() => handleSort(field)}
    >
      {label}
      {sortField === field && (
        <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>
      )}
    </th>
  );

  const ContractCells = ({
    contract,
    isHighVol,
  }: {
    contract: OptionContract | undefined;
    isHighVol: boolean;
  }) => {
    if (!contract) {
      return (
        <>
          <td className="px-2 py-1.5 text-gray-600">—</td>
          <td className="px-2 py-1.5 text-gray-600">—</td>
          <td className="px-2 py-1.5 text-gray-600">—</td>
          <td className="px-2 py-1.5 text-gray-600">—</td>
          <td className="px-2 py-1.5 text-gray-600">—</td>
          <td className="px-2 py-1.5 text-gray-600">—</td>
        </>
      );
    }
    return (
      <>
        <td className="px-2 py-1.5 text-gray-300">
          {contract.bid.toFixed(2)}
        </td>
        <td className="px-2 py-1.5 text-gray-300">
          {contract.ask.toFixed(2)}
        </td>
        <td className="px-2 py-1.5 text-gray-300">
          {contract.last.toFixed(2)}
        </td>
        <td className={`px-2 py-1.5 ${isHighVol ? "text-yellow-300 font-semibold" : "text-gray-300"}`}>
          {contract.volume.toLocaleString()}
          {isHighVol && (
            <span className="ml-1 text-[10px] bg-yellow-500/20 text-yellow-400 px-1 rounded">
              HIGH
            </span>
          )}
        </td>
        <td className="px-2 py-1.5 text-gray-300">
          {contract.openInterest.toLocaleString()}
        </td>
        <td
          className={`px-2 py-1.5 ${ivColor(contract.impliedVolatility)}`}
        >
          {(contract.impliedVolatility * 100).toFixed(1)}%
        </td>
      </>
    );
  };

  return (
    <div>
      {/* Summary bar */}
      <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-800 rounded-lg text-sm">
        <div>
          <span className="text-gray-400">Total Call OI: </span>
          <span className="text-white font-medium">
            {totalCallOI.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Total Put OI: </span>
          <span className="text-white font-medium">
            {totalPutOI.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-gray-400">P/C Ratio: </span>
          <span className="text-white font-medium">{pcRatio.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-400">Max Pain: </span>
          <span className="text-white font-medium">
            ${maxPain.toFixed(0)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm text-right">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr>
              <th
                colSpan={6}
                className="px-2 py-2 text-xs font-semibold text-blue-400 text-center border-b border-gray-700"
              >
                CALLS
              </th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-300 text-center border-b border-gray-700 border-x border-gray-600">
                <div className="flex items-center justify-center gap-1">
                  STRIKE
                  <InfoTooltip text="The price at which the option can be exercised." />
                </div>
              </th>
              <th
                colSpan={6}
                className="px-2 py-2 text-xs font-semibold text-purple-400 text-center border-b border-gray-700"
              >
                PUTS
              </th>
            </tr>
            <tr className="border-b border-gray-700">
              <SortHeader field="bid" label="Bid" />
              <SortHeader field="ask" label="Ask" />
              <SortHeader field="last" label="Last" />
              <SortHeader field="volume" label="Vol" />
              <SortHeader field="openInterest" label="OI" />
              <SortHeader field="impliedVolatility" label="IV" />
              <SortHeader field="strike" label="Strike" />
              <SortHeader field="bid" label="Bid" />
              <SortHeader field="ask" label="Ask" />
              <SortHeader field="last" label="Last" />
              <SortHeader field="volume" label="Vol" />
              <SortHeader field="openInterest" label="OI" />
              <SortHeader field="impliedVolatility" label="IV" />
            </tr>
          </thead>
          <tbody>
            {strikes.map((strike) => {
              const call = callMap.get(strike);
              const put = putMap.get(strike);
              const atm = isATM(strike);
              const isMaxPain = strike === maxPain;
              const callHighVol = call
                ? call.volume > avgVolume * 2
                : false;
              const putHighVol = put
                ? put.volume > avgVolume * 2
                : false;

              return (
                <tr
                  key={strike}
                  className={`border-b border-gray-800 hover:bg-gray-800/50 ${
                    atm ? "bg-blue-500/10 border-blue-500/30" : ""
                  }`}
                >
                  <ContractCells contract={call} isHighVol={callHighVol} />
                  <td
                    className={`px-2 py-1.5 text-center font-medium border-x border-gray-700 ${
                      atm ? "text-blue-400 font-bold" : "text-white"
                    }`}
                  >
                    ${strike.toFixed(0)}
                    {isMaxPain && (
                      <span className="ml-1 text-[10px]" title="Max Pain">
                        📌
                      </span>
                    )}
                  </td>
                  <ContractCells contract={put} isHighVol={putHighVol} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
