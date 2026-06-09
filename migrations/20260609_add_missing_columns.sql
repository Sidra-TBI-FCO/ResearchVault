-- Add columns that exist in the current Drizzle schema but are absent from
-- the tables created by the original migration files.
-- All statements use IF NOT EXISTS so they are safe to re-run.

-- ── scientists ────────────────────────────────────────────────────────────────
ALTER TABLE scientists ADD COLUMN IF NOT EXISTS staff_id              text UNIQUE;
ALTER TABLE scientists ADD COLUMN IF NOT EXISTS orcid_id              text;
ALTER TABLE scientists ADD COLUMN IF NOT EXISTS linkedin_url          text;
ALTER TABLE scientists ADD COLUMN IF NOT EXISTS google_scholar_url    text;
ALTER TABLE scientists ADD COLUMN IF NOT EXISTS web_of_science_id     text;

-- ── research_activities ───────────────────────────────────────────────────────
ALTER TABLE research_activities ADD COLUMN IF NOT EXISTS staff_scientist_id  integer;
ALTER TABLE research_activities ADD COLUMN IF NOT EXISTS grant_codes         text[];

-- ── research_contracts ────────────────────────────────────────────────────────
ALTER TABLE research_contracts ADD COLUMN IF NOT EXISTS ibc_protocol              text;
ALTER TABLE research_contracts ADD COLUMN IF NOT EXISTS counterparty_contact      text;
ALTER TABLE research_contracts ADD COLUMN IF NOT EXISTS counterparty_country      text;
ALTER TABLE research_contracts ADD COLUMN IF NOT EXISTS requested_by_user_id      integer;
ALTER TABLE research_contracts ADD COLUMN IF NOT EXISTS contract_value            numeric(15,2);
ALTER TABLE research_contracts ADD COLUMN IF NOT EXISTS currency                  text DEFAULT 'QAR';
ALTER TABLE research_contracts ADD COLUMN IF NOT EXISTS initiation_requested_at   timestamp;
ALTER TABLE research_contracts ADD COLUMN IF NOT EXISTS reminder_email            text;
ALTER TABLE research_contracts ADD COLUMN IF NOT EXISTS office_form_status        text DEFAULT 'incomplete';

-- ── publications ──────────────────────────────────────────────────────────────
-- Check what the publications table already has vs. the schema
ALTER TABLE publications ADD COLUMN IF NOT EXISTS journal_id          integer;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS doi                 text;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS volume              text;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS issue               text;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS pages               text;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS publication_date    date;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS impact_factor       numeric(10,3);
ALTER TABLE publications ADD COLUMN IF NOT EXISTS citations           integer;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS abstract            text;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS keywords            text[];
ALTER TABLE publications ADD COLUMN IF NOT EXISTS pub_med_id          text;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS web_of_science_id   text;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS quartile            text;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS notes               text;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS research_activity_id integer;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS manuscript_received_date  date;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS manuscript_accepted_date  date;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS status              text DEFAULT 'submitted';

-- ── irb_applications ─────────────────────────────────────────────────────────
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS irb_number               text;
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS principal_investigator_id integer;
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS study_type               text;
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS risk_level               text;
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS research_activity_id     integer;
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS short_title              text;
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS additional_notification_email text;
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS workflow_status          text DEFAULT 'draft';
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS current_submission_id    integer;
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS committee_review_type    text;
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS approval_date            date;
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS expiry_date              date;
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS office_comments          json DEFAULT '[]';
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS pi_responses             json DEFAULT '[]';
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS reviewer_assignments     json;
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS form_data                json;
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS created_at               timestamp DEFAULT now();
ALTER TABLE irb_applications ADD COLUMN IF NOT EXISTS updated_at               timestamp DEFAULT now();

-- ── ibc_applications ─────────────────────────────────────────────────────────
-- Most columns already created in base migration; add any that are new in the schema
ALTER TABLE ibc_applications ADD COLUMN IF NOT EXISTS created_at   timestamp DEFAULT now();
ALTER TABLE ibc_applications ADD COLUMN IF NOT EXISTS updated_at   timestamp DEFAULT now();

-- ── data_management_plans ────────────────────────────────────────────────────
ALTER TABLE data_management_plans ADD COLUMN IF NOT EXISTS dmp_number          text;
ALTER TABLE data_management_plans ADD COLUMN IF NOT EXISTS research_activity_id integer;
ALTER TABLE data_management_plans ADD COLUMN IF NOT EXISTS principal_investigator_id integer;
ALTER TABLE data_management_plans ADD COLUMN IF NOT EXISTS data_types          text[];
ALTER TABLE data_management_plans ADD COLUMN IF NOT EXISTS storage_location    text;
ALTER TABLE data_management_plans ADD COLUMN IF NOT EXISTS retention_period    text;
ALTER TABLE data_management_plans ADD COLUMN IF NOT EXISTS sharing_plan        text;
ALTER TABLE data_management_plans ADD COLUMN IF NOT EXISTS review_date         date;
ALTER TABLE data_management_plans ADD COLUMN IF NOT EXISTS approved_by         integer;
ALTER TABLE data_management_plans ADD COLUMN IF NOT EXISTS version             integer DEFAULT 1;
ALTER TABLE data_management_plans ADD COLUMN IF NOT EXISTS notes               text;
ALTER TABLE data_management_plans ADD COLUMN IF NOT EXISTS created_at          timestamp DEFAULT now();
ALTER TABLE data_management_plans ADD COLUMN IF NOT EXISTS updated_at          timestamp DEFAULT now();

-- ── patents ───────────────────────────────────────────────────────────────────
ALTER TABLE patents ADD COLUMN IF NOT EXISTS created_at  timestamp DEFAULT now();
ALTER TABLE patents ADD COLUMN IF NOT EXISTS updated_at  timestamp DEFAULT now();

-- ── programs ──────────────────────────────────────────────────────────────────
ALTER TABLE programs ADD COLUMN IF NOT EXISTS created_at  timestamp DEFAULT now();
ALTER TABLE programs ADD COLUMN IF NOT EXISTS updated_at  timestamp DEFAULT now();

-- ── project_members ───────────────────────────────────────────────────────────
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS is_lead     boolean DEFAULT false;
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS start_date  date;
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS end_date    date;
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS created_at  timestamp DEFAULT now();
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS updated_at  timestamp DEFAULT now();
