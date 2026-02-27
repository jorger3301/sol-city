import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabaseAdmin();

  const { data: residents, error } = await sb
    .from("wallet_residents")
    .select("wallet_address, display_name, house_style, house_color, created_at")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("Failed to fetch residents:", error);
    return NextResponse.json({ residents: [] });
  }

  return NextResponse.json(
    { residents: residents ?? [] },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
