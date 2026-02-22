import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_SKY_ADS, type SkyAd } from "@/lib/skyAds";

export async function GET() {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("sky_ads")
      .select("id, brand, text, description, color, bg_color, link, vehicle, priority")
      .eq("active", true)
      .or("starts_at.is.null,starts_at.lte.now()")
      .or("ends_at.is.null,ends_at.gt.now()")
      .order("priority", { ascending: false });

    if (error || !data || data.length === 0) {
      return NextResponse.json(DEFAULT_SKY_ADS, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
      });
    }

    const ads: SkyAd[] = data.map((row) => ({
      id: row.id,
      brand: row.brand,
      text: row.text,
      description: row.description,
      color: row.color,
      bgColor: row.bg_color,
      link: row.link,
      vehicle: row.vehicle,
      priority: row.priority,
    }));

    return NextResponse.json(ads, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json(DEFAULT_SKY_ADS, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  }
}
