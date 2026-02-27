import { NextResponse } from "next/server";
import { fetchTopTrending, fetchTopTraded } from "@/lib/api/jupiter";

export async function GET() {
  try {
    const [trending, topTraded] = await Promise.all([
      fetchTopTrending(20),
      fetchTopTraded(30),
    ]);

    return NextResponse.json(
      { trending, topTraded },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=240",
        },
      }
    );
  } catch (err) {
    console.error("Trending API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch trending" },
      { status: 500 }
    );
  }
}
