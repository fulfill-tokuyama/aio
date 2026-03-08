-- ============================================================
-- AI Search 機能追加: pipeline_leads に企業詳細フィールドを追加
-- Supabase SQLエディタで実行してください
-- ============================================================

ALTER TABLE pipeline_leads
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,
  ADD COLUMN IF NOT EXISTS employee_count TEXT,
  ADD COLUMN IF NOT EXISTS representative TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_position TEXT,
  ADD COLUMN IF NOT EXISTS capital TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS heat_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
