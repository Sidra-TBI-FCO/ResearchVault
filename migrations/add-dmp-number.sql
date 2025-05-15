-- Add dmp_number column to data_management_plans table
ALTER TABLE data_management_plans ADD COLUMN dmp_number text;

-- Set initial values for existing records
UPDATE data_management_plans SET dmp_number = 'DMP-' || LPAD(id::text, 3, '0') WHERE dmp_number IS NULL;

-- Make the column NOT NULL and UNIQUE
ALTER TABLE data_management_plans ALTER COLUMN dmp_number SET NOT NULL;
ALTER TABLE data_management_plans ADD CONSTRAINT data_management_plans_dmp_number_unique UNIQUE (dmp_number);