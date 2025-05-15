-- Rename project_groups table to projects
ALTER TABLE IF EXISTS project_groups RENAME TO projects;

-- Rename project_group_id column to project_id in projects table
ALTER TABLE IF EXISTS projects RENAME COLUMN project_group_id TO project_id;

-- Rename project_group_id column to project_id in research_activities table
ALTER TABLE IF EXISTS research_activities RENAME COLUMN project_group_id TO project_id;