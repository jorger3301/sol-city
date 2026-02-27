import { NextResponse } from "next/server";
import { fetchProtocols } from "@/lib/api/defillama";
import { fetchJupiterPrices } from "@/lib/api/jupiter";

export async function GET() {
  try {
    const protocols = await fetchProtocols();
    const prices = await fetchJupiterPrices(protocols);

    const enriched = protocols.map((p) => {
      const priceData = prices[p.slug];
      return {
        ...p,
        tokenPrice: priceData?.price ?? undefined,
        tokenMint: priceData?.mint ?? undefined,
      };
    });

    const solPrice = prices["__SOL__"]?.price ?? 0;

    return NextResponse.json(
      { protocols: enriched, solPrice },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    console.error("Protocols API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch protocols" },
      { status: 500 }
    );
  }
}
