-- ═══════════════════════════════════════════════════
-- Sol City: Protocols table (parallel to developers)
-- Both tables coexist — no data loss during transition
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS protocols (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Infrastructure',
  tvl DOUBLE PRECISION NOT NULL DEFAULT 0,
  change_24h DOUBLE PRECISION,
  volume_24h DOUBLE PRECISION,
  token_mint TEXT,
  token_price DOUBLE PRECISION,
  logo_url TEXT,
  url TEXT,
  rank INTEGER,
  -- Gamification (mirrors developer fields)
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_by TEXT, -- wallet address
  kudos_count INTEGER NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  app_streak INTEGER NOT NULL DEFAULT 0,
  raid_xp INTEGER NOT NULL DEFAULT 0,
  rabbit_completed BOOLEAN NOT NULL DEFAULT FALSE,
  current_week_contributions DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_week_kudos_given INTEGER NOT NULL DEFAULT 0,
  current_week_kudos_received INTEGER NOT NULL DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocols_rank ON protocols (rank);
CREATE INDEX IF NOT EXISTS idx_protocols_category ON protocols (category);
CREATE INDEX IF NOT EXISTS idx_protocols_tvl ON protocols (tvl DESC);
CREATE INDEX IF NOT EXISTS idx_protocols_claimed_by ON protocols (claimed_by) WHERE claimed_by IS NOT NULL;

-- Add nullable protocol_id FK to existing gamification tables
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS protocol_id INTEGER REFERENCES protocols(id);
ALTER TABLE developer_achievements ADD COLUMN IF NOT EXISTS protocol_id INTEGER REFERENCES protocols(id);
ALTER TABLE developer_customizations ADD COLUMN IF NOT EXISTS protocol_id INTEGER REFERENCES protocols(id);
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS protocol_id INTEGER REFERENCES protocols(id);
ALTER TABLE raid_tags ADD COLUMN IF NOT EXISTS protocol_id INTEGER REFERENCES protocols(id);

-- Protocol-specific stats row
INSERT INTO city_stats (id, total_developers, total_contributions)
VALUES (2, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- RLS: public read, authenticated write for claims
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY protocols_read ON protocols FOR SELECT USING (true);
CREATE POLICY protocols_update ON protocols FOR UPDATE USING (true);
