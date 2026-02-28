import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { fetchMintPrices } from "@/lib/api/jupiter";

// ═══════════════════════════════════════════════════
// CRON: Sync protocol data (TVL, volumes, fees, prices)
// Called by Vercel Cron every hour
// ═══════════════════════════════════════════════════

const CRON_SECRET = process.env.CRON_SECRET || "";
const DEFILLAMA_BASE = process.env.NEXT_PUBLIC_DEFILLAMA_BASE || "https://api.llama.fi";

// DeFiLlama category → Sol City category
const CATEGORY_MAP: Record<string, string> = {
  Dexes: "DEX",
  Dexs: "DEX",
  "Liquid Staking": "Liquid Staking",
  "Liquid Restaking": "Liquid Staking",
  "Staking Pool": "Liquid Staking",
  Restaking: "Liquid Staking",
  Staking: "Liquid Staking",
  Lending: "Lending",
  CDP: "Lending",
  Yield: "Yield",
  "Yield Aggregator": "Yield",
  "Liquidity manager": "Yield",
  "Onchain Capital Allocator": "Yield",
  Farm: "Yield",
  Derivatives: "Perps",
  "Options Vault": "Perps",
  "Options Dex": "Perps",
  Options: "Perps",
  "Perpetuals Protocol": "Perps",
  "Prediction Market": "Perps",
  "Basis Trading": "Perps",
  Synthetics: "Perps",
  Launchpad: "Launchpad",
  NFT: "NFT",
  "NFT Marketplace": "NFT",
  "NFT Lending": "NFT",
  Payments: "Payments",
  CEX: "Infrastructure",
  Bridge: "Infrastructure",
  "Cross Chain Bridge": "Infrastructure",
  "Canonical Bridge": "Infrastructure",
  Insurance: "Infrastructure",
  Gaming: "Infrastructure",
  RWA: "Infrastructure",
  "Real World Assets": "Infrastructure",
  Privacy: "Infrastructure",
  Indexes: "Infrastructure",
  Interface: "Infrastructure",
  "Risk Curators": "Infrastructure",
  Oracle: "Infrastructure",
  Infrastructure: "Infrastructure",
  SoFi: "Infrastructure",
};

// Parent protocol prefix → Solana token mint
const PARENT_MINTS: Record<string, string> = {
  // DEX / Perps
  jupiter: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  raydium: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  orca: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
  drift: "DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7",
  phoenix: "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY",
  meteora: "METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m",
  // Liquid Staking
  marinade: "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey",
  jito: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  sanctum: "SANMFRfQEqAvqudw7ikfVrKBRshGz8E7ToaiPfCNuSU",
  blazestake: "BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh3hkJMrU8KuJA",
  lido: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
  // Lending / Yield
  kamino: "KMNO3kkBSiEvyJRRFfCzjYROo3DF7TiJXVNFVEZMeui",
  solend: "SLNDpmoWTVADgEdndyvWzroNKFicio1X9cfo8xHUv5un",
  marginfi: "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
  mango: "MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac",
  hubble: "HBB111SCo9jkCejsZfz8Ec8nH7T6THF8KEKSnvwT6XK6",
  // NFT / Launchpad
  tensor: "TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6",
  // Perps / Options
  parcl: "PARCLhPMbSRZSHxSPRZv9HUckvvKNXMCHTak2PfpUPR",
  zeta: "ZEXy1pqteRu3n13kdyh4LnSQExKJJhGkFyiMGKysRAbm",
  hxro: "HxhWkVpk5NS4Ltg5nij2G671CKXFRKPK8vy271Ub4uEK",
  // Infrastructure / Other
  helium: "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux",
  pyth: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
  render: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
  nosana: "nosXBVoaCTtYdLvKY6Csb4AC8JCdQKKAaWYtx2ZMoo7",
  wormhole: "85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ",
  bonk: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
};

// DeFiLlama categories to exclude (not on-chain Solana DeFi)
const EXCLUDED_CATEGORIES = new Set([
  "CEX",
  "Bridge",
  "Cross Chain Bridge",
  "Canonical Bridge",
  "RWA",
  "Real World Assets",
  "Privacy",
  "Gaming",
  "SoFi",
  "Insurance",
]);

// Known non-DeFi protocol names to exclude (CEXes, TradFi, etc.)
const EXCLUDED_NAMES = new Set([
  "binance cex",
  "binance staked sol",
  "bybit",
  "bybit staked sol",
  "okx",
  "gate",
  "kucoin",
  "bitget",
  "bitfinex",
  "mexc",
  "crypto.com",
  "kraken",
  "htx",
  "coinbase",
  "swissborg",
  "backpack",
  "blackrock buidl",
  "ondo yield assets",
  "franklin templeton",
  "xstocks",
]);

const CEX_PREFIXES = ["binance", "bybit", "okx", "gate", "kucoin", "bitget", "bitfinex", "mexc", "crypto.com", "kraken", "htx", "coinbase"];

function isExcludedProtocol(p: { name?: string; category?: string }): boolean {
  if (EXCLUDED_CATEGORIES.has(p.category || "")) return true;
  const nameLower = (p.name || "").toLowerCase();
  if (EXCLUDED_NAMES.has(nameLower)) return true;
  // Catch CEX-branded products (e.g. "Bitget SOL", "Crypto.com Liquid Staking")
  if (CEX_PREFIXES.some((cex) => nameLower.startsWith(cex))) return true;
  return false;
}

function mapCategory(raw: string): string {
  return CATEGORY_MAP[raw] || "Infrastructure";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function findMintForSlug(slug: string): string | null {
  for (const [prefix, mint] of Object.entries(PARENT_MINTS)) {
    if (slug === prefix || slug.startsWith(prefix + "-")) return mint;
  }
  return null;
}

// Fetch DeFiLlama DEX + derivatives volumes + fees for Solana
async function fetchVolumesAndFees(): Promise<{
  volumeMap: Record<string, number>;
  feesMap: Record<string, number>;
}> {
  const volumeMap: Record<string, number> = {};
  const feesMap: Record<string, number> = {};

  // Volume: DEX + derivatives
  for (const endpoint of ["dexs", "derivatives"]) {
    try {
      const res = await fetch(
        `${DEFILLAMA_BASE}/overview/${endpoint}/solana`
      );
      if (!res.ok) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const p of (data.protocols || []) as any[]) {
        const vol = p.total24h ?? 0;
        if (vol <= 0) continue;
        const nameSlug = slugify(p.name || "");
        if (nameSlug) volumeMap[nameSlug] = (volumeMap[nameSlug] || 0) + vol;
        const dlSlug = (p.slug || "").toLowerCase();
        if (dlSlug && dlSlug !== nameSlug)
          volumeMap[dlSlug] = (volumeMap[dlSlug] || 0) + vol;
      }
    } catch {
      // skip
    }
  }

  // Fees: covers lending, staking, yield, launchpads — much broader than volume
  try {
    const res = await fetch(`${DEFILLAMA_BASE}/overview/fees/solana`);
    if (res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const p of (data.protocols || []) as any[]) {
        const fees = p.total24h ?? 0;
        if (fees <= 0) continue;
        const nameSlug = slugify(p.name || "");
        if (nameSlug) feesMap[nameSlug] = (feesMap[nameSlug] || 0) + fees;
        const dlSlug = (p.slug || "").toLowerCase();
        if (dlSlug && dlSlug !== nameSlug)
          feesMap[dlSlug] = (feesMap[dlSlug] || 0) + fees;
      }
    }
  } catch {
    // skip
  }

  return { volumeMap, feesMap };
}

// Fetch Vybe Network token volumes for known mints
async function fetchVybeVolumes(): Promise<Record<string, number>> {
  const vybeKey = process.env.VYBE_API_KEY;
  if (!vybeKey) return {};

  const mints = Object.values(PARENT_MINTS);

  // Pro plan: 500 RPM — fetch all mints in parallel
  const results = await Promise.allSettled(
    mints.map(async (mint) => {
      const res = await fetch(
        `https://api.vybenetwork.xyz/v4/tokens/${mint}`,
        { headers: { "X-API-Key": vybeKey } }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      return { mint, data: await res.json() };
    })
  );

  const vybeByMint: Record<string, number> = {};
  for (const r of results) {
    if (r.status === "fulfilled") {
      const vol = r.value.data.usdValueVolume24h;
      if (vol != null && vol > 0) {
        vybeByMint[r.value.mint] = vol;
      }
    }
  }

  return vybeByMint;
}

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this automatically)
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all external data in parallel
    const [protocolsRes, { volumeMap, feesMap }, priceByMint, vybeByMint] =
      await Promise.all([
        fetch(`${DEFILLAMA_BASE}/protocols`).then((r) => {
          if (!r.ok) throw new Error(`DeFiLlama ${r.status}`);
          return r.json();
        }),
        fetchVolumesAndFees(),
        fetchMintPrices(Object.values(PARENT_MINTS)),
        fetchVybeVolumes(),
      ]);

    // Filter to Solana DeFi protocols with >= $100K TVL (exclude CEXes, bridges, RWA, etc.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solanaProtocols = (protocolsRes as any[])
      .filter((p) => {
        if (isExcludedProtocol(p)) return false;
        const chains = p.chains || [];
        const hasSolana = chains.some(
          (c: string) => c.toLowerCase() === "solana"
        );
        const solanaTvl =
          p.chainTvls?.Solana ??
          (chains.length === 1 && hasSolana ? p.tvl : 0);
        return hasSolana && solanaTvl >= 100_000;
      })
      .map((p) => {
        const chains = p.chains || [];
        const hasSolana = chains.some(
          (c: string) => c.toLowerCase() === "solana"
        );
        const solanaTvl =
          p.chainTvls?.Solana ??
          (chains.length === 1 && hasSolana ? p.tvl : 0);
        return { ...p, solanaTvl };
      })
      .sort(
        (a: { solanaTvl: number }, b: { solanaTvl: number }) =>
          (b.solanaTvl || 0) - (a.solanaTvl || 0)
      );

    const sb = getSupabaseAdmin();
    let updated = 0;
    let withVolume = 0;
    let withFees = 0;
    const activeSlugs: string[] = [];

    for (let i = 0; i < solanaProtocols.length; i++) {
      const p = solanaProtocols[i];
      const slug = slugify(p.name || p.slug || `protocol-${i}`);
      const name = p.name || slug;
      const category = mapCategory(p.category || "");
      const tvl = p.solanaTvl || 0;
      const change24h = p.change_1d ?? null;
      const logoUrl = p.logo || null;
      const url = p.url || null;
      const rank = i + 1;

      const tokenMint = findMintForSlug(slug);

      // Volume: DeFiLlama (primary) → Vybe token volume (fallback)
      const dlVolume = volumeMap[slug] || null;
      const vybeVolume = tokenMint ? vybeByMint[tokenMint] || null : null;
      const volume24h = dlVolume || vybeVolume || null;
      if (volume24h) withVolume++;

      // Fees: DeFiLlama 24h fees (lending, staking, yield, etc.)
      const fees24h = feesMap[slug] || null;
      if (fees24h) withFees++;

      const tokenPrice = tokenMint ? priceByMint[tokenMint] || null : null;

      const { error } = await sb.from("protocols").upsert(
        {
          slug,
          name,
          category,
          tvl,
          change_24h: change24h,
          volume_24h: volume24h,
          fees_24h: fees24h,
          token_mint: tokenMint,
          token_price: tokenPrice,
          logo_url: logoUrl,
          url,
          rank,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" }
      );

      if (!error) {
        updated++;
        activeSlugs.push(slug);
      }
    }

    // Remove stale protocols below threshold
    if (activeSlugs.length > 50) {
      await sb
        .from("protocols")
        .delete()
        .not("slug", "in", `(${activeSlugs.join(",")})`);
    }

    // Update city_stats (fire-and-forget, RPC may not exist)
    sb.rpc("update_city_stats_from_protocols").then(() => {}, () => {});

    return NextResponse.json({
      ok: true,
      updated,
      withVolume,
      withFees,
      vybeVolumes: Object.keys(vybeByMint).length,
      total: solanaProtocols.length,
    });
  } catch (err) {
    console.error("Cron sync-protocols error:", err);
    return NextResponse.json(
      { error: "Sync failed", detail: String(err) },
      { status: 500 }
    );
  }
}
