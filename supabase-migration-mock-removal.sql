-- ===========================================
-- AIO Insight — Mock Data Removal Migration
-- Ahrefs キャッシュ + Pipeline 永続化テーブル
-- Run this in Supabase SQL Editor
-- ===========================================

-- 1. ahrefs_traffic_snapshots: Webトラフィック日次キャッシュ
CREATE TABLE IF NOT EXISTS ahrefs_traffic_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  date DATE NOT NULL,
  organic INTEGER DEFAULT 0,
  ai INTEGER DEFAULT 0,
  direct INTEGER DEFAULT 0,
  social INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  bounce_rate NUMERIC(5,2),
  avg_duration_seconds INTEGER,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ahrefs_traffic_customer_date ON ahrefs_traffic_snapshots(customer_id, date);
CREATE INDEX idx_ahrefs_traffic_site_url ON ahrefs_traffic_snapshots(site_url);

-- 2. ahrefs_brand_radar_snapshots: Brand Radar データ
CREATE TABLE IF NOT EXISTS ahrefs_brand_radar_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  platform TEXT NOT NULL,
  mentions INTEGER DEFAULT 0,
  citations INTEGER DEFAULT 0,
  sov NUMERIC(5,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  trend NUMERIC(5,2) DEFAULT 0,
  snapshot_date DATE NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ahrefs_brand_radar_customer ON ahrefs_brand_radar_snapshots(customer_id, snapshot_date);
CREATE INDEX idx_ahrefs_brand_radar_target ON ahrefs_brand_radar_snapshots(target);

-- 3. ahrefs_competitor_config: 競合設定
CREATE TABLE IF NOT EXISTS ahrefs_competitor_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  competitor_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ahrefs_competitor_customer ON ahrefs_competitor_config(customer_id);

CREATE TRIGGER ahrefs_competitor_config_updated_at
  BEFORE UPDATE ON ahrefs_competitor_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. ahrefs_top_pages: ページ別AI流入
CREATE TABLE IF NOT EXISTS ahrefs_top_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  ai_traffic INTEGER DEFAULT 0,
  total_traffic INTEGER DEFAULT 0,
  ai_ratio NUMERIC(5,2) DEFAULT 0,
  trend NUMERIC(5,2) DEFAULT 0,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ahrefs_top_pages_customer ON ahrefs_top_pages(customer_id, snapshot_date);

-- 5. pipeline_activity_log: 活動ログ
CREATE TABLE IF NOT EXISTS pipeline_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pipeline_activity_created ON pipeline_activity_log(created_at DESC);

-- 6. pipeline_automation_config: 自動化設定 key-value
CREATE TABLE IF NOT EXISTS pipeline_automation_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER pipeline_automation_config_updated_at
  BEFORE UPDATE ON pipeline_automation_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. pipeline_template_stats: テンプレート実績
CREATE TABLE IF NOT EXISTS pipeline_template_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  sent INTEGER DEFAULT 0,
  opened INTEGER DEFAULT 0,
  replied INTEGER DEFAULT 0,
  converted INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER pipeline_template_stats_updated_at
  BEFORE UPDATE ON pipeline_template_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- Row Level Security (RLS)
-- ===========================================

ALTER TABLE ahrefs_traffic_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahrefs_brand_radar_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahrefs_competitor_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahrefs_top_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_automation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_template_stats ENABLE ROW LEVEL SECURITY;

-- Service role full access (same pattern as existing tables)
CREATE POLICY "service_role_ahrefs_traffic" ON ahrefs_traffic_snapshots
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_ahrefs_brand_radar" ON ahrefs_brand_radar_snapshots
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_ahrefs_competitor" ON ahrefs_competitor_config
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_ahrefs_top_pages" ON ahrefs_top_pages
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_pipeline_activity" ON pipeline_activity_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_pipeline_config" ON pipeline_automation_config
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_pipeline_templates" ON pipeline_template_stats
  FOR ALL USING (true) WITH CHECK (true);
