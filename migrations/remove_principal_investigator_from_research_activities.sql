-- Remove principal_investigator_id column from research_activities table
-- Principal Investigator information will now be fetched from project_members table

ALTER TABLE research_activities DROP COLUMN IF EXISTS principal_investigator_id;