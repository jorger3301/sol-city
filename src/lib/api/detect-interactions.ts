// ═══════════════════════════════════════════════════
// PROTOCOL INTERACTION DETECTION via Helius
// Fetches full wallet transaction history and maps
// Helius source labels → protocol slugs
// ═══════════════════════════════════════════════════

import type { SupabaseClient } from "@supabase/supabase-js";

const HELIUS_BASE = "https://api.helius.xyz";

// Helius source → protocol slug mapping (lowercase)
// Slugs MUST match the `slug` column in the `protocols` table
const SOURCE_TO_SLUG: Record<string, string> = {
  // DEX / Aggregators
  jupiter: "jupiter-perpetual-exchange",
  "jupiter aggregator": "jupiter-perpetual-exchange",
  "jupiter v6": "jupiter-perpetual-exchange",
  "jupiter limit order": "jupiter-perpetual-exchange",
  raydium: "raydium-amm",
  "raydium amm": "raydium-amm",
  "raydium clmm": "raydium-amm",
  orca: "orca-dex",
  "orca whirlpool": "orca-dex",
  phoenix: "phoenix",
  openbook: "openbook",
  "serum": "serum",
  "serum swap": "serum-swap",
  meteora: "meteora-dlmm",
  "meteora dlmm": "meteora-dlmm",
  "meteora damm": "meteora-damm-v2",
  aldrin: "aldrin",
  saber: "saber",
  "cropper": "cropper-amm",
  "fluxbeam": "fluxbeam",
  pumpswap: "pumpswap",
  pancakeswap: "pancakeswap-amm-v3",
  "bonkswap": "bonkswap",
  "dooar": "dooar",
  manifest: "manifest-trade",
  perena: "perena-dex",

  // Perps / Trading
  drift: "drift-trade",
  "drift protocol": "drift-trade",
  adrena: "adrena-protocol",
  "flash trade": "flashtrade",
  flashtrade: "flashtrade",
  "neutral trade": "neutral-trade",
  "gm trade": "gmtrade",
  bumpin: "bumpin-trade",
  knightrade: "knightrade",

  // Lending
  marginfi: "marginfi-lending",
  solend: "save",
  save: "save",
  kamino: "kamino-lend",
  "kamino lend": "kamino-lend",
  "kamino liquidity": "kamino-liquidity",
  larix: "larix",
  port: "port-finance",
  apricot: "apricot-finance",
  "jet protocol": "jet-v1",
  jet: "jet-v1",
  francium: "francium",
  hubble: "hubble",
  loopscale: "loopscale",
  lulo: "lulo",
  hawkfi: "hawkfi",

  // Liquid staking
  marinade: "marinade-liquid-staking",
  "marinade finance": "marinade-liquid-staking",
  jito: "jito-liquid-staking",
  sanctum: "sanctum-infinity",
  blazestake: "blazestake",
  lido: "lido",

  // Prediction / Other DeFi
  parcl: "parcl-v3",
  dflow: "dflow-prediction-market",
  "divvy bet": "divvy-bet",
  sharky: "sharky",
  "rain fi": "rain-fi",
  streamflow: "streamflow",

  // Aggregator routers → attribute to Jupiter
  "okx dex": "jupiter-perpetual-exchange",
  "okx_dex_router": "jupiter-perpetual-exchange",
};

function mapSourceToSlug(source: string): string | null {
  const lower = source.toLowerCase().trim();
  if (SOURCE_TO_SLUG[lower]) return SOURCE_TO_SLUG[lower];
  // Try partial match (e.g. "JUPITER_V6" → "jupiter")
  for (const [key, slug] of Object.entries(SOURCE_TO_SLUG)) {
    if (lower.includes(key) || key.includes(lower)) return slug;
  }
  return null;
}

/**
 * Fetch full transaction history from Helius (paginated) and detect
 * which protocols the wallet has interacted with.
 * Returns detected interactions and upserts them into the DB.
 */
export async function detectProtocolInteractions(
  walletAddress: string,
  sb: SupabaseClient
): Promise<{ protocol_slug: string; tx_count: number }[]> {
  const key = process.env.HELIUS_API_KEY;
  if (!key) return [];

  const protoCounts: Record<string, number> = {};

  try {
    // Paginate through full history — Helius v0 returns max 100 per page
    let lastSignature: string | undefined;
    let totalFetched = 0;
    const MAX_PAGES = 10; // Up to 1000 transactions

    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL(
        `${HELIUS_BASE}/v0/addresses/${walletAddress}/transactions`
      );
      url.searchParams.set("api-key", key);
      url.searchParams.set("limit", "100");
      if (lastSignature) {
        url.searchParams.set("before", lastSignature);
      }

      const res = await fetch(url.toString());
      if (!res.ok) break;

      const txs = await res.json();
      if (!Array.isArray(txs) || txs.length === 0) break;

      for (const tx of txs) {
        const source = tx.source;
        if (!source) continue;
        const slug = mapSourceToSlug(source);
        if (slug) {
          protoCounts[slug] = (protoCounts[slug] || 0) + 1;
        }
      }

      totalFetched += txs.length;
      lastSignature = txs[txs.length - 1]?.signature;

      // If fewer than 100 returned, we've reached the end
      if (txs.length < 100) break;
    }

    console.log(
      `Helius: scanned ${totalFetched} txs for ${walletAddress}, found ${Object.keys(protoCounts).length} protocols`
    );
  } catch (err) {
    console.warn("Failed to fetch protocol interactions:", err);
    return [];
  }

  // Verify slugs exist in our protocols table
  const slugs = Object.keys(protoCounts);
  if (slugs.length === 0) return [];

  const { data: validProtos } = await sb
    .from("protocols")
    .select("slug")
    .in("slug", slugs);
  const validSlugs = new Set((validProtos ?? []).map((p) => p.slug));

  const interactions = Object.entries(protoCounts)
    .filter(([slug]) => validSlugs.has(slug))
    .map(([slug, count]) => ({
      protocol_slug: slug,
      tx_count: count,
    }));

  // Upsert into DB
  if (interactions.length > 0) {
    const rows = interactions.map((i) => ({
      wallet_address: walletAddress,
      protocol_slug: i.protocol_slug,
      tx_count: i.tx_count,
    }));
    await sb.from("wallet_protocol_interactions").upsert(rows, {
      onConflict: "wallet_address,protocol_slug",
    });
  }

  return interactions;
}
