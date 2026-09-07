#!/usr/bin/env bash
# FedY — unattended macOS setup. No Docker: installs Homebrew (if missing),
# Node, pnpm, PostgreSQL as a brew service, bootstraps the fedy role/db,
# writes .env, installs JS deps, applies migrations and seeds demo data.
#
# Idempotent — safe to re-run. Only interactive moment: Homebrew's own sudo
# password prompt (unavoidable for /opt/homebrew creation).
set -euo pipefail

cd "$(dirname "$0")/.."
say() { printf '\033[36m▸ %s\033[0m\n' "$*"; }

[ "$(uname -s)" = "Darwin" ] || {
	echo "This script is for macOS. On Linux use docker compose (make setup)."
	exit 1
}

# ---------------------------------------------------------------- homebrew
if ! command -v brew >/dev/null 2>&1; then
	say "Installing Homebrew (you may be asked for your sudo password once)"
	NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
[ -x /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"
[ -x /usr/local/bin/brew ] && eval "$(/usr/local/bin/brew shellenv)"
if ! grep -qs "brew shellenv" "$HOME/.zprofile" 2>/dev/null; then
	echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >>"$HOME/.zprofile"
fi
say "brew: $(brew --version | head -1)"

# ---------------------------------------------------------------- toolchain
brew install -q git
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
	say "Installing Node.js"
	brew install -q node
fi
if ! command -v pnpm >/dev/null 2>&1; then
	say "Installing pnpm (it self-aligns to the repo-pinned version)"
	brew install -q pnpm
fi
say "node $(node -v) · pnpm $(pnpm -v)"

# ---------------------------------------------------------------- postgres (service, not docker)
PG=""
for v in 18 17 16; do
	if brew list "postgresql@$v" >/dev/null 2>&1 || brew info --json=v1 "postgresql@$v" >/dev/null 2>&1; then
		PG="postgresql@$v"
		break
	fi
done
[ -n "$PG" ] || {
	echo "No postgresql@ formula found"
	exit 1
}

if ! brew list "$PG" >/dev/null 2>&1; then
	say "Installing $PG"
	brew install -q "$PG"
fi
brew services start "$PG" >/dev/null 2>&1 || brew services restart "$PG" >/dev/null
PGBIN="$(brew --prefix)/opt/$PG/bin"
say "Waiting for $PG…"
for _ in $(seq 1 30); do
	"$PGBIN/pg_isready" -h localhost -q && break
	sleep 1
done

# role + database (idempotent)
if ! "$PGBIN/psql" -h localhost -tAc "SELECT 1 FROM pg_roles WHERE rolname='fedy'" | grep -q 1; then
	say "Creating role fedy"
	"$PGBIN/psql" -h localhost -qc "CREATE ROLE fedy LOGIN PASSWORD 'fedy'"
fi
if ! "$PGBIN/psql" -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='fedy'" | grep -q 1; then
	say "Creating database fedy"
	"$PGBIN/createdb" -h localhost -O fedy fedy
fi

# ---------------------------------------------------------------- project env + deps
if [ ! -f .env ]; then
	say "Writing .env (brew postgres is on 5432; fresh random SESSION_SECRET)"
	cat >.env <<EOF
DATABASE_URL="postgresql://fedy:fedy@localhost:5432/fedy?schema=public"
SESSION_SECRET="$(openssl rand -hex 32)"
EOF
fi

say "Installing JS dependencies (+ prisma generate)"
pnpm install

say "Applying migrations + seeding demo dataset"
pnpm exec prisma migrate deploy
pnpm run db:seed

say "Done."
cat <<EOF

  Start the app:      make dev        →  http://localhost:3000
  Logins:             admin / priya / ravi   password: password123
  Postgres service:   brew services list | grep postgres   (it survives reboots)
EOF
