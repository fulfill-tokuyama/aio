-- パイプラインリードに連絡先情報カラムを追加
-- Supabase SQLエディタで実行してください

ALTER TABLE pipeline_leads
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_page_url TEXT;
