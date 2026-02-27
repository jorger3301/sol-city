// ═══════════════════════════════════════════════════
// JUPITER API — Token prices, trending, top traded
// Free tier: ~60 req/min (lite-api.jup.ag)
// ═══════════════════════════════════════════════════

import type { Protocol, JupiterPriceResult } from './types';
import { PROTOCOL_MINTS, SOL_MINT } from './registry';

const JUPITER_BASE = process.env.NEXT_PUBLIC_JUPITER_BASE || 'https://lite-api.jup.ag';
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v3';
const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY || '';

// ── Batch price fetch (up to 50 mints per call) — Jupiter v3 ──
export async function fetchJupiterPrices(
  protocols: Protocol[]
): Promise<Record<string, JupiterPriceResult>> {
  try {
    const mintEntries: [string, string][] = [];
    for (const p of protocols) {
      const mint = p.tokenMint || PROTOCOL_MINTS[p.slug];
      if (mint) mintEntries.push([p.slug, mint]);
    }
    if (mintEntries.length === 0) return {};

    const allMints = [...mintEntries.map(([, m]) => m), SOL_MINT];
    const ids = allMints.join(',');

    const headers: Record<string, string> = {};
    if (JUPITER_API_KEY) headers['x-api-key'] = JUPITER_API_KEY;

    const res = await fetch(`${JUPITER_PRICE_API}?ids=${ids}`, { headers });
    if (!res.ok) throw new Error(`Jupiter ${res.status}`);
    const json = await res.json();

    // v3 returns { [mint]: { usdPrice, ... } } directly (no .data wrapper)
    const result: Record<string, JupiterPriceResult> = {};
    for (const [slug, mint] of mintEntries) {
      const d = json[mint];
      if (d) {
        result[slug] = { mint, price: Number(d.usdPrice) };
      }
    }
    // SOL price under special key
    const solData = json[SOL_MINT];
    if (solData) {
      result['__SOL__'] = { mint: SOL_MINT, price: Number(solData.usdPrice) };
    }
    return result;
  } catch (err) {
    console.warn('Jupiter price fetch failed:', err);
    return {};
  }
}

// ── Top trending tokens (1h window) ──
export interface TrendingToken {
  mint: string;
  name: string;
  symbol: string;
  volume24h?: number;
}

export async function fetchTopTrending(limit = 20): Promise<TrendingToken[]> {
  try {
    const res = await fetch(`${JUPITER_BASE}/tokens/v2/toptrending/1h?limit=${limit}`);
    if (!res.ok) throw new Error(`Jupiter trending ${res.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await res.json();
    return data.map((t) => ({
      mint: t.mint || t.address,
      name: t.name || '',
      symbol: t.symbol || '',
      volume24h: t.volume24h ?? undefined,
    }));
  } catch (err) {
    console.warn('Jupiter trending fetch failed:', err);
    return [];
  }
}

// ── Top traded tokens (24h window) ──
export async function fetchTopTraded(limit = 30): Promise<TrendingToken[]> {
  try {
    const res = await fetch(`${JUPITER_BASE}/tokens/v2/toptraded/24h?limit=${limit}`);
    if (!res.ok) throw new Error(`Jupiter top traded ${res.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await res.json();
    return data.map((t) => ({
      mint: t.mint || t.address,
      name: t.name || '',
      symbol: t.symbol || '',
      volume24h: t.volume24h ?? undefined,
    }));
  } catch (err) {
    console.warn('Jupiter top traded fetch failed:', err);
    return [];
  }
}
