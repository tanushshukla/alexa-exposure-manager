"""Redacted diagnostics for Alexa Exposure Manager."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant

from .const import DATA_RUNTIME, DOMAIN, VERSION


def build_redacted_diagnostics(
    *,
    ha_version: str,
    integration_version: str,
    status: dict[str, Any],
    entity_counts: dict[str, int],
    backup_health: dict[str, int],
    errors: list[str],
) -> dict[str, Any]:
    """Build diagnostics without paths, entity details, YAML, or secrets."""
    last_validation = status.get("last_validation")
    redacted_validation = None
    if isinstance(last_validation, dict):
        redacted_validation = {
            "ok": bool(last_validation.get("ok")),
            "error": ("validation_failed" if last_validation.get("error") else None),
            "rollback": last_validation.get("rollback"),
        }
    return {
        "domain": DOMAIN,
        "versions": {
            "home_assistant": ha_version,
            "integration": integration_version,
        },
        "configured": bool(status.get("configured")),
        "read_only": bool(status.get("read_only")),
        "restart_required": bool(status.get("restart_required")),
        "revisions": {
            "filter": status.get("revision"),
            "entity_config": status.get("entities_revision"),
        },
        "last_validation": redacted_validation,
        "migration_state": status.get("migration_state", "not_started"),
        "entity_counts": entity_counts,
        "backup_health": backup_health,
        "errors": errors,
    }


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry
) -> dict[str, Any]:
    """Return the same redacted diagnostics exposed to administrators."""
    runtime = hass.data.get(DOMAIN, {}).get(DATA_RUNTIME, {}).get(entry.entry_id)
    if runtime is None:
        return {"domain": DOMAIN, "versions": {"integration": VERSION}}
    return await runtime.async_diagnostics()
