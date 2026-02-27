import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { fetchVybePnL } from "@/lib/api/vybe";

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    // Fetch all residents
    const { data: residents } = await sb
      .from("wallet_residents")
      .select("wallet_address, display_name, house_color")
      .order("created_at", { ascending: true })
      .limit(100);

    if (!residents || residents.length === 0) {
      return NextResponse.json(
        { traders: [] },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
      );
    }

    // Fetch PnL for each resident in parallel
    const pnlResults = await Promise.allSettled(
      residents.map((r) => fetchVybePnL(r.wallet_address))
    );

    const traders = residents
      .map((r, i) => {
        const pnl = pnlResults[i].status === "fulfilled" ? pnlResults[i].value : null;
        if (!pnl || pnl.tradesCount === 0) return null;
        return {
          address: r.wallet_address,
          name: r.display_name,
          houseColor: r.house_color,
          pnl: pnl.realizedPnlUsd ?? 0,
          unrealizedPnl: pnl.unrealizedPnlUsd ?? 0,
          winRate: pnl.winRate,
          volume: pnl.tradesVolumeUsd,
          trades: pnl.tradesCount,
          tokensTraded: pnl.uniqueTokensTraded,
          bestToken: pnl.bestPerformingToken
            ? { symbol: pnl.bestPerformingToken.tokenSymbol, pnlUsd: pnl.bestPerformingToken.pnlUsd }
            : null,
          worstToken: pnl.worstPerformingToken
            ? { symbol: pnl.worstPerformingToken.tokenSymbol, pnlUsd: pnl.worstPerformingToken.pnlUsd }
            : null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.pnl - a!.pnl);

    return NextResponse.json(
      { traders },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    console.error("Top traders fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch top traders" },
      { status: 500 }
    );
  }
}
