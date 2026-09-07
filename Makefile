# FedY — Makefile
# Linux: Postgres runs in Docker (pnpm db:up under the hood).
# macOS: Postgres runs as a Homebrew service (no Docker). See scripts/setup-macos.sh.

SHELL := /bin/bash
UNAME := $(shell uname -s)
PNPM  ?= pnpm

ifeq ($(UNAME),Darwin)
PG_SERVICE := $(shell brew services list 2>/dev/null | awk '/^postgresql/{print $$1; exit}')
endif

.PHONY: help setup install db-up db-down db-migrate db-seed db-reset dev build lint typecheck test check clean

help: ## Show available targets
	@grep -E '^[a-zA-Z:]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: ## One-time unattended setup (installs toolchain, deps, db, .env)
ifeq ($(UNAME),Darwin)
	bash scripts/setup-macos.sh
else
	docker compose up -d
	$(PNPM) install
	@test -f .env || cp .env.example .env
	$(PNPM) exec prisma migrate dev --name init >/dev/null || true
	$(PNPM) run db:seed
	@echo "Done. Run 'make dev'."
endif

install: ## Install JS dependencies (runs prisma generate via postinstall)
	$(PNPM) install

db-up: ## Start Postgres
ifeq ($(UNAME),Darwin)
	@test -n "$(PG_SERVICE)" || { echo "No brew postgresql@ service — run scripts/setup-macos.sh first"; exit 1; }
	brew services start $(PG_SERVICE) 2>/dev/null || brew services restart $(PG_SERVICE)
else
	docker compose up -d
endif

db-down: ## Stop Postgres
ifeq ($(UNAME),Darwin)
	@test -n "$(PG_SERVICE)" || exit 0; brew services stop $(PG_SERVICE)
else
	docker compose down
endif

db-migrate: ## Apply/create migrations against the configured DATABASE_URL
	$(PNPM) exec prisma migrate dev

db-seed: ## Repopulate the demo dataset (deterministic, idempotent)
	$(PNPM) run db:seed

db-reset: ## Drop schema, re-migrate, re-seed
	$(PNPM) exec prisma migrate reset --force

dev: ## Start the dev server on http://localhost:3000
	@test -f .env || { echo "Missing .env — run 'make setup' or copy .env.example"; exit 1; }
	$(PNPM) run dev

build: ## Production build
	$(PNPM) run build

lint: ## ESLint (Next 16 / React Compiler rules)
	$(PNPM) run lint

typecheck: ## tsc --noEmit
	$(PNPM) run typecheck

test: ## Vitest domain tests
	$(PNPM) run test

check: lint typecheck test build ## All quality gates

clean: ## Remove build artefacts
	rm -rf .next out src/generated
