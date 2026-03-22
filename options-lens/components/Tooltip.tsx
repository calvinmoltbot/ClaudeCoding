"use client";

import { useState } from "react";

interface TooltipProps {
  text: string;
}

export default function InfoTooltip({ text }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-block ml-1">
      <button
        className="text-gray-400 hover:text-gray-200 text-xs font-bold w-4 h-4 rounded-full border border-gray-500 inline-flex items-center justify-center cursor-help"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        aria-label="More info"
      >
        ?
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 text-xs text-gray-200 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-600" />
        </div>
      )}
    </span>
  );
}
