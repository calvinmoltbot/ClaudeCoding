"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend,
} from "recharts";

interface GexChartProps {
  data: { strike: number; callGex: number; putGex: number }[];
  spotPrice: number;
  gammaFlipLevel: number;
}

export default function GexChart({
  data,
  spotPrice,
  gammaFlipLevel,
}: GexChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        No GEX data available
      </div>
    );
  }

  // Filter to strikes within range and add net column
  const filtered = data
    .filter(
      (d) => d.strike > spotPrice * 0.8 && d.strike < spotPrice * 1.2
    )
    .map((d) => ({
      ...d,
      netGex: d.callGex + d.putGex,
      callGexM: d.callGex / 1e6,
      putGexM: d.putGex / 1e6,
    }));

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        Gamma Exposure (GEX)
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={filtered}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="strike"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            tickFormatter={(v) => `$${v}`}
          />
          <YAxis
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            tickFormatter={(v) => `${v.toFixed(0)}M`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1F2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              color: "#E5E7EB",
            }}
            formatter={(value) => [
              `$${Number(value).toFixed(1)}M`,
            ]}
            labelFormatter={(label) => `Strike: $${label}`}
          />
          <Legend />
          <ReferenceLine y={0} stroke="#6B7280" />
          <ReferenceLine
            x={spotPrice}
            stroke="#3B82F6"
            strokeDasharray="5 5"
            label={{
              value: "Price",
              fill: "#3B82F6",
              fontSize: 11,
            }}
          />
          <ReferenceLine
            x={gammaFlipLevel}
            stroke="#F97316"
            strokeDasharray="5 5"
            label={{
              value: "Flip",
              fill: "#F97316",
              fontSize: 11,
            }}
          />
          <Bar dataKey="callGexM" name="Call GEX" stackId="gex">
            {filtered.map((entry, index) => (
              <Cell
                key={`call-${index}`}
                fill={entry.callGexM >= 0 ? "#10B981" : "#EF4444"}
              />
            ))}
          </Bar>
          <Bar dataKey="putGexM" name="Put GEX" stackId="gex">
            {filtered.map((entry, index) => (
              <Cell
                key={`put-${index}`}
                fill={entry.putGexM >= 0 ? "#10B981" : "#EF4444"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
