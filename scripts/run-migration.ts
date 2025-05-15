import { Pool, neonConfig } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import ws from 'ws';

// Configure neon to use ws
neonConfig.webSocketConstructor = ws;

// Get the directory name using ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Running migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../migrations/rename_project_groups.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // Execute the SQL
    const result = await pool.query(sql);
    console.log('Migration completed successfully');
    console.log(result);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);