"""Administrator-only WebSocket API for Alexa Exposure Manager."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api

from .const import DATA_RUNTIME, DOMAIN
from .managed_files import (
    BackupNotFoundError,
    InvalidManagedConfigurationError,
    ManagedFilesError,
    ManagedYamlReadOnlyError,
    RevisionConflictError,
    ValidationFailedError,
)

ENTITY_UPDATE_SCHEMA = {
    vol.Required("entity_id"): str,
    vol.Optional("exposed"): bool,
    vol.Optional("remove"): bool,
    vol.Optional("name"): vol.Any(str, None),
    vol.Optional("description"): vol.Any(str, None),
    # Home Assistant validates alexa.smart_home entity_config display_categories
    # as a single scalar, so the API refuses lists it would have to truncate.
    vol.Optional("display_categories"): vol.Any(
        vol.All([str], vol.Length(max=1)), None
    ),
}


def _runtime(hass):
    domain_data = hass.data.get(DOMAIN) or {}
    runtimes = domain_data.get(DATA_RUNTIME) or {}
    if not runtimes:
        raise InvalidManagedConfigurationError("Alexa Exposure Manager is not set up")
    return next(iter(runtimes.values()))


async def _respond(hass, connection, msg, operation) -> None:
    try:
        result = await operation(_runtime(hass))
    except RevisionConflictError as error:
        connection.send_error(msg["id"], "revision_conflict", str(error))
    except ManagedYamlReadOnlyError as error:
        connection.send_error(msg["id"], "managed_yaml_read_only", str(error))
    except ValidationFailedError as error:
        connection.send_error(msg["id"], "validation_failed", str(error))
    except BackupNotFoundError as error:
        connection.send_error(msg["id"], "backup_not_found", str(error))
    except InvalidManagedConfigurationError as error:
        connection.send_error(msg["id"], "invalid_configuration", str(error))
    except ManagedFilesError as error:
        connection.send_error(msg["id"], "managed_files_error", str(error))
    else:
        connection.send_result(msg["id"], result)


@websocket_api.websocket_command({"type": f"{DOMAIN}/status"})
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_status(hass, connection, msg) -> None:
    """Return setup and operational status."""
    await _respond(hass, connection, msg, lambda runtime: runtime.async_status())


@websocket_api.websocket_command(
    {"type": f"{DOMAIN}/entities", vol.Optional("query"): str}
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_entities(hass, connection, msg) -> None:
    """Return the real enriched entity catalog."""
    await _respond(
        hass,
        connection,
        msg,
        lambda runtime: runtime.async_entities(msg.get("query")),
    )


@websocket_api.websocket_command(
    {
        "type": f"{DOMAIN}/preview",
        vol.Required("expose_new_entities"): bool,
        vol.Optional("entities", default=[]): [ENTITY_UPDATE_SCHEMA],
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_preview(hass, connection, msg) -> None:
    """Preview deterministic managed YAML."""
    await _respond(hass, connection, msg, lambda runtime: runtime.async_preview(msg))


@websocket_api.websocket_command(
    {
        "type": f"{DOMAIN}/save",
        vol.Required("expected_revision"): str,
        vol.Required("expected_entities_revision"): str,
        vol.Required("expose_new_entities"): bool,
        vol.Optional("entities", default=[]): [ENTITY_UPDATE_SCHEMA],
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_save(hass, connection, msg) -> None:
    """Save staged exposure and metadata changes."""
    await _respond(hass, connection, msg, lambda runtime: runtime.async_save(msg))


@websocket_api.websocket_command({"type": f"{DOMAIN}/migration/preview"})
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_migration_preview(hass, connection, msg) -> None:
    """Preview flattening of the active legacy Alexa filter."""
    await _respond(
        hass, connection, msg, lambda runtime: runtime.async_migration_preview()
    )


@websocket_api.websocket_command(
    {
        "type": f"{DOMAIN}/migration/confirm",
        vol.Required("token"): str,
        vol.Required("expected_revision"): str,
        vol.Required("expected_entities_revision"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_migration_confirm(hass, connection, msg) -> None:
    """Confirm a migration preview."""
    await _respond(
        hass,
        connection,
        msg,
        lambda runtime: runtime.async_migration_confirm(msg),
    )


@websocket_api.websocket_command({"type": f"{DOMAIN}/backups"})
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_backups(hass, connection, msg) -> None:
    """List retained backup pairs."""
    await _respond(hass, connection, msg, lambda runtime: runtime.async_backups())


@websocket_api.websocket_command(
    {
        "type": f"{DOMAIN}/restore",
        vol.Required("backup_id"): str,
        vol.Required("expected_revision"): str,
        vol.Required("expected_entities_revision"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_restore(hass, connection, msg) -> None:
    """Restore a backup pair."""
    await _respond(hass, connection, msg, lambda runtime: runtime.async_restore(msg))


@websocket_api.websocket_command(
    {"type": f"{DOMAIN}/restart", vol.Required("confirmed"): bool}
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_restart(hass, connection, msg) -> None:
    """Request Home Assistant restart with the administrator context."""
    if not msg["confirmed"]:
        connection.send_error(
            msg["id"], "confirmation_required", "Restart confirmation is required"
        )
        return
    await _respond(
        hass,
        connection,
        msg,
        lambda runtime: runtime.async_restart(connection.user.id),
    )


@websocket_api.websocket_command({"type": f"{DOMAIN}/diagnostics"})
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_diagnostics(hass, connection, msg) -> None:
    """Return redacted diagnostics."""
    await _respond(hass, connection, msg, lambda runtime: runtime.async_diagnostics())


@websocket_api.websocket_command(
    {"type": f"{DOMAIN}/support_export", vol.Required("confirmed"): bool}
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_support_export(hass, connection, msg) -> None:
    """Return full managed YAML after explicit privacy confirmation."""
    await _respond(
        hass,
        connection,
        msg,
        lambda runtime: runtime.async_support_export(msg["confirmed"]),
    )


WS_COMMANDS: tuple[Any, ...] = (
    websocket_status,
    websocket_entities,
    websocket_preview,
    websocket_save,
    websocket_migration_preview,
    websocket_migration_confirm,
    websocket_backups,
    websocket_restore,
    websocket_restart,
    websocket_diagnostics,
    websocket_support_export,
)


def async_register(hass) -> None:
    """Register every administrator command once."""
    for command in WS_COMMANDS:
        websocket_api.async_register_command(hass, command)
