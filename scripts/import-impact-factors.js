// Script to import journal impact factors from CSV
import fs from 'fs';

function parseCSV() {
  const csvContent = fs.readFileSync('../attached_assets/JCR2024_1756801503896.csv', 'utf8');
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
    
    if (values.length >= 7) {
      const impactFactorStr = values[4]; // JIF column
      const impactFactor = parseFloat(impactFactorStr);
      
      if (!isNaN(impactFactor)) {
        // Parse category field (format: "CATEGORY|QUARTILE|RANK/TOTAL")
        const categoryInfo = values[6] || '';
        const categoryParts = categoryInfo.split('|');
        const category = categoryParts[0] || null;
        const quartile = categoryParts[1] || null;
        const rankInfo = categoryParts[2] || '';
        const rank = rankInfo.includes('/') ? parseInt(rankInfo.split('/')[0]) || null : null;
        
        data.push({
          journalName: values[0], // Name
          abbreviatedJournal: values[1], // Abbr Name
          year: 2023, // Set to 2023 as requested
          publisher: null, // Not available in this format
          issn: values[2] || null, // ISSN
          eissn: values[3] || null, // EISSN
          totalCites: null, // Not available in this format
          totalArticles: null, // Not available in this format
          citableItems: null, // Not available in this format
          citedHalfLife: null, // Not available in this format
          citingHalfLife: null, // Not available in this format
          impactFactor: impactFactor, // JIF
          fiveYearJif: parseFloat(values[5]) || null, // JIF5Years
          jifWithoutSelfCites: null, // Not available in this format
          jci: null, // Not available in this format
          quartile: quartile, // Extracted from category
          rank: rank, // Extracted from category
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