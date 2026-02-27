import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getWalletSession } from "@/lib/wallet-session";
import { isValidSolanaAddress } from "@/lib/api/utils";
import { detectProtocolInteractions } from "@/lib/api/detect-interactions";

export async function POST() {
  const walletAddress = await getWalletSession();
  if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();

  // Check if already a resident
  const { data: existing } = await sb
    .from("wallet_residents")
    .select("id")
    .eq("wallet_address", walletAddress)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already claimed", resident: existing }, { status: 409 });
  }

  // Create resident record
  const { data: resident, error: resErr } = await sb
    .from("wallet_residents")
    .insert({
      wallet_address: walletAddress,
      house_style: "default",
    })
    .select()
    .single();

  if (resErr) {
    console.error("Failed to create resident:", resErr);
    return NextResponse.json({ error: "Failed to claim house" }, { status: 500 });
  }

  // Detect and store protocol interactions
  const interactions = await detectProtocolInteractions(walletAddress, sb);

  return NextResponse.json({
    resident,
    interactions,
  });
}

// Refresh interactions for an existing resident
export async function PUT() {
  const walletAddress = await getWalletSession();
  if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();

  // Must be an existing resident
  const { data: resident } = await sb
    .from("wallet_residents")
    .select("id")
    .eq("wallet_address", walletAddress)
    .single();

  if (!resident) {
    return NextResponse.json({ error: "Not a resident" }, { status: 404 });
  }

  // Re-detect and upsert protocol interactions
  const interactions = await detectProtocolInteractions(walletAddress, sb);

  return NextResponse.json({ interactions });
}
