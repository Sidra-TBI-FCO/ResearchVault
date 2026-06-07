import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Starting journals refactor migration...");

  const oldExists = await db.execute(sql`
    SELECT to_regclass('public.journal_impact_factors') AS reg
  `);
  const hasOld = (oldExists.rows[0] as any).reg === "journal_impact_factors";

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS journals (
      id SERIAL PRIMARY KEY,
      journal_name TEXT NOT NULL,
      abbreviated_journal TEXT,
      publisher TEXT,
      issn TEXT,
      eissn TEXT,
      field TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS journals_name_lower_idx
    ON journals (lower(journal_name))
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS journal_impact_factor_metrics (
      id SERIAL PRIMARY KEY,
      journal_id INTEGER NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      total_cites INTEGER,
      total_articles INTEGER,
      citable_items INTEGER,
      cited_half_life NUMERIC(10,3),
      citing_half_life NUMERIC(10,3),
      impact_factor NUMERIC(10,3),
      five_year_jif NUMERIC(10,3),
      jif_without_self_cites NUMERIC(10,3),
      jci NUMERIC(10,3),
      quartile TEXT,
      rank INTEGER,
      total_citations INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS journal_metrics_journal_year_idx
    ON journal_impact_factor_metrics (journal_id, year)
  `);

  if (!hasOld) {
    console.log("No legacy journal_impact_factors table found - nothing to migrate.");
    return;
  }

  console.log("Deduplicating journals from legacy table...");
  await db.execute(sql`
    INSERT INTO journals (journal_name, abbreviated_journal, publisher, issn, eissn)
    SELECT
      MAX(journal_name) AS journal_name,
      (ARRAY_REMOVE(ARRAY_AGG(abbreviated_journal ORDER BY year DESC NULLS LAST, id DESC), NULL))[1] AS abbreviated_journal,
      (ARRAY_REMOVE(ARRAY_AGG(publisher           ORDER BY year DESC NULLS LAST, id DESC), NULL))[1] AS publisher,
      (ARRAY_REMOVE(ARRAY_AGG(issn                ORDER BY year DESC NULLS LAST, id DESC), NULL))[1] AS issn,
      (ARRAY_REMOVE(ARRAY_AGG(eissn               ORDER BY year DESC NULLS LAST, id DESC), NULL))[1] AS eissn
    FROM journal_impact_factors
    WHERE journal_name IS NOT NULL AND trim(journal_name) <> ''
    GROUP BY lower(trim(journal_name))
    ON CONFLICT DO NOTHING
  `);

  console.log("Copying per-year metrics...");
  await db.execute(sql`
    INSERT INTO journal_impact_factor_metrics (
      journal_id, year, total_cites, total_articles, citable_items,
      cited_half_life, citing_half_life, impact_factor, five_year_jif,
      jif_without_self_cites, jci, quartile, rank, total_citations,
      created_at, updated_at
    )
    SELECT DISTINCT ON (j.id, jif.year)
      j.id, jif.year, jif.total_cites, jif.total_articles, jif.citable_items,
      jif.cited_half_life, jif.citing_half_life, jif.impact_factor, jif.five_year_jif,
      jif.jif_without_self_cites, jif.jci, jif.quartile, jif.rank, jif.total_citations,
      jif.created_at, jif.updated_at
    FROM journal_impact_factors jif
    JOIN journals j ON lower(trim(j.journal_name)) = lower(trim(jif.journal_name))
    WHERE jif.journal_name IS NOT NULL AND trim(jif.journal_name) <> ''
    ORDER BY j.id, jif.year, jif.id DESC
    ON CONFLICT (journal_id, year) DO NOTHING
  `);

  const counts = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM journals) AS journals,
      (SELECT COUNT(*) FROM journal_impact_factor_metrics) AS metrics,
      (SELECT COUNT(*) FROM journal_impact_factors) AS legacy
  `);
  console.log("Counts:", counts.rows[0]);

  console.log("Dropping legacy journal_impact_factors table...");
  await db.execute(sql`DROP TABLE journal_impact_factors`);

  console.log("Migration complete.");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
