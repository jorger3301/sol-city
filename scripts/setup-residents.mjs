import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/setup-residents.mjs");
  process.exit(1);
}

const SQL = `
-- wallet_residents: wallets that claimed a house in the city
CREATE TABLE IF NOT EXISTS wallet_residents (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  display_name TEXT,
  house_style TEXT NOT NULL DEFAULT 'default',
  house_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE wallet_residents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallet_residents' AND policyname = 'residents_read') THEN
    CREATE POLICY residents_read ON wallet_residents FOR SELECT USING (true);
  END IF;
END $$;

-- wallet_protocol_interactions: which protocols a wallet has used
CREATE TABLE IF NOT EXISTS wallet_protocol_interactions (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL REFERENCES wallet_residents(wallet_address) ON DELETE CASCADE,
  protocol_slug TEXT NOT NULL,
  tx_count INTEGER NOT NULL DEFAULT 1,
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wallet_address, protocol_slug)
);
ALTER TABLE wallet_protocol_interactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallet_protocol_interactions' AND policyname = 'interactions_read') THEN
    CREATE POLICY interactions_read ON wallet_protocol_interactions FOR SELECT USING (true);
  END IF;
END $$;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_wpi_wallet ON wallet_protocol_interactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wpi_protocol ON wallet_protocol_interactions(protocol_slug);
`;

async function main() {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  console.log("Connected — creating wallet resident tables...");
  await client.query(SQL);
  console.log("Done — wallet_residents + wallet_protocol_interactions created.");
  await client.end();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
