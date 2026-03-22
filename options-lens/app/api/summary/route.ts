import { NextRequest } from "next/server";

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const summaryCache = new Map<string, CacheEntry>();
const FIVE_MIN = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const metrics = await request.json();

    // Simple cache key from key metrics
    const cacheKey = `${metrics.spotPrice}-${metrics.ivRank?.toFixed(0)}-${metrics.putCallRatio?.toFixed(2)}`;
    const cached = summaryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < FIVE_MIN) {
      return Response.json(cached.data);
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === "your_key_here") {
      return Response.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response: Response;
    try {
      response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "NVDA Options Lens",
          },
          body: JSON.stringify({
            model: "deepseek/deepseek-chat",
            max_tokens: 400,
            temperature: 0.4,
            messages: [
              {
                role: "system",
                content: `You are a friendly financial educator helping a non-expert understand stock options data. Write in plain English — no jargon. Be direct and honest. Never use phrases like "it is important to note". Just explain what the data means practically. Always end with: "This is educational, not financial advice. Do your own research before investing." Never recommend specific position sizes or strike prices.`,
              },
              {
                role: "user",
                content: `Here is the current NVDA options data: ${JSON.stringify(metrics)}
Write two things:
1. A "summary" — 3-4 sentences explaining what these signals mean for someone thinking about investing in Nvidia over the next 12 months. Mention only the most important signals.
2. A "shouldIBuy" — start with one of: "Consider entering", "Wait a little longer", or "Not the right time" — then 2 bullet points explaining why, and 1 bullet point saying what would change the signal.
Return only valid JSON: { "summary": "...", "shouldIBuy": "..." }`,
              },
            ],
          }),
          signal: controller.signal,
        }
      );
    } catch {
      // Try fallback model
      try {
        response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "http://localhost:3000",
              "X-Title": "NVDA Options Lens",
            },
            body: JSON.stringify({
              model: "google/gemini-flash-2.0",
              max_tokens: 400,
              temperature: 0.4,
              messages: [
                {
                  role: "system",
                  content: `You are a friendly financial educator helping a non-expert understand stock options data. Write in plain English — no jargon. Be direct and honest. Never use phrases like "it is important to note". Just explain what the data means practically. Always end with: "This is educational, not financial advice. Do your own research before investing." Never recommend specific position sizes or strike prices.`,
                },
                {
                  role: "user",
                  content: `Here is the current NVDA options data: ${JSON.stringify(metrics)}
Write two things:
1. A "summary" — 3-4 sentences explaining what these signals mean for someone thinking about investing in Nvidia over the next 12 months. Mention only the most important signals.
2. A "shouldIBuy" — start with one of: "Consider entering", "Wait a little longer", or "Not the right time" — then 2 bullet points explaining why, and 1 bullet point saying what would change the signal.
Return only valid JSON: { "summary": "...", "shouldIBuy": "..." }`,
                },
              ],
            }),
            signal: controller.signal,
          }
        );
      } catch {
        clearTimeout(timeout);
        return Response.json(
          { error: "AI summary temporarily unavailable" },
          { status: 503 }
        );
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!response!.ok) {
      return Response.json(
        { error: "AI summary temporarily unavailable" },
        { status: 503 }
      );
    }

    const result = await response!.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return Response.json(
        { error: "AI returned empty response" },
        { status: 502 }
      );
    }

    // Try to parse JSON from the response
    let parsed;
    try {
      // Extract JSON from possible markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      parsed = { summary: content, shouldIBuy: "" };
    }

    summaryCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
    return Response.json(parsed);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate summary";
    return Response.json({ error: message }, { status: 500 });
  }
}
