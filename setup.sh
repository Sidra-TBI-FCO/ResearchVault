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

# Load env vars for directory creation (handles spaces, quotes, CRLF)
while IFS= read -r line || [ -n "$line" ]; do
  # Strip carriage returns (Windows CRLF line endings)
  line="${line%$'\r'}"
  # Strip inline comments
  line="${line%%#*}"
  # Skip lines without =
  case "$line" in *=*) ;; *) continue ;; esac
  # Extract key and strip all whitespace from it
  key=$(printf '%s' "${line%%=*}" | tr -d ' \t\r')
  value="${line#*=}"
  # Skip empty or syntactically invalid keys
  case "$key" in
    ''|*[!A-Za-z0-9_]*) continue ;;
  esac
  # Strip surrounding quotes from value
  case "$value" in
    '"'*'"') value="${value#\"}"; value="${value%\"}" ;;
    "'"*"'") value="${value#\'}"; value="${value%\'}" ;;
  esac
  eval "$key=\$value" && export "$key"
done < .env

# ── 3. Data directories ───────────────────────────────────────────────────────
section "Creating data directories"

# PostgreSQL data is stored in a Docker named volume (pg-data) — managed by
# Docker, not the host filesystem. Use `docker compose down -v` to wipe it.
UPLOADS_DATA_DIR="${UPLOADS_DATA_DIR:-./data/uploads}"
mkdir -p "$UPLOADS_DATA_DIR"
info "Uploads data    → $UPLOADS_DATA_DIR"
info "PostgreSQL data → Docker named volume (pg-data)"

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
