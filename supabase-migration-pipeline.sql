-- ============================================================
-- Pipeline Leads テーブル（営業管理CRM用）
-- 既存の leads テーブルはLP診断用なので別テーブルとして作成
-- ============================================================

CREATE TABLE pipeline_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company TEXT NOT NULL,
  url TEXT NOT NULL,
  industry TEXT,
  region TEXT,
  company_size TEXT,
  revenue TEXT,
  has_ad_spend BOOLEAN DEFAULT false,
  llmo_score INTEGER DEFAULT 0,
  ai_score INTEGER DEFAULT 0,
  weaknesses JSONB DEFAULT '[]',
  phase TEXT NOT NULL DEFAULT 'discovered',
  form_url TEXT,
  stripe_status TEXT,
  mrr INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  template_used TEXT,
  follow_up_count INTEGER DEFAULT 0,
  follow_up_scheduled TIMESTAMPTZ,
  diagnosis_sent BOOLEAN DEFAULT false,
  opened_email BOOLEAN DEFAULT false,
  clicked_link BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX idx_pipeline_leads_phase ON pipeline_leads (phase);
CREATE INDEX idx_pipeline_leads_ai_score ON pipeline_leads (ai_score DESC);
CREATE INDEX idx_pipeline_leads_industry ON pipeline_leads (industry);
CREATE INDEX idx_pipeline_leads_created_at ON pipeline_leads (created_at DESC);

-- updated_at 自動更新トリガー（既存の関数を再利用、なければ作成）
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pipeline_leads_updated_at
  BEFORE UPDATE ON pipeline_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
