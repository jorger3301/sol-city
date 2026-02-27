import { NextResponse } from "next/server";
import { isValidSolanaAddress } from "@/lib/api/utils";
import {
  getWalletSession,
  setWalletSession,
  clearWalletSession,
} from "@/lib/wallet-session";

/**
 * GET /api/auth/wallet — check current wallet session
 */
export async function GET() {
  const address = await getWalletSession();
  if (!address) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({ authenticated: true, address });
}

/**
 * POST /api/auth/wallet — create wallet session
 * Body: { address: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Missing wallet address" },
        { status: 400 },
      );
    }

    if (!isValidSolanaAddress(address)) {
      return NextResponse.json(
        { error: "Invalid Solana address" },
        { status: 400 },
      );
    }

    // TODO: For production, add signature verification here:
    // 1. Client signs a nonce/message with wallet private key
    // 2. Server verifies the signature matches the claimed address
    // This prevents address spoofing.

    await setWalletSession(address);
    return NextResponse.json({ authenticated: true, address });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}

/**
 * DELETE /api/auth/wallet — clear wallet session
 */
export async function DELETE() {
  await clearWalletSession();
  return NextResponse.json({ authenticated: false });
}
