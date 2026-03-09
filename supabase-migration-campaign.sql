-- Add campaign column to pipeline_leads for multi-campaign support
-- campaign: 'aio' (LLMO diagnosis) or 'training' (AI研修・人材派遣)

ALTER TABLE pipeline_leads
ADD COLUMN IF NOT EXISTS campaign TEXT DEFAULT 'aio';

-- Set existing leads to 'aio' (backward compatible)
UPDATE pipeline_leads SET campaign = 'aio' WHERE campaign IS NULL;

-- Index for filtering by campaign
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_campaign ON pipeline_leads (campaign);

-- Composite index for cron query (campaign + phase + follow_up_scheduled)
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_campaign_phase_schedule
ON pipeline_leads (campaign, phase, follow_up_scheduled)
WHERE follow_up_scheduled IS NOT NULL;
