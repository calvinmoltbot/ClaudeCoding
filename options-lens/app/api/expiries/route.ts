import { getExpiries } from "@/lib/yahoo";

export async function GET() {
  try {
    const result = await getExpiries();
    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch expiry dates";
    return Response.json({ error: message }, { status: 500 });
  }
}
