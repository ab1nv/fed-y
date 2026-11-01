# FedY — Makefile
# All persistent data lives in Turso. No local database, no Docker.

SHELL := /bin/bash
PNPM  ?= pnpm

.PHONY: help setup install db-push db-seed dev build lint typecheck test check clean

help: ## Show available targets
	@grep -E '^[a-zA-Z:]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install JS dependencies (runs prisma generate via postinstall)
	$(PNPM) install

setup: install ## First run: install, create schema in Turso, seed demo data
	@test -f .env || { echo "Create .env from .env.example with your Turso credentials"; exit 1; }
	$(PNPM) run db:push
	$(PNPM) run db:seed
	@echo "Done. Run 'make dev'."

db-push: ## Create the schema in an empty Turso database
	$(PNPM) run db:push

db-seed: ## Repopulate the demo dataset (deterministic, idempotent)
	$(PNPM) run db:seed

dev: ## Start the dev server on http://localhost:3000
	@test -f .env || { echo "Missing .env — copy .env.example and add Turso credentials"; exit 1; }
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
