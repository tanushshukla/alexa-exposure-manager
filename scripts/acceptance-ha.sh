#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH='' cd -- "$SCRIPT_DIR/.." && pwd)
COMPOSE_FILE="$REPO_ROOT/docs/acceptance/compose.yaml"
HA_VERSION=${HA_VERSION:-2026.8.1}
HA_PORT=${HA_PORT:-8123}
WORK_DIR=${AEM_ACCEPTANCE_DIR:-$REPO_ROOT/.acceptance/$HA_VERSION}
INTEGRATION_DIR="$REPO_ROOT/custom_components/alexa_exposure_manager"

case "$WORK_DIR" in
  /*) ;;
  *) WORK_DIR="$REPO_ROOT/$WORK_DIR" ;;
esac

CONFIG_DIR="$WORK_DIR/config"
PROJECT_VERSION=$(printf '%s' "$HA_VERSION" | tr '.' '-')
PROJECT_NAME="aem-acceptance-$PROJECT_VERSION-$HA_PORT"

usage() {
  cat <<'EOF'
Usage: scripts/acceptance-ha.sh COMMAND

Commands:
  prepare       Create a disposable, inactive Home Assistant configuration.
  up            Prepare and start Home Assistant in Docker.
  status        Show the acceptance container status.
  logs          Follow Home Assistant logs.
  activate      Add managed includes and run Home Assistant config validation.
  check         Run Home Assistant's full configuration checker.
  restart       Restart Home Assistant after a confirmed valid save/activation.
  down          Stop and remove the container, preserving acceptance data.

Environment:
  HA_VERSION           Home Assistant image tag, default 2026.8.1.
  HA_PORT              Host HTTP port, default 8123.
  AEM_ACCEPTANCE_DIR   Disposable state directory.
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  fi
}

require_docker() {
  require_command docker
  if ! docker compose version >/dev/null 2>&1; then
    printf 'Docker Compose v2 is required (docker compose).\n' >&2
    exit 1
  fi
}

run_compose() {
  HA_CONFIG_DIR="$CONFIG_DIR" \
    HA_VERSION="$HA_VERSION" \
    HA_PORT="$HA_PORT" \
    docker compose \
      --project-name "$PROJECT_NAME" \
      --file "$COMPOSE_FILE" \
      "$@"
}

prepare_config() {
  mkdir -p "$CONFIG_DIR"
  CONFIG_DIR=$(CDPATH='' cd -- "$CONFIG_DIR" && pwd)

  if [[ ! -f "$CONFIG_DIR/configuration.yaml" ]]; then
    cat >"$CONFIG_DIR/configuration.yaml" <<'EOF'
homeassistant:
  name: Alexa Exposure Acceptance
  latitude: 0
  longitude: 0
  elevation: 0
  unit_system: metric
  currency: USD
  country: US
  time_zone: UTC

default_config:

alexa: !include alexa.yaml

logger:
  default: warning
  logs:
    custom_components.alexa_exposure_manager: debug

input_boolean:
  acceptance_lamp:
    name: Acceptance Lamp
    icon: mdi:lamp
  acceptance_motion_source:
    name: Acceptance Motion Source

input_number:
  acceptance_dimmer:
    name: Acceptance Dimmer
    min: 0
    max: 100
    step: 1
    unit_of_measurement: "%"

input_button:
  acceptance_doorbell:
    name: Acceptance Doorbell

template:
  - binary_sensor:
      - name: Acceptance Motion
        unique_id: alexa_exposure_acceptance_motion
        state: "{{ is_state('input_boolean.acceptance_motion_source', 'on') }}"
        device_class: motion
  - sensor:
      - name: Acceptance Temperature
        unique_id: alexa_exposure_acceptance_temperature
        state: "21.5"
        device_class: temperature
        unit_of_measurement: "\u00b0C"
      - name: Acceptance Unsupported Text
        unique_id: alexa_exposure_acceptance_unsupported_text
        state: ready
EOF
  fi

  if [[ ! -f "$CONFIG_DIR/alexa.yaml" ]]; then
    cat >"$CONFIG_DIR/alexa.yaml" <<'EOF'
# User-owned Alexa configuration. The acceptance run starts inactive so the
# config flow can create the two managed files before nested includes are added.
smart_home:
  locale: en-US
EOF
  fi

  if [[ ! -f "$CONFIG_DIR/secrets.yaml" ]]; then
    printf '{}\n' >"$CONFIG_DIR/secrets.yaml"
    chmod 600 "$CONFIG_DIR/secrets.yaml"
  fi

  cat >"$WORK_DIR/acceptance.env" <<EOF
HA_VERSION=$HA_VERSION
HA_PORT=$HA_PORT
HA_CONFIG_DIR=$CONFIG_DIR
COMPOSE_PROJECT_NAME=$PROJECT_NAME
EOF

  printf 'Acceptance configuration: %s\n' "$CONFIG_DIR"
  printf 'Home Assistant version: %s\n' "$HA_VERSION"
  printf 'No credentials are generated or stored by this harness.\n'
}

require_running() {
  if ! run_compose ps --status running --services | tr -d '\r' | grep -qx homeassistant; then
    printf 'The acceptance Home Assistant container is not running.\n' >&2
    exit 1
  fi
}

config_check() {
  require_running
  run_compose exec -T homeassistant \
    python -m homeassistant --script check_config --config /config
}

activate_managed_includes() {
  require_running

  if [[ ! -f "$CONFIG_DIR/alexa_exposure_filter.yaml" ]] ||
    [[ ! -f "$CONFIG_DIR/alexa_entity_config.yaml" ]]; then
    printf '%s\n' \
      'Managed files are missing. Complete the Alexa Exposure Manager config flow first.' >&2
    exit 1
  fi

  timestamp=$(date -u +%Y%m%dT%H%M%SZ)
  backup="$CONFIG_DIR/alexa.yaml.before-managed-includes.$timestamp"
  cp "$CONFIG_DIR/alexa.yaml" "$backup"

  cat >"$CONFIG_DIR/alexa.yaml" <<'EOF'
# User-owned Alexa configuration for acceptance. Real credentials, if needed,
# remain outside the manager-owned files and should use !secret references.
smart_home:
  locale: en-US
  filter: !include alexa_exposure_filter.yaml
  entity_config: !include alexa_entity_config.yaml
EOF

  if ! config_check; then
    cp "$backup" "$CONFIG_DIR/alexa.yaml"
    printf 'Activation config check failed; restored %s.\n' "$backup" >&2
    exit 1
  fi

  printf 'Managed includes validate. Restart only when ready to test activation.\n'
  printf 'Backup of the previous user-owned Alexa file: %s\n' "$backup"
}

command=${1:-}

case "$command" in
  prepare)
    prepare_config
    ;;
  up)
    require_docker
    if [[ ! -f "$INTEGRATION_DIR/manifest.json" ]] ||
      [[ ! -f "$INTEGRATION_DIR/__init__.py" ]]; then
      printf 'Production integration is missing from %s.\n' "$INTEGRATION_DIR" >&2
      exit 1
    fi
    prepare_config
    run_compose config --quiet
    run_compose up --detach
    printf 'Open http://127.0.0.1:%s and complete Home Assistant onboarding.\n' "$HA_PORT"
    ;;
  status)
    require_docker
    prepare_config
    run_compose ps
    ;;
  logs)
    require_docker
    prepare_config
    run_compose logs --follow homeassistant
    ;;
  activate)
    require_docker
    prepare_config
    activate_managed_includes
    ;;
  check)
    require_docker
    prepare_config
    config_check
    ;;
  restart)
    require_docker
    prepare_config
    require_running
    run_compose restart homeassistant
    ;;
  down)
    require_docker
    prepare_config
    run_compose down
    ;;
  *)
    usage
    [[ -n "$command" ]] && exit 1
    ;;
esac
