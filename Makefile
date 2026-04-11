MAKEFLAGS += --no-print-directory

.DEFAULT_GOAL := help

.PHONY: build clean help quality run test

help: ## Show available targets
	@echo "molecules - Available targets"
	@echo ""
	@grep -hE '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*## "} {printf "  %-15s %s\n", $$1, $$2}'

build: ## Copy src/ into docs/ for GitHub Pages
	@./.make/build.sh

test: ## Check the catalog and required site files
	@./.make/test.sh

quality: test ## Run all quality checks

clean: ## Remove generated files in docs/, keeping .gitkeep
	@./.make/clean.sh

run: ## Serve src/ at http://localhost:8000
	@python3 -m http.server -d src 8000
