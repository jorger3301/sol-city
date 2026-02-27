// ═══════════════════════════════════════════════════
// VYBE NETWORK API — Token data, wallet PnL, top traders
// Base URL: https://api.vybenetwork.xyz
// Auth: X-API-Key header
// ═══════════════════════════════════════════════════

const VYBE_BASE = 'https://api.vybenetwork.xyz';
const VYBE_API_KEY = process.env.VYBE_API_KEY || '';

interface VybeTokenData {
  volume24h: number;
  price: number;
  price1d: number;
}

export interface VybePnLSummary {
  winRate: number;
  realizedPnlUsd: number | null;
  unrealizedPnlUsd: number | null;
  uniqueTokensTraded: number;
  tradesCount: number;
  tradesVolumeUsd: number;
  bestPerformingToken: {
    tokenSymbol: string;
    mintAddress: string;
    tokenName: string | null;
    tokenLogoUrl: string | null;
    pnlUsd: number;
  } | null;
  worstPerformingToken: {
    tokenSymbol: string;
    mintAddress: string;
    tokenName: string | null;
    tokenLogoUrl: string | null;
    pnlUsd: number;
  } | null;
}

export interface VybeTopTrader {
  accountAddress: string;
  accountName: string | null;
  accountLogoUrl: string | null;
  metrics: {
    realizedPnlUsd: number;
    unrealizedPnlUsd: number;
    winRate: number;
    tradesVolumeUsd: number;
    tradesCount: number;
    uniqueTokensTraded: number;
    bestPerformingToken: {
      tokenSymbol: string;
      mintAddress: string;
      tokenName: string | null;
      tokenLogoUrl: string | null;
      pnlUsd: number;
    } | null;
  };
}

/**
 * Fetch token volume + price data from Vybe for a list of mint addresses.
 * Returns a map of mintAddress → { volume24h, price, price1d }.
 * Skips mints that fail or have no data.
 */
export async function fetchVybeTokenData(
  mints: string[],
): Promise<Record<string, VybeTokenData>> {
  if (!VYBE_API_KEY) {
    console.warn('VYBE_API_KEY not set, skipping Vybe fetch');
    return {};
  }

  const result: Record<string, VybeTokenData> = {};

  for (const mint of mints) {
    try {
      const res = await fetch(`${VYBE_BASE}/v4/tokens/${mint}`, {
        headers: { 'X-API-Key': VYBE_API_KEY },
      });
      if (!res.ok) {
        console.warn(`Vybe token ${mint}: ${res.status}`);
        continue;
      }
      const data = await res.json();
      const volume = data.usdValueVolume24h;
      if (volume != null && volume > 0) {
        result[mint] = {
          volume24h: volume,
          price: data.price ?? 0,
          price1d: data.price1d ?? 0,
        };
      }
    } catch (err) {
      console.warn(`Vybe fetch failed for ${mint}:`, (err as Error).message);
    }
  }

  return result;
}

/**
 * Fetch wallet PnL summary from Vybe.
 * Returns win rate, realized/unrealized PnL, trade stats, best/worst tokens.
 */
export async function fetchVybePnL(
  walletAddress: string,
): Promise<VybePnLSummary | null> {
  if (!VYBE_API_KEY) return null;

  try {
    const res = await fetch(`${VYBE_BASE}/v4/wallets/${walletAddress}/pnl`, {
      headers: { 'X-API-Key': VYBE_API_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.summary ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch top traders from Vybe.
 * Returns array of top traders with PnL metrics.
 */
export async function fetchVybeTopTraders(
  limit = 20,
): Promise<VybeTopTrader[]> {
  if (!VYBE_API_KEY) return [];

  try {
    const res = await fetch(`${VYBE_BASE}/v4/wallets/top-traders`, {
      headers: { 'X-API-Key': VYBE_API_KEY },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []).slice(0, limit);
  } catch {
    return [];
  }
}
