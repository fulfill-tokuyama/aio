-- supabase-migration-leadgenius.sql
-- Add previous_phase column for LeadGenius queue management
ALTER TABLE pipeline_leads ADD COLUMN IF NOT EXISTS previous_phase TEXT;
