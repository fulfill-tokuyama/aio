-- Migration: diagnosis_reports に breakdown, weakness_details カラムを追加
-- 既存の weaknesses (string[]) / suggestions (string[]) はそのまま残す

ALTER TABLE diagnosis_reports
  ADD COLUMN IF NOT EXISTS breakdown JSONB,
  ADD COLUMN IF NOT EXISTS weakness_details JSONB;

-- /diagnosis ページからの匿名診断でも保存できるよう、lead_id を nullable に変更
ALTER TABLE diagnosis_reports
  ALTER COLUMN lead_id DROP NOT NULL;

-- 匿名診断結果の URL を保存するカラム
ALTER TABLE diagnosis_reports
  ADD COLUMN IF NOT EXISTS url TEXT;

-- 匿名ユーザーが後から登録した際に紐付けるための user_id カラム
ALTER TABLE diagnosis_reports
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 認証済みユーザーが自分の診断結果を読めるRLSポリシー
DROP POLICY IF EXISTS "authenticated_read_own_diagnosis" ON diagnosis_reports;
CREATE POLICY "authenticated_read_own_diagnosis" ON diagnosis_reports
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 匿名診断用: anon ユーザーが INSERT できるポリシー
DROP POLICY IF EXISTS "anon_insert_diagnosis" ON diagnosis_reports;
CREATE POLICY "anon_insert_diagnosis" ON diagnosis_reports
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_diagnosis_reports_user_id ON diagnosis_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_reports_url ON diagnosis_reports(url);
