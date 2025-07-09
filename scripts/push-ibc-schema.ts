import { execSync } from 'child_process';

// Script to push IBC schema changes and handle the interactive prompt
async function pushIbcSchema() {
  try {
    console.log('Pushing IBC schema changes...');
    
    // Use echo to automatically select the first option (create column)
    const result = execSync('echo "" | npm run db:push', { 
      stdio: 'inherit',
      timeout: 30000 
    });
    
    console.log('Schema push completed successfully');
  } catch (error) {
    console.error('Error pushing schema:', error);
    process.exit(1);
  }
}

pushIbcSchema();