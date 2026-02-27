import pg from "pg";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/setup-tables.mjs");
  process.exit(1);
}

// Create all supporting tables the city API route needs
const SQL = `
-- city_stats (singleton)
CREATE TABLE IF NOT EXISTS city_stats (
  id INT PRIMARY KEY DEFAULT 1,
  total_developers INT NOT NULL DEFAULT 0,
  total_contributions BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO city_stats (id) VALUES (1) ON CONFLICT DO NOTHING;
INSERT INTO city_stats (id, total_developers, total_contributions) VALUES (2, 0, 0) ON CONFLICT DO NOTHING;
ALTER TABLE city_stats ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'city_stats' AND policyname = 'city_stats_read') THEN
    CREATE POLICY city_stats_read ON city_stats FOR SELECT USING (true);
  END IF;
END $$;

-- items catalog
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_usd_cents INT NOT NULL DEFAULT 0,
  price_brl_cents INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  category TEXT NOT NULL DEFAULT 'cosmetic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'items' AND policyname = 'items_read') THEN
    CREATE POLICY items_read ON items FOR SELECT USING (true);
  END IF;
END $$;

-- purchases
CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  developer_id INT,
  protocol_id INT REFERENCES protocols(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_tx_id TEXT,
  amount_cents INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending',
  gifted_to INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchases' AND policyname = 'purchases_read') THEN
    CREATE POLICY purchases_read ON purchases FOR SELECT USING (true);
  END IF;
END $$;

-- achievements definition
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tier TEXT NOT NULL DEFAULT 'bronze',
  category TEXT NOT NULL DEFAULT 'general',
  threshold INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'achievements' AND policyname = 'achievements_read') THEN
    CREATE POLICY achievements_read ON achievements FOR SELECT USING (true);
  END IF;
END $$;

-- developer_achievements (earned)
CREATE TABLE IF NOT EXISTS developer_achievements (
  id SERIAL PRIMARY KEY,
  developer_id INT,
  protocol_id INT REFERENCES protocols(id),
  achievement_id TEXT NOT NULL REFERENCES achievements(id),
  seen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE developer_achievements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'developer_achievements' AND policyname = 'dev_ach_read') THEN
    CREATE POLICY dev_ach_read ON developer_achievements FOR SELECT USING (true);
  END IF;
END $$;

-- developer_customizations
CREATE TABLE IF NOT EXISTS developer_customizations (
  id SERIAL PRIMARY KEY,
  developer_id INT,
  protocol_id INT REFERENCES protocols(id),
  item_id TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE developer_customizations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'developer_customizations' AND policyname = 'dev_cust_read') THEN
    CREATE POLICY dev_cust_read ON developer_customizations FOR SELECT USING (true);
  END IF;
END $$;

-- activity_feed
CREATE TABLE IF NOT EXISTS activity_feed (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_id INT,
  target_id INT,
  protocol_id INT REFERENCES protocols(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_feed' AND policyname = 'feed_read') THEN
    CREATE POLICY feed_read ON activity_feed FOR SELECT USING (true);
  END IF;
END $$;

-- raid_tags
CREATE TABLE IF NOT EXISTS raid_tags (
  id SERIAL PRIMARY KEY,
  building_id INT NOT NULL,
  attacker_login TEXT NOT NULL,
  tag_style TEXT NOT NULL DEFAULT 'default',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE raid_tags ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'raid_tags' AND policyname = 'raid_tags_read') THEN
    CREATE POLICY raid_tags_read ON raid_tags FOR SELECT USING (true);
  END IF;
END $$;

-- developer_kudos
CREATE TABLE IF NOT EXISTS developer_kudos (
  id SERIAL PRIMARY KEY,
  giver_id INT NOT NULL,
  receiver_id INT NOT NULL,
  given_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE developer_kudos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'developer_kudos' AND policyname = 'kudos_read') THEN
    CREATE POLICY kudos_read ON developer_kudos FOR SELECT USING (true);
  END IF;
END $$;

-- raids
CREATE TABLE IF NOT EXISTS raids (
  id SERIAL PRIMARY KEY,
  attacker_id INT NOT NULL,
  defender_id INT NOT NULL,
  attack_score INT NOT NULL DEFAULT 0,
  defense_score INT NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  xp_earned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE raids ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'raids' AND policyname = 'raids_read') THEN
    CREATE POLICY raids_read ON raids FOR SELECT USING (true);
  END IF;
END $$;

-- streak_freeze_log
CREATE TABLE IF NOT EXISTS streak_freeze_log (
  id SERIAL PRIMARY KEY,
  developer_id INT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- sky_ads
CREATE TABLE IF NOT EXISTS sky_ads (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#f8d880',
  bg_color TEXT NOT NULL DEFAULT '#1a1018',
  link TEXT,
  vehicle TEXT NOT NULL DEFAULT 'plane',
  priority INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE sky_ads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sky_ads' AND policyname = 'sky_ads_read') THEN
    CREATE POLICY sky_ads_read ON sky_ads FOR SELECT USING (true);
  END IF;
END $$;

-- ad_events
CREATE TABLE IF NOT EXISTS ad_events (
  id SERIAL PRIMARY KEY,
  ad_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update city_stats for protocols
UPDATE city_stats SET
  total_developers = (SELECT COUNT(*) FROM protocols),
  total_contributions = (SELECT COALESCE(SUM(tvl::bigint), 0) FROM protocols),
  updated_at = NOW()
WHERE id = 2;

-- Remove the check constraint on city_stats if it exists
ALTER TABLE city_stats DROP CONSTRAINT IF EXISTS city_stats_id_check;
`;

async function main() {
  const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  try {
    console.log("Connecting...");
    await client.connect();
    console.log("Running migrations...");
    await client.query(SQL);
    console.log("All tables created successfully.");

    // Verify
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log("Tables in database:");
    rows.forEach((r) => console.log(`  - ${r.table_name}`));
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
