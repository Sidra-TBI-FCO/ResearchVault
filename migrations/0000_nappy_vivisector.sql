CREATE TABLE "data_management_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"research_activity_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"data_collection_methods" text,
	"data_storage_plan" text,
	"data_sharing_plan" text,
	"retention_period" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ibc_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"research_activity_id" integer,
	"ibc_number" text NOT NULL,
	"cayuse_protocol_number" text,
	"title" text NOT NULL,
	"principal_investigator_id" integer NOT NULL,
	"submission_date" timestamp,
	"approval_date" date,
	"expiration_date" date,
	"status" text NOT NULL,
	"documents" json,
	"people_involved" integer[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ibc_applications_ibc_number_unique" UNIQUE("ibc_number")
);
--> statement-breakpoint
CREATE TABLE "irb_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"research_activity_id" integer,
	"irb_number" text NOT NULL,
	"irb_net_number" text,
	"old_number" text,
	"title" text NOT NULL,
	"short_title" text,
	"principal_investigator_id" integer NOT NULL,
	"additional_notification_email" text,
	"protocol_type" text,
	"is_interventional" boolean DEFAULT false,
	"submission_date" timestamp,
	"initial_approval_date" date,
	"expiration_date" date,
	"status" text NOT NULL,
	"subject_enrollment_reasons" text[],
	"description" text,
	"documents" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "irb_applications_irb_number_unique" UNIQUE("irb_number")
);
--> statement-breakpoint
CREATE TABLE "patents" (
	"id" serial PRIMARY KEY NOT NULL,
	"research_activity_id" integer,
	"title" text NOT NULL,
	"inventors" text NOT NULL,
	"filing_date" timestamp,
	"grant_date" timestamp,
	"patent_number" text,
	"status" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "programs_program_id_unique" UNIQUE("program_id")
);
--> statement-breakpoint
CREATE TABLE "project_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_group_id" text NOT NULL,
	"program_id" integer,
	"name" text NOT NULL,
	"description" text,
	"lead_scientist_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_groups_project_group_id_unique" UNIQUE("project_group_id")
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"research_activity_id" integer NOT NULL,
	"scientist_id" integer NOT NULL,
	"role" text
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" serial PRIMARY KEY NOT NULL,
	"research_activity_id" integer,
	"title" text NOT NULL,
	"abstract" text,
	"authors" text NOT NULL,
	"journal" text,
	"volume" text,
	"issue" text,
	"pages" text,
	"doi" text,
	"publication_date" timestamp,
	"publication_type" text,
	"status" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "research_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"sdr_number" text NOT NULL,
	"project_group_id" integer,
	"title" text NOT NULL,
	"short_title" text,
	"description" text,
	"status" text DEFAULT 'planning' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"lead_pi_id" integer,
	"budget_holder_id" integer,
	"line_manager_id" integer,
	"additional_notification_email" text,
	"sidra_branch" text,
	"budget_source" text,
	"objectives" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "research_activities_sdr_number_unique" UNIQUE("sdr_number")
);
--> statement-breakpoint
CREATE TABLE "research_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"research_activity_id" integer,
	"contract_number" text NOT NULL,
	"title" text NOT NULL,
	"lead_pi_id" integer,
	"irb_protocol" text,
	"qnrf_number" text,
	"request_state" text,
	"start_date" date,
	"end_date" date,
	"remarks" text,
	"funding_source_category" text,
	"contractor_name" text,
	"internal_cost_sidra" integer,
	"internal_cost_counterparty" integer,
	"money_out" integer,
	"is_po_relevant" boolean DEFAULT false,
	"contract_type" text,
	"status" text NOT NULL,
	"description" text,
	"documents" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "research_contracts_contract_number_unique" UNIQUE("contract_number")
);
--> statement-breakpoint
CREATE TABLE "scientists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"title" text,
	"email" text NOT NULL,
	"department" text,
	"role" text,
	"bio" text,
	"profile_image_initials" text,
	"is_staff" boolean DEFAULT false,
	"supervisor_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "scientists_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "project_scientist_idx" ON "project_members" USING btree ("research_activity_id","scientist_id");