// Import journal impact factors and/or subject categories from a JCR-style CSV.
//
// The CSV must have a header row. The following columns are recognized
// (case-insensitive); only `journalName` is required:
//   - Journal name / Full Journal Title / Title
//   - Abbreviated Journal / Abbreviated Title
//   - ISSN, eISSN
//   - Publisher
//   - Category / Subject Area / SubjectArea / Field        --> journals.field
//   - Year (defaults to --year arg, otherwise 2022)
//   - JIF / Impact Factor / 2-year JIF
//   - 5-Year JIF, JIF Without Self-Cites, JCI
//   - Quartile, Rank
//   - Total Cites, Total Articles, Citable Items
//   - Cited Half-Life, Citing Half-Life
//
// Usage:
//   node scripts/import-impact-factors.js --file path/to/jcr.csv [--year 2023]
//
// Behavior:
//   - If a row has a metric value (JIF, rank, etc.), it is posted to
//     /api/journal-impact-factors/import-csv so a journal + per-year metric
//     row is upserted.
//   - If a row only carries a Category/Field for an existing journal, it
//     PATCHes /api/journal-impact-factors/:id/field to set the category on
//     the existing journal record (lookup by ISSN/eISSN, then by name).
//   - Either flow populates `journals.field`, which drives the Impact Factors
//     Field filter in Outcome Office.

import fs from 'fs';
import path from 'path';

const argv = process.argv.slice(2);
function arg(name, fallback) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
}
const file = arg('--file');
const defaultYear = parseInt(arg('--year', '2022'), 10);
const baseUrl = process.env.IMPORT_BASE_URL || 'http://localhost:5000';

if (!file) {
  console.error('Usage: node scripts/import-impact-factors.js --file path/to/jcr.csv [--year 2023]');
  process.exit(1);
}

function parseCsvLine(line) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim().replace(/^"|"$/g, ''));
}

function header(headers, ...aliases) {
  for (const a of aliases) {
    const idx = headers.findIndex(h => h === a.toLowerCase());
    if (idx >= 0) return idx;
  }
  return -1;
}

function num(v) {
  if (v == null || v === '' || v === 'N/A') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function int(v) {
  if (v == null || v === '' || v === 'N/A') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function loadCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  const headers = parseCsvLine(lines.shift()).map(h => h.toLowerCase());

  const ix = {
    journalName: header(headers, 'journal name', 'full journal title', 'title', 'journalname'),
    abbreviated: header(headers, 'abbreviated journal', 'abbreviated title', 'jcr abbreviation'),
    issn: header(headers, 'issn'),
    eissn: header(headers, 'eissn', 'e-issn'),
    publisher: header(headers, 'publisher'),
    category: header(headers, 'category', 'subject area', 'subjectarea', 'field', 'web of science categories'),
    year: header(headers, 'year', 'jcr year'),
    jif: header(headers, 'jif', 'impact factor', '2-year jif', '2022 jif', '2023 jif'),
    fiveYearJif: header(headers, '5-year jif', 'five year jif'),
    jifNoSelf: header(headers, 'jif without self-cites', 'jif without self cites'),
    jci: header(headers, 'jci'),
    quartile: header(headers, 'quartile', 'jif quartile'),
    rank: header(headers, 'rank'),
    totalCites: header(headers, 'total cites'),
    totalArticles: header(headers, 'total articles'),
    citableItems: header(headers, 'citable items'),
    citedHalfLife: header(headers, 'cited half-life', 'cited half life'),
    citingHalfLife: header(headers, 'citing half-life', 'citing half life'),
  };

  if (ix.journalName < 0) {
    throw new Error('CSV is missing a Journal Name / Title column');
  }

  const rows = [];
  for (const line of lines) {
    const v = parseCsvLine(line);
    const journalName = v[ix.journalName];
    if (!journalName) continue;
    const row = {
      journalName,
      abbreviatedJournal: ix.abbreviated >= 0 ? v[ix.abbreviated] || null : null,
      issn: ix.issn >= 0 ? v[ix.issn] || null : null,
      eissn: ix.eissn >= 0 ? v[ix.eissn] || null : null,
      publisher: ix.publisher >= 0 ? v[ix.publisher] || null : null,
      field: ix.category >= 0 ? v[ix.category] || null : null,
      year: ix.year >= 0 ? int(v[ix.year]) ?? defaultYear : defaultYear,
      impactFactor: ix.jif >= 0 ? num(v[ix.jif]) : null,
      fiveYearJif: ix.fiveYearJif >= 0 ? num(v[ix.fiveYearJif]) : null,
      jifWithoutSelfCites: ix.jifNoSelf >= 0 ? num(v[ix.jifNoSelf]) : null,
      jci: ix.jci >= 0 ? num(v[ix.jci]) : null,
      quartile: ix.quartile >= 0 ? v[ix.quartile] || null : null,
      rank: ix.rank >= 0 ? int(v[ix.rank]) : null,
      totalCites: ix.totalCites >= 0 ? int(v[ix.totalCites]) : null,
      totalArticles: ix.totalArticles >= 0 ? int(v[ix.totalArticles]) : null,
      citableItems: ix.citableItems >= 0 ? int(v[ix.citableItems]) : null,
      citedHalfLife: ix.citedHalfLife >= 0 ? num(v[ix.citedHalfLife]) : null,
      citingHalfLife: ix.citingHalfLife >= 0 ? num(v[ix.citingHalfLife]) : null,
    };
    rows.push(row);
  }
  return { rows, hasMetrics: ix.jif >= 0 || ix.rank >= 0, hasCategory: ix.category >= 0 };
}

async function importMetrics(rows) {
  const batchSize = 1000;
  let total = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const res = await fetch(`${baseUrl}/api/journal-impact-factors/import-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData: batch }),
    });
    const j = await res.json();
    total += j.imported || 0;
    console.log(`  batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rows.length / batchSize)}: imported ${j.imported}/${j.total}`);
  }
  console.log(`Imported metrics for ${total} rows`);
}

async function updateCategoriesOnly(rows) {
  // Fetch all journals once and build an ISSN/name lookup so we can PATCH
  // /api/journal-impact-factors/:id/field for the right journal id.
  // GET /api/journal-impact-factors returns { data, total }; entries use
  // `journalId` for the journals table id (the `id` field there is the
  // per-year metric row id and is NOT the right key for the field PATCH).
  const all = await fetch(`${baseUrl}/api/journal-impact-factors?limit=100000`).then(r => r.json());
  const list = Array.isArray(all) ? all : (all.data ?? all.items ?? []);
  const byIssn = new Map();
  const byName = new Map();
  for (const j of list) {
    const jid = j.journalId ?? j.id;
    if (!jid) continue;
    if (j.issn && j.issn !== 'N/A') byIssn.set(j.issn, jid);
    if (j.eissn && j.eissn !== 'N/A') byIssn.set(j.eissn, jid);
    if (j.journalName) byName.set(j.journalName.toLowerCase(), jid);
  }
  console.log(`Indexed ${list.length} existing journals (${byIssn.size} ISSNs, ${byName.size} names)`);

  let matched = 0, missing = 0, failed = 0;
  const unmatchedSamples = [];
  for (const row of rows) {
    if (!row.field) continue;
    const id =
      (row.issn && byIssn.get(row.issn)) ||
      (row.eissn && byIssn.get(row.eissn)) ||
      byName.get(row.journalName.toLowerCase());
    if (!id) {
      missing++;
      if (unmatchedSamples.length < 5) unmatchedSamples.push(row.journalName);
      continue;
    }
    const res = await fetch(`${baseUrl}/api/journal-impact-factors/${id}/field`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: row.field }),
    });
    if (res.ok) matched++;
    else failed++;
  }
  console.log(`Field updates: matched=${matched}, PATCH failures=${failed}, unmatched rows=${missing}`);
  if (unmatchedSamples.length) {
    console.log(`  sample unmatched journals: ${unmatchedSamples.join(' | ')}`);
  }
}

async function main() {
  const abs = path.resolve(file);
  console.log(`Reading ${abs}`);
  const { rows, hasMetrics, hasCategory } = loadCsv(abs);
  console.log(`Parsed ${rows.length} rows (hasMetrics=${hasMetrics}, hasCategory=${hasCategory})`);

  if (hasMetrics) {
    await importMetrics(rows);
  } else if (hasCategory) {
    console.log('CSV has no metrics columns; updating journals.field only');
    await updateCategoriesOnly(rows);
  } else {
    console.error('CSV has neither metric columns nor a Category/Field column — nothing to import.');
    process.exit(2);
  }
}

main().catch((e) => { console.error('Import failed:', e); process.exit(1); });
