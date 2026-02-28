-- ===========================================
-- AIO Insight — Supabase Migration
-- Run this in Supabase SQL Editor
-- ===========================================

-- 1. leads: 診断申込者
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  url TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  llmo_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);

-- 2. diagnosis_reports: 診断結果
CREATE TABLE IF NOT EXISTS diagnosis_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  pagespeed_data JSONB,
  html_analysis JSONB,
  weaknesses JSONB,
  suggestions JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_diagnosis_reports_lead_id ON diagnosis_reports(lead_id);

-- 3. customers: 有料顧客
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  supabase_user_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_stripe_customer_id ON customers(stripe_customer_id);

-- 4. email_logs: メール送信ログ
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);

-- ===========================================
-- updated_at トリガー関数
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- Row Level Security (RLS)
-- ===========================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (API routes use service_role key)
-- These policies allow service_role full access via supabaseAdmin

-- leads: service_role full access
CREATE POLICY "service_role_leads" ON leads
  FOR ALL USING (true) WITH CHECK (true);

-- diagnosis_reports: service_role full access
CREATE POLICY "service_role_diagnosis_reports" ON diagnosis_reports
  FOR ALL USING (true) WITH CHECK (true);

-- customers: authenticated users can read their own row
CREATE POLICY "customers_read_own" ON customers
  FOR SELECT USING (auth.uid() = supabase_user_id);

-- customers: service_role full access
CREATE POLICY "service_role_customers" ON customers
  FOR ALL USING (true) WITH CHECK (true);

-- email_logs: service_role full access
CREATE POLICY "service_role_email_logs" ON email_logs
  FOR ALL USING (true) WITH CHECK (true);

-- diagnosis_reports: authenticated customer can read own reports via lead email
CREATE POLICY "customers_read_own_reports" ON diagnosis_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN customers c ON c.email = l.email
      WHERE l.id = diagnosis_reports.lead_id
        AND c.supabase_user_id = auth.uid()
    )
  );
