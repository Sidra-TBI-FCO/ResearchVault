// Enrich journals.field by looking up each journal's ISSN/eISSN in OpenAlex
// and using the journal's top topic field (e.g., "Medicine", "Materials Science")
// as the subject category.
//
// Usage:
//   node scripts/enrich-journal-fields-from-openalex.js [--overwrite] [--csv path]
//
// Defaults:
//   - Only journals with NULL/empty `field` are updated.
//   - Writes a CSV snapshot to scripts/journal-fields-openalex.csv for audit.
//
// Notes:
//   - Uses the public OpenAlex `/sources` endpoint with batched ISSN filters
//     (`issn:A|B|C...`). No API key required; sends a mailto for the polite pool.
//   - About 75% of journals in this DB have a usable ISSN/eISSN.

import fs from 'fs';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const argv = process.argv.slice(2);
const overwrite = argv.includes('--overwrite');
const csvIdx = argv.indexOf('--csv');
const csvPath = csvIdx >= 0 ? argv[csvIdx + 1] : 'scripts/journal-fields-openalex.csv';
const MAILTO = process.env.OPENALEX_MAILTO || 'qbridge-admin@example.org';
const BATCH = 50;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const where = overwrite ? '' : "WHERE field IS NULL OR field = ''";
  const { rows: journals } = await pool.query(
    `SELECT id, journal_name, issn, eissn FROM journals ${where} ORDER BY id`
  );
  console.log(`Loaded ${journals.length} journals to enrich`);

  const issnToJournals = new Map();
  for (const j of journals) {
    for (const id of [j.issn, j.eissn]) {
      if (!id || id === 'N/A') continue;
      const arr = issnToJournals.get(id) || [];
      arr.push(j.id);
      issnToJournals.set(id, arr);
    }
  }
  const allIssns = [...issnToJournals.keys()];
  console.log(`Unique ISSNs to query: ${allIssns.length}`);

  const fieldByJournalId = new Map();
  let processed = 0, errors = 0;
  const start = Date.now();

  for (let i = 0; i < allIssns.length; i += BATCH) {
    const batch = allIssns.slice(i, i + BATCH);
    const sources = await fetchBatch(batch);
    for (const src of sources) {
      const topField = src.topics?.[0]?.field?.display_name;
      if (!topField) continue;
      for (const issn of (src.issn || [])) {
        for (const jid of issnToJournals.get(issn) || []) {
          if (!fieldByJournalId.has(jid)) fieldByJournalId.set(jid, topField);
        }
      }
    }
    processed += batch.length;
    if (i % (BATCH * 20) === 0) {
      console.log(`  ${processed}/${allIssns.length} ISSNs, matched ${fieldByJournalId.size} journals (${((Date.now()-start)/1000).toFixed(0)}s)`);
    }
  }
  console.log(`Matched ${fieldByJournalId.size} journals from OpenAlex`);

  const journalById = new Map(journals.map(j => [j.id, j]));
  const csvRows = [['journal_id', 'journal_name', 'field']];
  for (const [jid, field] of fieldByJournalId) {
    const j = journalById.get(jid);
    csvRows.push([jid, csvCell(j?.journal_name ?? ''), csvCell(field)]);
  }
  fs.writeFileSync(csvPath, csvRows.map(r => r.join(',')).join('\n'));
  console.log(`Wrote snapshot CSV: ${csvPath} (${csvRows.length - 1} rows)`);

  const byField = new Map();
  for (const [jid, field] of fieldByJournalId) {
    const arr = byField.get(field) || [];
    arr.push(jid);
    byField.set(field, arr);
  }

  let updated = 0;
  for (const [field, ids] of byField) {
    for (let i = 0; i < ids.length; i += 5000) {
      const chunk = ids.slice(i, i + 5000);
      const guard = overwrite ? '' : "AND (field IS NULL OR field = '')";
      const res = await pool.query(
        `UPDATE journals SET field = $1, updated_at = NOW() WHERE id = ANY($2::int[]) ${guard}`,
        [field, chunk]
      );
      updated += res.rowCount || 0;
    }
  }
  console.log(`Updated ${updated} journals.field rows`);
  await pool.end();

  async function fetchBatch(batch, attempt = 0) {
    const url = `https://api.openalex.org/sources?filter=${encodeURIComponent('issn:' + batch.join('|'))}&per-page=200&select=id,display_name,issn,topics&mailto=${encodeURIComponent(MAILTO)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if ((res.status === 429 || res.status >= 500) && attempt < 3) {
          await sleep(1000 * (attempt + 1));
          return fetchBatch(batch, attempt + 1);
        }
        errors++;
        return [];
      }
      const j = await res.json();
      return j.results || [];
    } catch (e) {
      if (attempt < 3) {
        await sleep(1000 * (attempt + 1));
        return fetchBatch(batch, attempt + 1);
      }
      errors++;
      return [];
    }
  }
}

function csvCell(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch((err) => {
  console.error('Enrichment failed:', err);
  process.exit(1);
});
