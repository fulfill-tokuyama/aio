-- ============================================================
-- brand_monitor_config: AI Brand Monitor configuration per customer
-- ============================================================

CREATE TABLE brand_monitor_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  target_domain TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '',
  custom_prompts JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for cron lookups
CREATE INDEX idx_brand_monitor_config_active
  ON brand_monitor_config (is_active)
  WHERE is_active = true;

-- Index for customer lookups
CREATE INDEX idx_brand_monitor_config_customer
  ON brand_monitor_config (customer_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_brand_monitor_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_brand_monitor_config_updated_at
  BEFORE UPDATE ON brand_monitor_config
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_monitor_config_updated_at();

-- RLS
ALTER TABLE brand_monitor_config ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by API routes & cron)
CREATE POLICY brand_monitor_config_service_role
  ON brand_monitor_config
  FOR ALL
  USING (true)
  WITH CHECK (true);
