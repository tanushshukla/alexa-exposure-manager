#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH='' cd -- "$SCRIPT_DIR/.." && pwd)
MANIFEST="$REPO_ROOT/custom_components/alexa_exposure_manager/manifest.json"

if [[ ! -f "$MANIFEST" ]]; then
  printf 'Production integration manifest is missing: %s\n' "$MANIFEST" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  printf 'jq is required.\n' >&2
  exit 1
fi

requirements_file=$(mktemp)
trap 'rm -f "$requirements_file"' EXIT

jq -r '.requirements[]?' "$MANIFEST" >"$requirements_file"

if [[ ! -s "$requirements_file" ]]; then
  printf 'No third-party Python runtime requirements declared in manifest.json.\n'
  exit 0
fi

if ! command -v pip-audit >/dev/null 2>&1; then
  printf 'pip-audit is required when manifest requirements are present.\n' >&2
  exit 1
fi

pip-audit --requirement "$requirements_file"
