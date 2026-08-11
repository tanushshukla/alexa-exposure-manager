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

# manifest.json is the release source of truth; every other version-bearing
# artifact must agree with it or a release ships mismatched metadata.
expected_version=$(jq -er '.version' "$REPO_ROOT/custom_components/alexa_exposure_manager/manifest.json")

version_mismatch=0

check_version() {
  artifact=$1
  actual=$2

  if [ "$actual" != "$expected_version" ]; then
    printf 'Version mismatch: %s declares "%s", expected "%s" from manifest.json\n' \
      "$artifact" "$actual" "$expected_version" >&2
    version_mismatch=1
  fi
}

check_version 'custom_components/alexa_exposure_manager/const.py' \
  "$(sed -n 's/^VERSION: Final = "\(.*\)"$/\1/p' \
    "$REPO_ROOT/custom_components/alexa_exposure_manager/const.py")"
check_version 'package.json' "$(jq -er '.version' "$REPO_ROOT/package.json")"
check_version 'package-lock.json' "$(jq -er '.version' "$REPO_ROOT/package-lock.json")"
check_version 'package-lock.json (root package)' \
  "$(jq -er '.packages."".version' "$REPO_ROOT/package-lock.json")"
check_version 'pyproject.toml' \
  "$(sed -n 's/^version = "\(.*\)"$/\1/p' "$REPO_ROOT/pyproject.toml")"

if [ "$version_mismatch" -ne 0 ]; then
  printf 'Update every version-bearing artifact before tagging a release.\n' >&2
  exit 1
fi

printf 'Version %s is consistent across release artifacts.\n' "$expected_version"

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
