import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getWalletSession } from "@/lib/wallet-session";
import { isValidSolanaAddress } from "@/lib/api/utils";

const VALID_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function PATCH(request: Request) {
  const walletAddress = await getWalletSession();
  if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { house_color } = body;

  if (!house_color || !VALID_COLOR.test(house_color)) {
    return NextResponse.json({ error: "Invalid color format" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("wallet_residents")
    .update({ house_color })
    .eq("wallet_address", walletAddress)
    .select("wallet_address, house_color")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ resident: data });
}
