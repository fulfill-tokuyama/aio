-- improvement_tasks テーブル作成
-- Supabase SQL Editor で実行してください

CREATE TABLE IF NOT EXISTS improvement_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id text NOT NULL,
  diagnosis_id text,
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('structured_data', 'meta_tags', 'content', 'eeat', 'technical', 'other')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority text DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_improvement_tasks_customer_id ON improvement_tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_improvement_tasks_status ON improvement_tasks(status);

-- RLS有効化
ALTER TABLE improvement_tasks ENABLE ROW LEVEL SECURITY;

-- service_role のみアクセス可能（APIルート経由でのみ操作）
CREATE POLICY "Service role full access" ON improvement_tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);
