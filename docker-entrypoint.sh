#!/bin/sh
set -e

DB_HOST="${DB_HOST:-postgres}"
DB_USER="${DB_USER:-postgres}"

echo "==> Waiting for PostgreSQL at ${DB_HOST}..."
until pg_isready -h "${DB_HOST}" -U "${DB_USER}" > /dev/null 2>&1; do
  sleep 2
done
echo "==> PostgreSQL is ready."

echo "==> Running database migrations..."
npx drizzle-kit push --config=drizzle.config.ts
echo "==> Migrations complete."

echo "==> Starting ResearchVault..."
exec node dist/index.js
