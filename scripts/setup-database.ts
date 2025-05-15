import { execSync } from 'child_process';

// This script will set up the database by:
// 1. Running drizzle-kit push with the --force option to bypass the prompt
// 2. Running our custom setup script to add the admin user and seed data

async function setup() {
  console.log("Starting database setup process...");
  
  try {
    // First, push the schema with the force option
    console.log("Pushing database schema...");
    execSync('npx drizzle-kit push:pg --force', { stdio: 'inherit' });
    
    // Then run our custom setup script
    console.log("Running database setup script...");
    execSync('tsx scripts/db-setup.ts', { stdio: 'inherit' });
    
    console.log("Database setup completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Database setup failed:", error);
    process.exit(1);
  }
}

setup();