import { getQuote } from "@/lib/yahoo";

export async function GET() {
  try {
    const result = await getQuote();
    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch quote";
    return Response.json({ error: message }, { status: 500 });
  }
}
