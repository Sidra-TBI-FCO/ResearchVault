-- Rename leadPIId to principalInvestigatorId in research_activities table
ALTER TABLE research_activities
RENAME COLUMN lead_pi_id TO principal_investigator_id;

-- Add leadScientistId column to research_activities table
ALTER TABLE research_activities
ADD COLUMN lead_scientist_id INTEGER;

-- Add program role fields to programs table
ALTER TABLE programs
ADD COLUMN program_director_id INTEGER,
ADD COLUMN research_co_lead_id INTEGER,
ADD COLUMN clinical_co_lead_1_id INTEGER,
ADD COLUMN clinical_co_lead_2_id INTEGER;

-- Rename leadScientistId to principalInvestigatorId in projects table
ALTER TABLE projects
RENAME COLUMN lead_scientist_id TO principal_investigator_id;