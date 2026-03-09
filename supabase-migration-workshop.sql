-- Workshop registrations table
CREATE TABLE IF NOT EXISTS workshop_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  position TEXT,
  employee_count TEXT,
  industry TEXT,
  interests TEXT[] DEFAULT '{}',
  workshop_date TEXT,
  status TEXT DEFAULT 'registered',  -- registered, attended, no_show, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workshop_email ON workshop_registrations (email);
CREATE INDEX IF NOT EXISTS idx_workshop_date ON workshop_registrations (workshop_date);
CREATE INDEX IF NOT EXISTS idx_workshop_status ON workshop_registrations (status);

-- RLS: service_role only (admin access)
ALTER TABLE workshop_registrations ENABLE ROW LEVEL SECURITY;
