#!/bin/sh
# ResearchVault — first-time setup script
# Run as a user with Docker and sudo privileges.
set -e

BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

info()    { printf "${GREEN}[INFO]${RESET}  %s\n" "$*"; }
warn()    { printf "${YELLOW}[WARN]${RESET}  %s\n" "$*"; }
error()   { printf "${RED}[ERROR]${RESET} %s\n" "$*"; exit 1; }
section() { printf "\n${BOLD}==> %s${RESET}\n" "$*"; }

# ── 1. Prerequisites ──────────────────────────────────────────────────────────
section "Checking prerequisites"

command -v docker  >/dev/null 2>&1 || error "Docker is not installed. Install it from https://docs.docker.com/get-docker/"
docker compose version >/dev/null 2>&1 || error "Docker Compose v2 is required. Update Docker Desktop or install the plugin."

info "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
info "Docker Compose $(docker compose version --short)"

# ── 2. Environment file ───────────────────────────────────────────────────────
section "Environment configuration"

if [ ! -f .env ]; then
  cp .env.example .env
  warn ".env created from .env.example — please review and set secure values before continuing."
  warn "  Edit .env now, then re-run this script."
  exit 0
fi

info ".env found."

# Load env vars for directory creation (handles values with spaces)
while IFS= read -r line || [ -n "$line" ]; do
  # Strip inline comments and skip blank lines / comment lines
  line="${line%%#*}"
  case "$line" in
    *=*) ;;
    *) continue ;;
  esac
  key="${line%%=*}"
  value="${line#*=}"
  # Strip surrounding quotes (single or double)
  case "$value" in
    \"*\") value="${value#\"}"; value="${value%\"}" ;;
    \'*\') value="${value#\'}"; value="${value%\'}" ;;
  esac
  export "$key=$value"
done < .env

# ── 3. Data directories ───────────────────────────────────────────────────────
section "Creating data directories"

POSTGRES_DATA_DIR="${POSTGRES_DATA_DIR:-./data/postgres}"
UPLOADS_DATA_DIR="${UPLOADS_DATA_DIR:-./data/uploads}"

mkdir -p "$POSTGRES_DATA_DIR" "$UPLOADS_DATA_DIR"
info "PostgreSQL data → $POSTGRES_DATA_DIR"
info "Uploads data    → $UPLOADS_DATA_DIR"

# Fix permissions so the postgres container (uid 999) can write
if command -v chown >/dev/null 2>&1; then
  chown -R "$(id -u):$(id -g)" "$POSTGRES_DATA_DIR" "$UPLOADS_DATA_DIR" 2>/dev/null || true
fi

# ── 4. Build & start ──────────────────────────────────────────────────────────
section "Building and starting ResearchVault"

docker compose pull postgres
docker compose build app
docker compose up -d

# ── 5. Health check ───────────────────────────────────────────────────────────
section "Waiting for the app to be ready"

APP_PORT="${APP_PORT:-5000}"
RETRIES=30
i=0
until curl -sf "http://localhost:${APP_PORT}/api/health/database" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge "$RETRIES" ]; then
    error "App did not become healthy after ${RETRIES} attempts. Run 'docker compose logs app' to investigate."
  fi
  printf "."
  sleep 3
done
printf "\n"

info "ResearchVault is running at ${APP_URL:-http://localhost:${APP_PORT}}"
info "To view logs:    docker compose logs -f"
info "To stop:         docker compose down"
info "To update later: git pull && docker compose build app && docker compose up -d"
