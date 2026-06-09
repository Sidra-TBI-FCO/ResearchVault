-- Align scientists table with the current schema.
-- The initial migration used old column names; this brings the table up to date.
-- All statements use IF NOT EXISTS / IF EXISTS so they are safe to re-run.

-- 1. Add new columns (with safe defaults so existing rows are valid)
ALTER TABLE scientists ADD COLUMN IF NOT EXISTS honorific_title text NOT NULL DEFAULT '';
ALTER TABLE scientists ADD COLUMN IF NOT EXISTS job_title       text;
ALTER TABLE scientists ADD COLUMN IF NOT EXISTS staff_type      text NOT NULL DEFAULT 'scientific';

-- 2. Back-fill honorific_title from the old `title` column where available
UPDATE scientists SET honorific_title = title WHERE honorific_title = '' AND title IS NOT NULL AND title != '';

-- 3. Back-fill first_name / last_name from the old composite `name` column
--    (only for rows that were created with the old schema and have no first/last name yet)
UPDATE scientists
  SET first_name = split_part(name, ' ', 1),
      last_name  = NULLIF(trim(substring(name from position(' ' in name))), '')
WHERE (first_name IS NULL OR first_name = '')
  AND name IS NOT NULL AND name != '';

-- 4. Remove old columns that are no longer in the schema
ALTER TABLE scientists DROP COLUMN IF EXISTS name;
ALTER TABLE scientists DROP COLUMN IF EXISTS title;
ALTER TABLE scientists DROP COLUMN IF EXISTS is_staff;
ALTER TABLE scientists DROP COLUMN IF EXISTS role;
