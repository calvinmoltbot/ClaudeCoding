"use client";

import { Signal } from "@/lib/signals";
import InfoTooltip from "./Tooltip";

interface SignalCardProps {
  signal: Signal;
  children?: React.ReactNode;
}

const colorMap = {
  green: {
    pill: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    pillText: "Looks good",
    border: "border-emerald-500/20",
  },
  yellow: {
    pill: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    pillText: "Be patient",
    border: "border-amber-500/20",
  },
  red: {
    pill: "bg-red-500/20 text-red-400 border-red-500/30",
    pillText: "Not yet",
    border: "border-red-500/20",
  },
};

export default function SignalCard({ signal, children }: SignalCardProps) {
  const colors = colorMap[signal.color];

  return (
    <div
      className={`bg-gray-900 border ${colors.border} rounded-xl p-5 flex flex-col gap-3`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-400 font-medium">
            {signal.label}
          </span>
          {signal.tooltip && <InfoTooltip text={signal.tooltip} />}
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${colors.pill}`}
        >
          {colors.pillText}
        </span>
      </div>
      <div className="text-2xl font-bold text-white">{signal.value}</div>
      {children}
      <p className="text-sm text-gray-400 leading-relaxed">
        {signal.explanation}
      </p>
    </div>
  );
}
