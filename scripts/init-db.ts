import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function initializeDb() {
  console.log("Creating database tables...");
  
  // Push the schema to the database
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `);
    
    // Create scientists table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS scientists (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        title TEXT,
        email TEXT NOT NULL UNIQUE,
        department TEXT,
        role TEXT,
        bio TEXT,
        profile_image_initials TEXT,
        is_staff BOOLEAN DEFAULT false,
        supervisor_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create programs table (PRM)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS programs (
        id SERIAL PRIMARY KEY,
        program_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create project_groups table (PRJ)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS project_groups (
        id SERIAL PRIMARY KEY,
        project_group_id TEXT NOT NULL UNIQUE,
        program_id INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        lead_scientist_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create research_activities table (SDR)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS research_activities (
        id SERIAL PRIMARY KEY,
        sdr_number TEXT NOT NULL UNIQUE,
        project_group_id INTEGER,
        title TEXT NOT NULL,
        short_title TEXT,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'planning',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        lead_pi_id INTEGER,
        budget_holder_id INTEGER,
        line_manager_id INTEGER,
        additional_notification_email TEXT,
        sidra_branch TEXT,
        budget_source TEXT,
        objectives TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create project_members table (joins scientists and research activities)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        research_activity_id INTEGER NOT NULL,
        scientist_id INTEGER NOT NULL,
        role TEXT,
        UNIQUE(research_activity_id, scientist_id)
      );
    `);
    
    // Create data_management_plans table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS data_management_plans (
        id SERIAL PRIMARY KEY,
        research_activity_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        data_collection_methods TEXT,
        data_storage_plan TEXT,
        data_sharing_plan TEXT,
        retention_period TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create publications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS publications (
        id SERIAL PRIMARY KEY,
        research_activity_id INTEGER,
        title TEXT NOT NULL,
        abstract TEXT,
        authors TEXT NOT NULL,
        journal TEXT,
        volume TEXT,
        issue TEXT,
        pages TEXT,
        doi TEXT,
        publication_date TIMESTAMP,
        publication_type TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create patents table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS patents (
        id SERIAL PRIMARY KEY,
        research_activity_id INTEGER,
        title TEXT NOT NULL,
        inventors TEXT NOT NULL,
        filing_date TIMESTAMP,
        grant_date TIMESTAMP,
        patent_number TEXT,
        status TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create irb_applications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS irb_applications (
        id SERIAL PRIMARY KEY,
        research_activity_id INTEGER,
        irb_number TEXT NOT NULL UNIQUE,
        irb_net_number TEXT,
        old_number TEXT,
        title TEXT NOT NULL,
        short_title TEXT,
        principal_investigator_id INTEGER NOT NULL,
        additional_notification_email TEXT,
        protocol_type TEXT,
        is_interventional BOOLEAN DEFAULT false,
        submission_date TIMESTAMP,
        initial_approval_date DATE,
        expiration_date DATE,
        status TEXT NOT NULL,
        subject_enrollment_reasons TEXT[],
        description TEXT,
        documents JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create ibc_applications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ibc_applications (
        id SERIAL PRIMARY KEY,
        research_activity_id INTEGER,
        ibc_number TEXT NOT NULL UNIQUE,
        cayuse_protocol_number TEXT,
        title TEXT NOT NULL,
        principal_investigator_id INTEGER NOT NULL,
        submission_date TIMESTAMP,
        approval_date DATE,
        expiration_date DATE,
        status TEXT NOT NULL,
        documents JSONB,
        people_involved INTEGER[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create research_contracts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS research_contracts (
        id SERIAL PRIMARY KEY,
        research_activity_id INTEGER,
        contract_number TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        lead_pi_id INTEGER,
        irb_protocol TEXT,
        qnrf_number TEXT,
        request_state TEXT,
        start_date DATE,
        end_date DATE,
        remarks TEXT,
        funding_source_category TEXT,
        contractor_name TEXT,
        internal_cost_sidra INTEGER,
        internal_cost_counterparty INTEGER,
        money_out INTEGER,
        is_po_relevant BOOLEAN DEFAULT false,
        contract_type TEXT,
        status TEXT NOT NULL,
        description TEXT,
        documents JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log("Database tables created successfully");
  } catch (error) {
    console.error("Error creating database tables:", error);
    throw error;
  }
}

initializeDb()
  .then(() => {
    console.log("Database initialization complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });