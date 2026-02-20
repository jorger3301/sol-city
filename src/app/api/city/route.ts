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

  const [devsResult, statsResult] = await Promise.all([
    sb
      .from("developers")
      .select(
        "id, github_login, name, avatar_url, contributions, total_stars, public_repos, primary_language, rank, claimed"
      )
      .order("rank", { ascending: true })
      .range(from, to - 1),
    sb.from("city_stats").select("*").eq("id", 1).single(),
  ]);

  return NextResponse.json({
    developers: devsResult.data ?? [],
    stats: statsResult.data ?? {
      total_developers: 0,
      total_contributions: 0,
    },
  });
}
