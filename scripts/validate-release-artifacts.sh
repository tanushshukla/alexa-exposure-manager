#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH='' cd -- "$SCRIPT_DIR/.." && pwd)

for command in jq npx shellcheck; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Required validation command not found: %s\n' "$command" >&2
    exit 1
  fi
done

jq empty "$REPO_ROOT/hacs.json"

npx --yes prettier@3.6.2 --check \
  "$REPO_ROOT/.github/dependabot.yml" \
  "$REPO_ROOT/.github/workflows/frontend.yml" \
  "$REPO_ROOT/.github/workflows/python.yml" \
  "$REPO_ROOT/.github/workflows/security.yml" \
  "$REPO_ROOT/.github/workflows/validate.yml" \
  "$REPO_ROOT/docs/acceptance/compose.yaml"

shellcheck \
  "$REPO_ROOT/scripts/acceptance-ha.sh" \
  "$REPO_ROOT/scripts/audit-python-requirements.sh" \
  "$REPO_ROOT/scripts/validate-release-artifacts.sh"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  HA_CONFIG_DIR=/tmp/alexa-exposure-manager-acceptance \
    HA_VERSION=2026.8.1 \
    HA_PORT=8123 \
    docker compose \
      --file "$REPO_ROOT/docs/acceptance/compose.yaml" \
      config --quiet
fi

printf 'Release artifact syntax validation passed.\n'
