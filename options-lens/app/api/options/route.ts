import { NextRequest } from "next/server";
import { getOptionsChain, getExpiries } from "@/lib/yahoo";

export async function GET(request: NextRequest) {
  const expiry = request.nextUrl.searchParams.get("expiry");

  if (!expiry) {
    return Response.json(
      { error: "Missing required parameter: expiry" },
      { status: 400 }
    );
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
    return Response.json(
      { error: "Invalid date format. Use YYYY-MM-DD" },
      { status: 400 }
    );
  }

  // Validate date is a real date
  const parsed = new Date(expiry + "T00:00:00Z");
  if (isNaN(parsed.getTime())) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    // Validate expiry exists in available list
    const { data: validExpiries } = await getExpiries();
    if (!validExpiries.includes(expiry)) {
      return Response.json(
        { error: `Expiry ${expiry} is not available. Valid expiries: ${validExpiries.slice(0, 5).join(", ")}...` },
        { status: 400 }
      );
    }

    const result = await getOptionsChain(expiry);
    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch options chain";
    return Response.json({ error: message }, { status: 500 });
  }
}
