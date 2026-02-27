import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isValidSolanaAddress } from "@/lib/api/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!isValidSolanaAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  const [residentResult, interactionsResult] = await Promise.all([
    sb
      .from("wallet_residents")
      .select("*")
      .eq("wallet_address", address)
      .single(),
    sb
      .from("wallet_protocol_interactions")
      .select("protocol_slug, tx_count, last_interaction_at")
      .eq("wallet_address", address)
      .order("tx_count", { ascending: false }),
  ]);

  if (!residentResult.data) {
    return NextResponse.json({ resident: null, interactions: [] });
  }

  // Update last_seen_at (fire-and-forget)
  sb.from("wallet_residents")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("wallet_address", address)
    .then(() => {}, () => {});

  return NextResponse.json({
    resident: residentResult.data,
    interactions: interactionsResult.data ?? [],
  });
}
