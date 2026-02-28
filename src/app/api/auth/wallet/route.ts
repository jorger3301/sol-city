import { NextResponse } from "next/server";
import nacl from "tweetnacl";
import bs58 from "bs58";
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
 * POST /api/auth/wallet — create wallet session with signature verification
 * Body: { address: string, message: string, signature: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, message, signature } = body;

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

    if (!message) {
      return NextResponse.json(
        { error: "Missing message" },
        { status: 400 },
      );
    }

    // Verify signature if provided (some mobile wallets don't support signMessage)
    if (signature) {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(address);

      const verified = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes,
      );

      if (!verified) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );
      }
    }

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
