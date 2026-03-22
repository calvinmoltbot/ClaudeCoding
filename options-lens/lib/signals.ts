export type SignalColor = "green" | "yellow" | "red";

export interface Signal {
  label: string;
  value: string;
  color: SignalColor;
  explanation: string;
  tooltip?: string;
}

export function getIVRankSignal(ivRank: number): Signal {
  let color: SignalColor;
  let explanation: string;
  if (ivRank < 30) {
    color = "green";
    explanation =
      "Options are cheap right now — the market is calm. This can be a good time to enter a position since you're not paying a fear premium.";
  } else if (ivRank <= 60) {
    color = "yellow";
    explanation =
      "Options are fairly priced — neither cheap nor expensive. No strong signal either way.";
  } else {
    color = "red";
    explanation =
      "Options are expensive right now — the market is nervous. You'd be paying a premium to buy in. Better to wait for things to calm down.";
  }
  return {
    label: "IV Rank",
    value: `${ivRank.toFixed(0)}`,
    color,
    explanation,
    tooltip:
      "Where today's volatility sits compared to the past year. High = options are expensive.",
  };
}

export function getPutCallSignal(ratio: number): Signal {
  let color: SignalColor;
  let explanation: string;
  if (ratio < 0.7) {
    color = "green";
    explanation =
      "More people are betting on the price rising than falling. That's a sign of confidence — bullish sentiment.";
  } else if (ratio <= 1.1) {
    color = "yellow";
    explanation =
      "Bets on rising and falling are roughly balanced. No strong lean either way — the market is undecided.";
  } else {
    color = "red";
    explanation =
      "More people are betting on the price falling than rising. That's a sign of fear — often worth waiting for this to flip before jumping in.";
  }
  return {
    label: "Put/Call Ratio",
    value: ratio.toFixed(2),
    color,
    explanation,
    tooltip:
      "Compares bearish bets to bullish bets. Above 1 means more people expect a drop.",
  };
}

export function getMaxPainSignal(
  gapPercent: number,
  maxPain: number,
  spotPrice: number
): Signal {
  let color: SignalColor;
  let explanation: string;
  if (gapPercent < 2) {
    color = "green";
    explanation = `The options market suggests $${maxPain.toFixed(0)} is the gravity point. The current price ($${spotPrice.toFixed(2)}) is close — often a sign of short-term stability.`;
  } else if (gapPercent <= 5) {
    color = "yellow";
    explanation = `Max pain is at $${maxPain.toFixed(0)}, about ${gapPercent.toFixed(1)}% from the current price. Some pull toward that level is expected as options expire.`;
  } else {
    color = "red";
    explanation = `The price is ${gapPercent.toFixed(1)}% away from the max pain gravity point at $${maxPain.toFixed(0)}. Expect some drift toward it, which could mean a short-term move.`;
  }
  return {
    label: "Max Pain",
    value: `$${maxPain.toFixed(0)}`,
    color,
    explanation,
    tooltip:
      "The price where option sellers lose the least — the market tends to drift toward this.",
  };
}

export function getGEXSignal(netGex: number): Signal {
  let color: SignalColor;
  let explanation: string;
  const normalized = netGex / 1e9; // Display in billions
  if (netGex > 0) {
    color = "green";
    explanation =
      "Market makers are dampening moves — the price is likely to stay pinned in a range. Good for stability, less exciting for day traders.";
  } else if (Math.abs(normalized) < 0.1) {
    color = "yellow";
    explanation =
      "The market is in a neutral gamma zone — could go either way. Neither pinned nor accelerating.";
  } else {
    color = "red";
    explanation =
      "The market is in acceleration mode — moves up and down will be bigger than normal. Good for day traders, riskier for someone buying to hold.";
  }
  return {
    label: "Net GEX",
    value:
      Math.abs(normalized) >= 1
        ? `${normalized.toFixed(1)}B`
        : `${(normalized * 1000).toFixed(0)}M`,
    color,
    explanation,
    tooltip:
      "Measures whether market makers will amplify or dampen price moves.",
  };
}

export function getExpectedMoveSignal(
  dollar: number,
  percent: number,
  spotPrice: number
): Signal {
  let color: SignalColor;
  let explanation: string;
  if (percent < 3) {
    color = "green";
    explanation = `The market expects Nvidia to swing by about $${dollar.toFixed(2)} (${percent.toFixed(1)}%). That's relatively calm — low uncertainty.`;
  } else if (percent <= 6) {
    color = "yellow";
    explanation = `The market expects Nvidia to swing by about $${dollar.toFixed(2)} — roughly ${percent.toFixed(1)}%. That's quite a lot, suggesting some uncertainty.`;
  } else {
    color = "red";
    explanation = `The market expects a big swing of $${dollar.toFixed(2)} (${percent.toFixed(1)}%). That's high uncertainty — the price could move significantly in either direction.`;
  }
  return {
    label: "Expected Move",
    value: `±$${dollar.toFixed(2)}`,
    color,
    explanation,
    tooltip: "How far the market thinks the stock could swing by expiry.",
  };
}

export function getSkewSignal(skew: number): Signal {
  let color: SignalColor;
  let explanation: string;
  if (skew < 2) {
    color = "green";
    explanation =
      "Balanced fear — traders aren't paying extra to protect against drops. No crash hedging demand, which is a calm sign.";
  } else if (skew <= 5) {
    color = "yellow";
    explanation =
      "Mild downside hedging — traders are paying a bit more to protect against drops. That's normal caution, not alarm.";
  } else {
    color = "red";
    explanation =
      "Heavy downside hedging — traders are paying significantly more for downside protection. They expect a potential drop.";
  }
  return {
    label: "Volatility Skew",
    value: `${skew.toFixed(1)}%`,
    color,
    explanation,
    tooltip:
      "Whether traders are paying more to protect against drops vs betting on gains.",
  };
}

export function getIVSentiment(
  ivRank: number
): "low" | "normal" | "elevated" | "high" {
  if (ivRank < 25) return "low";
  if (ivRank < 50) return "normal";
  if (ivRank < 75) return "elevated";
  return "high";
}
