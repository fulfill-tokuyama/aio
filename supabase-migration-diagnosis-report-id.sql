-- Migration: pipeline_leads に diagnosis_report_id を追加
-- 事前診断済みレポートへのリンクをメールで送るため

ALTER TABLE pipeline_leads
  ADD COLUMN IF NOT EXISTS diagnosis_report_id UUID REFERENCES diagnosis_reports(id);

CREATE INDEX IF NOT EXISTS idx_pipeline_leads_diagnosis_report_id
  ON pipeline_leads(diagnosis_report_id);
