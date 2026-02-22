import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";

const OWNER_LOGIN = "srizzon";

export async function GET(request: Request) {
  // Auth check
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const login = (
    user.user_metadata.user_name ??
    user.user_metadata.preferred_username ??
    ""
  ).toLowerCase();
  if (login !== OWNER_LOGIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "30d";

  // Refresh materialized view (ignore errors - view may be empty on first run)
  try { await admin.rpc("refresh_sky_ad_stats"); } catch {}

  // Build date filter
  let dayFilter: string | null = null;
  if (period === "7d") {
    dayFilter = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  } else if (period === "30d") {
    dayFilter = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  }

  // Query aggregated stats
  let query = admin.from("sky_ad_daily_stats").select("ad_id, day, impressions, clicks, cta_clicks");
  if (dayFilter) {
    query = query.gte("day", dayFilter);
  }
  const { data: stats, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get all ads for brand names
  const { data: allAds } = await admin.from("sky_ads").select("id, brand, active, vehicle");
  const adMap = new Map((allAds ?? []).map((a) => [a.id, a]));

  // Aggregate by ad_id
  const aggregated = new Map<string, { impressions: number; clicks: number; cta_clicks: number }>();
  for (const row of stats ?? []) {
    const cur = aggregated.get(row.ad_id) ?? { impressions: 0, clicks: 0, cta_clicks: 0 };
    cur.impressions += Number(row.impressions);
    cur.clicks += Number(row.clicks);
    cur.cta_clicks += Number(row.cta_clicks);
    aggregated.set(row.ad_id, cur);
  }

  const ads = Array.from(aggregated.entries()).map(([id, s]) => {
    const ad = adMap.get(id);
    const totalClicks = s.clicks + s.cta_clicks;
    return {
      id,
      brand: ad?.brand ?? id,
      vehicle: ad?.vehicle ?? "plane",
      active: ad?.active ?? false,
      impressions: s.impressions,
      clicks: s.clicks,
      cta_clicks: s.cta_clicks,
      ctr: s.impressions > 0 ? ((totalClicks / s.impressions) * 100).toFixed(2) + "%" : "0%",
    };
  });

  // Include ads with zero events
  for (const [id, ad] of adMap) {
    if (!aggregated.has(id)) {
      ads.push({
        id,
        brand: ad.brand,
        vehicle: ad.vehicle,
        active: ad.active,
        impressions: 0,
        clicks: 0,
        cta_clicks: 0,
        ctr: "0%",
      });
    }
  }

  return NextResponse.json({ ads });
}
