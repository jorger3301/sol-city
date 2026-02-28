import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = Math.max(0, parseInt(searchParams.get("from") ?? "0", 10));
  const to = Math.min(
    from + 1000,
    parseInt(searchParams.get("to") ?? "500", 10)
  );

  const sb = getSupabaseAdmin();

  const [protocolsResult, statsResult] = await Promise.all([
    sb
      .from("protocols")
      .select(
        "id, slug, name, category, tvl, change_24h, volume_24h, fees_24h, token_mint, token_price, logo_url, url, rank, claimed, claimed_by"
      )
      .order("rank", { ascending: true })
      .range(from, to - 1),
    sb.from("city_stats").select("*").eq("id", 2).single(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const protocols = (protocolsResult.data ?? []) as Record<string, any>[];

  const raw = statsResult.data;
  const stats = {
    total_protocols: raw?.total_developers ?? 0,
    total_tvl: raw?.total_contributions ?? 0,
  };

  if (protocols.length === 0) {
    return NextResponse.json(
      { protocols: [], stats },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  }

  return NextResponse.json(
    { protocols, stats },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
