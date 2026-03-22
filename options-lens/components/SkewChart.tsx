"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Legend,
} from "recharts";

interface SkewChartProps {
  data: { strike: number; callIV: number; putIV: number }[];
  spotPrice: number;
  maxPain: number;
}

export default function SkewChart({ data, spotPrice, maxPain }: SkewChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        No skew data available
      </div>
    );
  }

  // Filter to strikes within reasonable range of spot
  const filtered = data.filter(
    (d) => d.strike > spotPrice * 0.7 && d.strike < spotPrice * 1.3
  );

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        Volatility Skew
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={filtered}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="strike"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            tickFormatter={(v) => `$${v}`}
          />
          <YAxis
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1F2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              color: "#E5E7EB",
            }}
            formatter={(value) => [`${Number(value).toFixed(1)}%`]}
            labelFormatter={(label) => `Strike: $${label}`}
          />
          <Legend />
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
            x={maxPain}
            stroke="#F59E0B"
            strokeDasharray="5 5"
            label={{
              value: "Max Pain",
              fill: "#F59E0B",
              fontSize: 11,
            }}
          />
          <Area
            type="monotone"
            dataKey="callIV"
            fill="transparent"
            stroke="transparent"
          />
          <Area
            type="monotone"
            dataKey="putIV"
            fill="rgba(139, 92, 246, 0.1)"
            stroke="transparent"
          />
          <Line
            type="monotone"
            dataKey="callIV"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            name="Call IV"
          />
          <Line
            type="monotone"
            dataKey="putIV"
            stroke="#8B5CF6"
            strokeWidth={2}
            dot={false}
            name="Put IV"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
