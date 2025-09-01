// Script to import journal impact factors from CSV
import fs from 'fs';

function parseCSV() {
  const csvContent = fs.readFileSync('attached_assets/JCRImpactFactors2025_1756724005059.csv', 'utf8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV with proper quote handling
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (values.length >= 18) {
      const impactFactorStr = values[12]; // JIF 2024 column
      const impactFactor = parseFloat(impactFactorStr);
      
      if (!isNaN(impactFactor)) {
        data.push({
          journalName: values[1], // Journal Name
          year: 2024,
          impactFactor: impactFactor,
          quartile: values[16], // JIF Quartile
          rank: parseInt(values[17]?.split('/')[0]) || null, // JIF Rank (before slash)
          totalCitations: parseInt(values[7]) || null, // Total Cites
          publisher: values[4] || null // Publisher
        });
      }
    }
  }
  
  return data;
}

async function importData() {
  try {
    const data = parseCSV();
    console.log(`Parsed ${data.length} valid impact factor records`);
    
    // Process in batches of 1000 to avoid payload size limits
    const batchSize = 1000;
    let totalImported = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      console.log(`Importing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)} (${batch.length} records)`);
      
      const response = await fetch('http://localhost:5000/api/journal-impact-factors/import-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvData: batch })
      });
      
      const result = await response.json();
      totalImported += result.imported || 0;
      console.log(`Batch result: imported ${result.imported} of ${result.total}`);
    }
    
    console.log(`\nTotal imported: ${totalImported} records`);
  } catch (error) {
    console.error('Import failed:', error);
  }
}

importData();