"""Constants for Alexa Exposure Manager."""

from typing import Final

DOMAIN: Final = "alexa_exposure_manager"
NAME: Final = "Alexa Exposure Manager"
VERSION: Final = "0.1.0"

FILTER_FILENAME: Final = "alexa_exposure_filter.yaml"
ENTITY_CONFIG_FILENAME: Final = "alexa_entity_config.yaml"
BACKUP_DIRECTORY: Final = ".alexa_exposure_manager_backups"
BACKUP_RETENTION: Final = 5

PANEL_URL: Final = "alexa-exposure-manager"
PANEL_COMPONENT: Final = "alexa-exposure-manager-panel"
STATIC_URL: Final = "/alexa_exposure_manager/entrypoint.js"

DATA_RUNTIME: Final = "runtime"
DATA_STARTUP_ALEXA: Final = "startup_alexa"
DATA_PANEL_REGISTERED: Final = "panel_registered"
DATA_STATIC_REGISTERED: Final = "static_registered"
DATA_WEBSOCKET_REGISTERED: Final = "websocket_registered"

CONFIGURATION_INCLUDE = "alexa: !include alexa.yaml"
ALEXA_INCLUDE = (
    "smart_home:\n"
    "  filter: !include alexa_exposure_filter.yaml\n"
    "  entity_config: !include alexa_entity_config.yaml"
)
