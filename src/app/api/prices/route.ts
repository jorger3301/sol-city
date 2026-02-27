import { NextResponse } from "next/server";
import { fetchJupiterPrices } from "@/lib/api/jupiter";
import { fetchProtocols } from "@/lib/api/defillama";

let cachedProtocols: Awaited<ReturnType<typeof fetchProtocols>> | null = null;
let cacheTs = 0;

export async function GET() {
  try {
    if (!cachedProtocols || Date.now() - cacheTs > 300_000) {
      cachedProtocols = await fetchProtocols();
      cacheTs = Date.now();
    }

    const prices = await fetchJupiterPrices(cachedProtocols);

    return NextResponse.json(
      { prices },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("Prices API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
