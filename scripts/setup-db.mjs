import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/setup-db.mjs");
  process.exit(1);
}

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS protocols (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Infrastructure',
  tvl DOUBLE PRECISION NOT NULL DEFAULT 0,
  change_24h DOUBLE PRECISION,
  volume_24h DOUBLE PRECISION,
  fees_24h DOUBLE PRECISION,
  token_mint TEXT,
  token_price DOUBLE PRECISION,
  logo_url TEXT,
  url TEXT,
  rank INTEGER,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_by TEXT,
  kudos_count INTEGER NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  app_streak INTEGER NOT NULL DEFAULT 0,
  raid_xp INTEGER NOT NULL DEFAULT 0,
  rabbit_completed BOOLEAN NOT NULL DEFAULT FALSE,
  current_week_contributions DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_week_kudos_given INTEGER NOT NULL DEFAULT 0,
  current_week_kudos_received INTEGER NOT NULL DEFAULT 0,
  streak_freeze_30d_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  streak_freezes_available INTEGER NOT NULL DEFAULT 0,
  last_checkin_date DATE,
  billboard_images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocols_rank ON protocols (rank);
CREATE INDEX IF NOT EXISTS idx_protocols_category ON protocols (category);
CREATE INDEX IF NOT EXISTS idx_protocols_tvl ON protocols (tvl DESC);
CREATE INDEX IF NOT EXISTS idx_protocols_claimed_by ON protocols (claimed_by) WHERE claimed_by IS NOT NULL;

ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'protocols' AND policyname = 'protocols_read') THEN
    CREATE POLICY protocols_read ON protocols FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'protocols' AND policyname = 'protocols_update') THEN
    CREATE POLICY protocols_update ON protocols FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'protocols' AND policyname = 'protocols_insert') THEN
    CREATE POLICY protocols_insert ON protocols FOR INSERT WITH CHECK (true);
  END IF;
END $$;
`;

const CATEGORY_MAP = {
  // DeFiLlama uses "Dexs" (no 'e') as of 2025
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
  // Everything else → Infrastructure
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

function isExcludedProtocol(p) {
  if (EXCLUDED_CATEGORIES.has(p.category || "")) return true;
  const nameLower = (p.name || "").toLowerCase();
  if (EXCLUDED_NAMES.has(nameLower)) return true;
  // Catch CEX-branded products (e.g. "Bitget SOL", "Crypto.com Liquid Staking")
  if (CEX_PREFIXES.some((cex) => nameLower.startsWith(cex))) return true;
  return false;
}

function mapCategory(raw) {
  return CATEGORY_MAP[raw] || "Infrastructure";
}

// Parent protocol prefix → Solana token mint
// DeFiLlama splits protocols into subproducts (jupiter-lend, raydium-amm, etc.)
// We match by prefix so all Jupiter subproducts get the JUP token price.
const PARENT_MINTS = {
  // DEX / Perps
  jupiter:    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  raydium:    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  orca:       "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
  drift:      "DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7",
  phoenix:    "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY",
  meteora:    "METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m",
  // Liquid Staking
  marinade:   "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey",
  jito:       "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  sanctum:    "SANMFRfQEqAvqudw7ikfVrKBRshGz8E7ToaiPfCNuSU",
  blazestake: "BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh3hkJMrU8KuJA",
  lido:       "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
  // Lending / Yield
  kamino:     "KMNO3kkBSiEvyJRRFfCzjYROo3DF7TiJXVNFVEZMeui",
  solend:     "SLNDpmoWTVADgEdndyvWzroNKFicio1X9cfo8xHUv5un",
  marginfi:   "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
  mango:      "MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac",
  hubble:     "HBB111SCo9jkCejsZfz8Ec8nH7T6THF8KEKSnvwT6XK6",
  // NFT / Launchpad
  tensor:     "TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6",
  // Perps / Options
  parcl:      "PARCLhPMbSRZSHxSPRZv9HUckvvKNXMCHTak2PfpUPR",
  zeta:       "ZEXy1pqteRu3n13kdyh4LnSQExKJJhGkFyiMGKysRAbm",
  hxro:       "HxhWkVpk5NS4Ltg5nij2G671CKXFRKPK8vy271Ub4uEK",
  // Infrastructure / Other
  helium:     "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux",
  pyth:       "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
  render:     "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
  nosana:     "nosXBVoaCTtYdLvKY6Csb4AC8JCdQKKAaWYtx2ZMoo7",
  wormhole:   "85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ",
  bonk:       "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
};

// Find the parent mint for a protocol slug (e.g., "jupiter-lend" → JUP mint)
function findMintForSlug(slug) {
  for (const [prefix, mint] of Object.entries(PARENT_MINTS)) {
    if (slug === prefix || slug.startsWith(prefix + "-")) return mint;
  }
  return null;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Fetch DeFiLlama DEX + derivatives volumes + fees for Solana ──
// Returns { volumeMap: slug → total24h, feesMap: slug → fees24h }
async function fetchVolumesAndFees() {
  const volumeMap = {}; // slug → total24h volume
  const feesMap = {};   // slug → total24h fees

  // Volume: DEX + derivatives
  for (const endpoint of ["dexs", "derivatives"]) {
    try {
      const res = await fetch(`https://api.llama.fi/overview/${endpoint}/solana`);
      if (!res.ok) { console.warn(`DeFiLlama ${endpoint} returned ${res.status}`); continue; }
      const data = await res.json();
      for (const p of data.protocols || []) {
        const vol = p.total24h ?? 0;
        if (vol <= 0) continue;
        const nameSlug = slugify(p.name || "");
        if (nameSlug) volumeMap[nameSlug] = (volumeMap[nameSlug] || 0) + vol;
        const dlSlug = (p.slug || "").toLowerCase();
        if (dlSlug && dlSlug !== nameSlug) volumeMap[dlSlug] = (volumeMap[dlSlug] || 0) + vol;
      }
    } catch (err) {
      console.warn(`Failed to fetch ${endpoint} volumes:`, err.message);
    }
  }

  // Fees: covers lending, staking, yield, launchpads — much broader than volume
  try {
    const res = await fetch("https://api.llama.fi/overview/fees/solana");
    if (res.ok) {
      const data = await res.json();
      for (const p of data.protocols || []) {
        const fees = p.total24h ?? 0;
        if (fees <= 0) continue;
        const nameSlug = slugify(p.name || "");
        if (nameSlug) feesMap[nameSlug] = (feesMap[nameSlug] || 0) + fees;
        const dlSlug = (p.slug || "").toLowerCase();
        if (dlSlug && dlSlug !== nameSlug) feesMap[dlSlug] = (feesMap[dlSlug] || 0) + fees;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch fees:", err.message);
  }

  return { volumeMap, feesMap };
}

// ── Fetch Jupiter prices for known token mints (v3 API) ──
// Returns mint → { price } map (keyed by mint address, not slug)
const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";

async function fetchJupiterPrices() {
  try {
    const mints = Object.values(PARENT_MINTS).join(",");
    const res = await fetch(`https://api.jup.ag/price/v3?ids=${mints}`, {
      headers: { "x-api-key": JUPITER_API_KEY },
    });
    if (!res.ok) throw new Error(`Jupiter ${res.status}`);
    const json = await res.json();

    // Build mint → price map
    const priceByMint = {};
    for (const [mint, data] of Object.entries(json)) {
      if (data?.usdPrice) priceByMint[mint] = Number(data.usdPrice);
    }
    return priceByMint;
  } catch (err) {
    console.warn("Jupiter price fetch failed:", err.message);
    return {};
  }
}

// ── Fetch Vybe Network token volumes for known mints ──
// Returns mint → usdValueVolume24h map
const VYBE_API_KEY = process.env.VYBE_API_KEY || "";

async function fetchVybeVolumes() {
  if (!VYBE_API_KEY) {
    console.warn("VYBE_API_KEY not set, skipping Vybe volume fetch");
    return {};
  }

  const mints = Object.values(PARENT_MINTS);

  // Pro plan: 500 RPM — fetch all mints in parallel
  const results = await Promise.allSettled(
    mints.map(async (mint) => {
      const res = await fetch(`https://api.vybenetwork.xyz/v4/tokens/${mint}`, {
        headers: { "X-API-Key": VYBE_API_KEY },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      return { mint, data: await res.json() };
    })
  );

  const vybeByMint = {};
  for (const r of results) {
    if (r.status === "fulfilled") {
      const { mint, data } = r.value;
      const vol = data.usdValueVolume24h;
      if (vol != null && vol > 0) {
        vybeByMint[mint] = vol;
      }
    }
  }

  return vybeByMint;
}

async function main() {
  const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("Connected.");

    // Create table
    console.log("Creating protocols table...");
    await client.query(CREATE_TABLE_SQL);
    console.log("Table created.");

    // Add fees_24h column if missing (safe to run multiple times)
    await client.query("ALTER TABLE protocols ADD COLUMN IF NOT EXISTS fees_24h DOUBLE PRECISION");

    // Fetch all external data in parallel
    console.log("Fetching data from DeFiLlama + Jupiter + Vybe...");
    const [protocolsRes, { volumeMap, feesMap }, priceByMint, vybeByMint] = await Promise.all([
      fetch("https://api.llama.fi/protocols").then((r) => {
        if (!r.ok) throw new Error(`DeFiLlama protocols API returned ${r.status}`);
        return r.json();
      }),
      fetchVolumesAndFees(),
      fetchJupiterPrices(),
      fetchVybeVolumes(),
    ]);

    console.log(`DeFiLlama volume entries: ${Object.keys(volumeMap).length}`);
    console.log(`DeFiLlama fees entries: ${Object.keys(feesMap).length}`);
    console.log(`Jupiter prices found: ${Object.keys(priceByMint).length}`);
    console.log(`Vybe volumes found: ${Object.keys(vybeByMint).length}`);

    // Filter to Solana DeFi protocols with >= $100K TVL (exclude CEXes, bridges, RWA, etc.)
    const solanaProtocols = protocolsRes
      .filter((p) => {
        if (isExcludedProtocol(p)) return false;
        const chains = p.chains || [];
        const hasSolana = chains.some((c) => c.toLowerCase() === "solana");
        const solanaTvl = p.chainTvls?.Solana ?? (chains.length === 1 && hasSolana ? p.tvl : 0);
        return hasSolana && solanaTvl >= 100_000;
      })
      .map((p) => {
        const chains = p.chains || [];
        const hasSolana = chains.some((c) => c.toLowerCase() === "solana");
        const solanaTvl = p.chainTvls?.Solana ?? (chains.length === 1 && hasSolana ? p.tvl : 0);
        return { ...p, solanaTvl };
      })
      .sort((a, b) => (b.solanaTvl || 0) - (a.solanaTvl || 0));

    console.log(`Found ${solanaProtocols.length} Solana protocols with TVL >= $100K`);

    // Upsert protocols with volume + fees + price data
    let inserted = 0;
    let withVolume = 0;
    let withFees = 0;
    let withPrice = 0;
    const activeSlugs = [];
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

      // Mint: match via parent prefix (e.g., "jupiter-lend" → JUP mint)
      const tokenMint = findMintForSlug(slug);

      // Volume: DeFiLlama protocol volume (primary) → Vybe token volume (fallback)
      const dlVolume = volumeMap[slug] || null;
      const vybeVolume = tokenMint ? (vybeByMint[tokenMint] || null) : null;
      const volume24h = dlVolume || vybeVolume || null;
      if (volume24h) withVolume++;

      // Fees: DeFiLlama 24h fees (covers lending, staking, yield, etc.)
      const fees24h = feesMap[slug] || null;
      if (fees24h) withFees++;

      // Price: Jupiter (primary source)
      const tokenPrice = tokenMint ? (priceByMint[tokenMint] || null) : null;
      if (tokenPrice) withPrice++;

      try {
        await client.query(
          `INSERT INTO protocols (slug, name, category, tvl, change_24h, volume_24h, fees_24h, token_mint, token_price, logo_url, url, rank)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (slug) DO UPDATE SET
             name = EXCLUDED.name,
             category = EXCLUDED.category,
             tvl = EXCLUDED.tvl,
             change_24h = EXCLUDED.change_24h,
             volume_24h = EXCLUDED.volume_24h,
             fees_24h = EXCLUDED.fees_24h,
             token_mint = EXCLUDED.token_mint,
             token_price = EXCLUDED.token_price,
             logo_url = EXCLUDED.logo_url,
             url = EXCLUDED.url,
             rank = EXCLUDED.rank,
             updated_at = NOW()`,
          [slug, name, category, tvl, change24h, volume24h, fees24h, tokenMint, tokenPrice, logoUrl, url, rank]
        );
        inserted++;
        activeSlugs.push(slug);
      } catch (err) {
        console.error(`Failed to insert ${slug}: ${err.message}`);
      }
    }

    console.log(`Inserted/updated ${inserted} protocols.`);
    console.log(`  With volume (DeFiLlama + Vybe): ${withVolume}`);
    console.log(`  With fees (DeFiLlama): ${withFees}`);
    console.log(`  With price: ${withPrice}`);

    // Remove protocols that dropped below the TVL threshold
    if (activeSlugs.length > 50) {
      const placeholders = activeSlugs.map((_, i) => `$${i + 1}`).join(",");
      const { rowCount } = await client.query(
        `DELETE FROM protocols WHERE slug NOT IN (${placeholders})`,
        activeSlugs
      );
      if (rowCount > 0) console.log(`Removed ${rowCount} stale protocols below threshold.`);
    }

    // Verify
    const { rows } = await client.query("SELECT COUNT(*) as count FROM protocols");
    console.log(`Total protocols in database: ${rows[0].count}`);

    const { rows: top10 } = await client.query(
      "SELECT slug, name, category, tvl, volume_24h, token_price, rank FROM protocols ORDER BY rank LIMIT 10"
    );
    console.log("Top 10 protocols:");
    top10.forEach((r) => {
      const vol = r.volume_24h ? `$${Math.round(r.volume_24h).toLocaleString()}` : "—";
      const price = r.token_price ? `$${r.token_price.toFixed(4)}` : "—";
      console.log(`  #${r.rank} ${r.name} (${r.category}) TVL: $${Math.round(r.tvl).toLocaleString()} | Vol: ${vol} | Price: ${price}`);
    });

    // Update city_stats
    await client.query(`
      UPDATE city_stats SET
        total_developers = (SELECT COUNT(*) FROM protocols),
        total_contributions = (SELECT COALESCE(SUM(tvl::bigint), 0) FROM protocols),
        updated_at = NOW()
      WHERE id = 2
    `);
    console.log("City stats updated.");

  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
