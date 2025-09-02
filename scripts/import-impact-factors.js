// Script to import journal impact factors from CSV
import fs from 'fs';

function parseCSV() {
  const csvContent = fs.readFileSync('../attached_assets/JCR2023_1756802332065.csv', 'utf8');
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
    
    if (values.length >= 4) {
      const impactFactorStr = values[2]; // JIF column
      const impactFactor = parseFloat(impactFactorStr);
      const rank = parseInt(values[3]) || null; // Rank column
      
      if (!isNaN(impactFactor) && values[0] && values[0].trim()) {
        data.push({
          journalName: values[0], // Journal name
          abbreviatedJournal: null, // Not available in this format
          year: 2022, // Set to 2022 for this dataset
          publisher: null, // Not available in this format
          issn: null, // Not available in this format
          eissn: null, // Not available in this format
          totalCites: null, // Not available in this format
          totalArticles: null, // Not available in this format
          citableItems: null, // Not available in this format
          citedHalfLife: null, // Not available in this format
          citingHalfLife: null, // Not available in this format
          impactFactor: impactFactor, // JIF
          fiveYearJif: null, // Not available in this format
          jifWithoutSelfCites: null, // Not available in this format
          jci: null, // Not available in this format
          quartile: null, // Not available in this format
          rank: rank, // Rank
          totalCitations: null // Not available in this format
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