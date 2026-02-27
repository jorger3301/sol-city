// ═══════════════════════════════════════════════════
// DEFILLAMA API — Protocol TVL, categories, historical
// All endpoints are free, no API key needed
// ═══════════════════════════════════════════════════

import type { Protocol } from './types';
import { mapCategory } from './registry';

const DEFILLAMA_BASE = 'https://api.llama.fi';

// ── Fetch all Solana protocols with $10K+ TVL ──
export async function fetchProtocols(): Promise<Protocol[]> {
  try {
    const res = await fetch(`${DEFILLAMA_BASE}/protocols`);
    if (!res.ok) throw new Error(`DeFiLlama ${res.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await res.json();

    const solanaProtocols = data
      .filter((p) =>
        p.chains?.includes('Solana') &&
        (p.chainTvls?.Solana ?? p.tvl) > 100_000
      )
      .map((p): Protocol => ({
        name: p.name,
        slug: p.slug,
        category: mapCategory(p.category),
        tvl: p.chainTvls?.Solana ?? p.tvl,
        change24h: p.change_1d ?? undefined,
        chain: 'Solana',
        logoUrl: p.logo ?? undefined,
        url: p.url ?? undefined,
      }))
      .sort((a, b) => b.tvl - a.tvl);

    if (solanaProtocols.length < 5) throw new Error('Too few protocols returned');
    return solanaProtocols;
  } catch (err) {
    console.warn('DeFiLlama fetch failed, using mock data:', err);
    return MOCK_PROTOCOLS;
  }
}

// ── Fetch single protocol detail (TVL history) ──
export async function fetchProtocolDetail(slug: string) {
  try {
    const res = await fetch(`${DEFILLAMA_BASE}/protocol/${slug}`);
    if (!res.ok) throw new Error(`DeFiLlama protocol ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`DeFiLlama protocol/${slug} failed:`, err);
    return null;
  }
}

// ── Fetch TVL chart data (last 30 data points) ──
const tvlChartCache = new Map<string, { data: number[]; ts: number }>();

export async function fetchProtocolTvlChart(slug: string): Promise<number[]> {
  const cached = tvlChartCache.get(slug);
  if (cached && Date.now() - cached.ts < 300_000) return cached.data;

  try {
    const res = await fetch(`${DEFILLAMA_BASE}/protocol/${slug}`);
    if (!res.ok) throw new Error(`DeFiLlama chart ${res.status}`);
    const json = await res.json();

    const chainTvls = json.chainTvls?.Solana?.tvl || json.tvl || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const points: number[] = chainTvls
      .slice(-30)
      .map((d: any) => d.totalLiquidityUSD ?? d.tvl ?? 0);

    tvlChartCache.set(slug, { data: points, ts: Date.now() });
    return points;
  } catch (err) {
    console.warn('TVL chart fetch failed:', err);
    return [];
  }
}

// ── Fetch total Solana TVL ──
export async function fetchSolanaTotalTvl(): Promise<number> {
  try {
    const res = await fetch(`${DEFILLAMA_BASE}/v2/chains`);
    if (!res.ok) throw new Error(`DeFiLlama chains ${res.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chains: any[] = await res.json();
    const solana = chains.find((c) => c.name === 'Solana');
    return solana?.tvl ?? 0;
  } catch (err) {
    console.warn('Solana total TVL fetch failed:', err);
    return 0;
  }
}

// ═══════════════════════════════════════════════════
// MOCK DATA — Fallback when APIs fail
// ═══════════════════════════════════════════════════

export const MOCK_PROTOCOLS: Protocol[] = [
  { name: 'Jupiter', slug: 'jupiter', category: 'DEX', tvl: 2_100_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/jupiter.png' },
  { name: 'Raydium', slug: 'raydium', category: 'DEX', tvl: 1_800_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/raydium.png' },
  { name: 'Marinade', slug: 'marinade-finance', category: 'Liquid Staking', tvl: 1_500_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/marinade-finance.png' },
  { name: 'Jito', slug: 'jito', category: 'Liquid Staking', tvl: 1_400_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/jito.png' },
  { name: 'Solend', slug: 'solend', category: 'Lending', tvl: 900_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/solend.png' },
  { name: 'Drift', slug: 'drift', category: 'Perps', tvl: 750_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/drift.png' },
  { name: 'Orca', slug: 'orca', category: 'DEX', tvl: 650_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/orca.png' },
  { name: 'Marginfi', slug: 'marginfi', category: 'Lending', tvl: 600_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/marginfi.png' },
  { name: 'Kamino', slug: 'kamino', category: 'Yield', tvl: 550_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/kamino.png' },
  { name: 'Tensor', slug: 'tensor', category: 'NFT', tvl: 320_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/tensor.png' },
  { name: 'Zeta', slug: 'zeta-markets', category: 'Perps', tvl: 280_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/zeta-markets.png' },
  { name: 'Phoenix', slug: 'phoenix', category: 'DEX', tvl: 240_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/phoenix.png' },
  { name: 'Parcl', slug: 'parcl', category: 'Perps', tvl: 200_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/parcl.png' },
  { name: 'Sanctum', slug: 'sanctum', category: 'Liquid Staking', tvl: 180_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/sanctum.png' },
  { name: 'Helium', slug: 'helium', category: 'Payments', tvl: 160_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/helium.png' },
  { name: 'Meteora', slug: 'meteora', category: 'DEX', tvl: 140_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/meteora.png' },
  { name: 'Pump.fun', slug: 'pump-fun', category: 'Launchpad', tvl: 120_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/pump-fun.png' },
  { name: 'Hubble', slug: 'hubble', category: 'Lending', tvl: 80_000_000, chain: 'Solana', logoUrl: 'https://icons.llama.fi/hubble.png' },
];
