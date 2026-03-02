-- ============================================================
-- Bug Fix Migration
-- RLSポリシー修正 + UNIQUE制約追加 + インデックス追加
-- ============================================================

-- ============================================================
-- 1. RLSポリシー修正: USING(true) → service_role のみに制限
-- ============================================================

-- leads テーブル
DROP POLICY IF EXISTS "service_role_leads" ON leads;
DROP POLICY IF EXISTS "Allow all for service role" ON leads;
CREATE POLICY "service_role_leads" ON leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 認証済みユーザーは自分のデータのみ閲覧可能
DROP POLICY IF EXISTS "authenticated_read_own_leads" ON leads;
CREATE POLICY "authenticated_read_own_leads" ON leads
  FOR SELECT TO authenticated
  USING (email = auth.jwt()->>'email');

-- diagnosis_reports テーブル
DROP POLICY IF EXISTS "service_role_diagnosis_reports" ON diagnosis_reports;
DROP POLICY IF EXISTS "Allow all for service role" ON diagnosis_reports;
CREATE POLICY "service_role_diagnosis_reports" ON diagnosis_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- email_logs テーブル
DROP POLICY IF EXISTS "service_role_email_logs" ON email_logs;
DROP POLICY IF EXISTS "Allow all for service role" ON email_logs;
CREATE POLICY "service_role_email_logs" ON email_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- customers テーブル
DROP POLICY IF EXISTS "service_role_customers" ON customers;
DROP POLICY IF EXISTS "Customers can view own data" ON customers;
CREATE POLICY "service_role_customers" ON customers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "customers_read_own" ON customers
  FOR SELECT TO authenticated
  USING (supabase_user_id = auth.uid());

-- pipeline_leads テーブル (RLS有効化 + ポリシー追加)
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_pipeline_leads" ON pipeline_leads;
CREATE POLICY "service_role_pipeline_leads" ON pipeline_leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- brand_monitor_config テーブル
DROP POLICY IF EXISTS "service_role_brand_monitor_config" ON brand_monitor_config;
DROP POLICY IF EXISTS "Allow all operations" ON brand_monitor_config;
CREATE POLICY "service_role_brand_monitor_config" ON brand_monitor_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ahrefs_traffic_snapshots テーブル
DROP POLICY IF EXISTS "service_role_ahrefs_traffic" ON ahrefs_traffic_snapshots;
DROP POLICY IF EXISTS "allow_all_ahrefs_traffic" ON ahrefs_traffic_snapshots;
CREATE POLICY "service_role_ahrefs_traffic" ON ahrefs_traffic_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ahrefs_brand_radar_snapshots テーブル
DROP POLICY IF EXISTS "service_role_ahrefs_brand_radar" ON ahrefs_brand_radar_snapshots;
DROP POLICY IF EXISTS "allow_all_ahrefs_brand_radar" ON ahrefs_brand_radar_snapshots;
CREATE POLICY "service_role_ahrefs_brand_radar" ON ahrefs_brand_radar_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ahrefs_competitor_config テーブル
DROP POLICY IF EXISTS "service_role_ahrefs_competitor" ON ahrefs_competitor_config;
DROP POLICY IF EXISTS "allow_all_ahrefs_competitor" ON ahrefs_competitor_config;
CREATE POLICY "service_role_ahrefs_competitor" ON ahrefs_competitor_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ahrefs_top_pages テーブル
DROP POLICY IF EXISTS "service_role_ahrefs_top_pages" ON ahrefs_top_pages;
DROP POLICY IF EXISTS "allow_all_ahrefs_top_pages" ON ahrefs_top_pages;
CREATE POLICY "service_role_ahrefs_top_pages" ON ahrefs_top_pages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- pipeline_activity_log テーブル
DROP POLICY IF EXISTS "service_role_pipeline_activity" ON pipeline_activity_log;
DROP POLICY IF EXISTS "allow_all_pipeline_activity" ON pipeline_activity_log;
CREATE POLICY "service_role_pipeline_activity" ON pipeline_activity_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- pipeline_automation_config テーブル
DROP POLICY IF EXISTS "service_role_pipeline_config" ON pipeline_automation_config;
DROP POLICY IF EXISTS "allow_all_pipeline_config" ON pipeline_automation_config;
CREATE POLICY "service_role_pipeline_config" ON pipeline_automation_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- pipeline_template_stats テーブル
DROP POLICY IF EXISTS "service_role_pipeline_templates" ON pipeline_template_stats;
DROP POLICY IF EXISTS "allow_all_pipeline_templates" ON pipeline_template_stats;
CREATE POLICY "service_role_pipeline_templates" ON pipeline_template_stats
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 2. UNIQUE制約追加（upsert用）
-- ============================================================

-- ahrefs_traffic_snapshots: customer_id + site_url + date
ALTER TABLE ahrefs_traffic_snapshots
  ADD CONSTRAINT uq_ahrefs_traffic_snapshot UNIQUE (customer_id, site_url, date);

-- ahrefs_brand_radar_snapshots: customer_id + target + platform + snapshot_date
ALTER TABLE ahrefs_brand_radar_snapshots
  ADD CONSTRAINT uq_ahrefs_brand_radar_snapshot UNIQUE (customer_id, target, platform, snapshot_date);

-- ============================================================
-- 3. インデックス追加（パフォーマンス改善）
-- ============================================================

-- pipeline_leads.contact_email（Stripe webhook + auto-send で頻繁にクエリ）
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_contact_email
  ON pipeline_leads(contact_email);

-- customers.stripe_subscription_id（subscription.deleted/updated で使用）
CREATE INDEX IF NOT EXISTS idx_customers_stripe_subscription_id
  ON customers(stripe_subscription_id);

-- pipeline_leads.phase + follow_up_scheduled（Cron auto-send で使用）
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_followup
  ON pipeline_leads(phase, follow_up_scheduled)
  WHERE phase IN ('sent', 'step2', 'step3') AND follow_up_scheduled IS NOT NULL;
