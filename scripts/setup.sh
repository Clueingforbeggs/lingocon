#!/usr/bin/env bash
#
# One-command local setup for LingoCon.
# Usage: ./scripts/setup.sh [options]
#
# Options:
#   --docker          Start PostgreSQL via docker compose (default if Docker is available)
#   --no-docker       Do not start Docker; use DATABASE_URL from .env as-is
#   --seed            Run npm run db:seed (sample language + user)
#   --seed-modules    Run npm run db:seed-modules (official marketplace modules)
#   --full            Shorthand for --seed --seed-modules
#   --skip-install    Skip npm install (re-run migrations/seeds only)
#   -h, --help        Show help
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}→${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}!${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

USE_DOCKER=""
SKIP_INSTALL=false
RUN_SEED=false
RUN_SEED_MODULES=false

for arg in "$@"; do
  case "$arg" in
    --docker) USE_DOCKER=true ;;
    --no-docker) USE_DOCKER=false ;;
    --seed) RUN_SEED=true ;;
    --seed-modules) RUN_SEED_MODULES=true ;;
    --full) RUN_SEED=true; RUN_SEED_MODULES=true ;;
    --skip-install) SKIP_INSTALL=true ;;
    -h|--help)
      sed -n '2,14p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      fail "Unknown option: $arg (try --help)"
      ;;
  esac
done

echo ""
echo "LingoCon — local setup"
echo "======================"
echo ""

# ── Prerequisites ─────────────────────────────────────────────────────────────

if ! command -v node >/dev/null 2>&1; then
  fail "Node.js is not installed. Install Node 18+ from https://nodejs.org"
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node.js 18+ required (found $(node -v))"
fi
ok "Node $(node -v)"

if ! command -v npm >/dev/null 2>&1; then
  fail "npm is not installed"
fi
ok "npm $(npm -v)"

# ── Environment file ──────────────────────────────────────────────────────────

if [ ! -f .env ]; then
  info "Creating .env from .env.example"
  cp .env.example .env

  # Prefer docker-compose credentials when we will start Postgres in Docker.
  if [ -f docker-compose.yml ]; then
    if grep -q 'postgresql://user:password@localhost:5432/langua' .env 2>/dev/null; then
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's|postgresql://user:password@localhost:5432/langua|postgresql://langua:langua@localhost:5432/langua|' .env
      else
        sed -i 's|postgresql://user:password@localhost:5432/langua|postgresql://langua:langua@localhost:5432/langua|' .env
      fi
      ok "Set DATABASE_URL to docker-compose defaults (langua/langua@localhost:5432/langua)"
    fi
  fi
else
  ok ".env already exists (unchanged)"
fi

# Load DATABASE_URL for connectivity checks
set -a
# shellcheck disable=SC1091
source .env 2>/dev/null || true
set +a

# ── Docker PostgreSQL ─────────────────────────────────────────────────────────

has_docker() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

if [ "$USE_DOCKER" != "false" ]; then
  if has_docker; then
    USE_DOCKER=true
  elif [ "$USE_DOCKER" = "true" ]; then
    fail "Docker was requested (--docker) but is not available or not running"
  else
    USE_DOCKER=false
    warn "Docker not available — assuming PostgreSQL is already running at DATABASE_URL"
  fi
fi

if [ "$USE_DOCKER" = "true" ]; then
  info "Starting PostgreSQL (docker compose up -d db)"
  docker compose up -d db

  info "Waiting for database to accept connections…"
  for i in $(seq 1 30); do
    if docker compose exec -T db pg_isready -U langua -d langua >/dev/null 2>&1; then
      ok "PostgreSQL is ready"
      break
    fi
    if [ "$i" -eq 30 ]; then
      fail "PostgreSQL did not become ready in time. Check: docker compose logs db"
    fi
    sleep 1
  done
fi

# ── Dependencies ──────────────────────────────────────────────────────────────

if [ "$SKIP_INSTALL" = false ]; then
  info "Installing npm dependencies (this may take a minute)"
  npm install
  ok "Dependencies installed"
else
  warn "Skipping npm install (--skip-install)"
fi

# ── Prisma ────────────────────────────────────────────────────────────────────

info "Generating Prisma client"
npm run db:generate
ok "Prisma client generated"

info "Applying database migrations"
npx prisma migrate deploy
ok "Migrations applied"

# ── Optional seeds ────────────────────────────────────────────────────────────

if [ "$RUN_SEED" = true ]; then
  info "Seeding sample user and test language (npm run db:seed)"
  npm run db:seed
  ok "Base seed complete"
fi

if [ "$RUN_SEED_MODULES" = true ]; then
  info "Seeding official modules marketplace (npm run db:seed-modules)"
  npm run db:seed-modules
  ok "Modules seed complete"
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
ok "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. npm run dev"
echo "  2. Open http://localhost:3000"
echo ""
echo "DEV_MODE is enabled in .env — no OAuth setup required."
echo "You are signed in as dev@localhost automatically."
echo ""
if [ "$RUN_SEED" = false ]; then
  echo "Optional — load demo content:"
  echo "  npm run db:seed              # sample language at /lang/test-language"
  echo "  npm run db:seed-modules      # official /modules catalog entries"
  echo "  ./scripts/setup.sh --full    # re-run setup with both seeds"
  echo ""
fi
echo "Full guide: SETUP.md"
echo ""
