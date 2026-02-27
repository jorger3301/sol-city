import { NextResponse } from "next/server";
import { fetchWallet } from "@/lib/api/helius";
import { fetchVybePnL } from "@/lib/api/vybe";
import { isValidSolanaAddress } from "@/lib/api/utils";
import type { WalletPnL } from "@/lib/api/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!isValidSolanaAddress(address)) {
    return NextResponse.json(
      { error: "Invalid Solana address" },
      { status: 400 }
    );
  }

  try {
    const [wallet, pnlRaw] = await Promise.all([
      fetchWallet(address),
      fetchVybePnL(address),
    ]);

    // Shape PnL into a clean format
    let pnl: WalletPnL | undefined;
    if (pnlRaw && pnlRaw.tradesCount > 0) {
      pnl = {
        winRate: pnlRaw.winRate,
        realizedPnlUsd: pnlRaw.realizedPnlUsd,
        unrealizedPnlUsd: pnlRaw.unrealizedPnlUsd,
        uniqueTokensTraded: pnlRaw.uniqueTokensTraded,
        tradesCount: pnlRaw.tradesCount,
        tradesVolumeUsd: pnlRaw.tradesVolumeUsd,
        bestToken: pnlRaw.bestPerformingToken
          ? { symbol: pnlRaw.bestPerformingToken.tokenSymbol, pnlUsd: pnlRaw.bestPerformingToken.pnlUsd }
          : null,
        worstToken: pnlRaw.worstPerformingToken
          ? { symbol: pnlRaw.worstPerformingToken.tokenSymbol, pnlUsd: pnlRaw.worstPerformingToken.pnlUsd }
          : null,
      };
    }

    return NextResponse.json(
      { wallet: { ...wallet, pnl } },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    console.error(`Wallet lookup error [${address}]:`, err);
    return NextResponse.json(
      { error: "Failed to fetch wallet data" },
      { status: 500 }
    );
  }
}
