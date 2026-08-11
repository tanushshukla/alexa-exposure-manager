"""Home Assistant compatibility boundary for versions 2026.6 through 2026.8."""

from __future__ import annotations

import logging
import re
from collections.abc import Mapping
from pathlib import Path
from typing import TYPE_CHECKING, Any, cast

from .const import ENTITY_CONFIG_FILENAME, FILTER_FILENAME

_LOGGER = logging.getLogger(__name__)

if TYPE_CHECKING:
    from homeassistant.components.alexa.config import AbstractConfig


def sanitize_alexa_mapping(value: Any) -> Any:
    """Unwrap annotated YAML nodes while retaining only plain Alexa-safe values."""
    if isinstance(value, Mapping):
        return {str(key): sanitize_alexa_mapping(item) for key, item in value.items()}
    if isinstance(value, list):
        return [sanitize_alexa_mapping(item) for item in value]
    if isinstance(value, str | int | float | bool) or value is None:
        return value
    config = getattr(value, "config", None)
    if isinstance(config, Mapping):
        return sanitize_alexa_mapping(config)
    return None


def _annotation_includes_managed_file(
    annotation: tuple[str, int | str] | None,
    filename: str,
    config_dir: str | Path,
) -> bool:
    """Return whether a resolved annotation is the managed file under config_dir."""
    if annotation is None:
        return False
    source = str(annotation[0])
    managed_path = (Path(config_dir) / filename).resolve()
    # HA resolves !include to the included file itself — fixed-path match is sufficient.
    if Path(source).resolve() == managed_path:
        return True
    if not isinstance(annotation[1], int):
        return False
    try:
        with open(source, encoding="utf-8") as file_handle:
            for line_number, line in enumerate(file_handle, start=1):
                if line_number != annotation[1]:
                    continue
                # Handle !include, !include_dir_list/named/merge variants,
                # quoted and path-prefixed forms: !include "subdir/file.yaml"
                match = re.search(
                    r"(!include(?:_dir(?:_(?:list|named|merge_list|merge_named))?)?)\s+[\"']?([^\"'\s]+)[\"']?",
                    line,
                )
                if match is None:
                    return False
                include_tag = match.group(1)
                included = match.group(2).strip()
                # Relative include paths resolve against the including file's directory.
                resolved = (Path(source).parent / included).resolve()
                if resolved == managed_path:
                    return True
                # Dir-style includes are active when the managed file lives in that dir.
                if include_tag.startswith("!include_dir"):
                    return (resolved / filename).resolve() == managed_path
                return False
    except OSError:
        return False
    return False


def _activation_from_annotations(
    filter_annotation: tuple[str, int | str] | None,
    entity_annotation: tuple[str, int | str] | None,
    config_dir: str | Path,
) -> tuple[bool, bool]:
    """Verify both managed includes live under config_dir."""
    return (
        _annotation_includes_managed_file(
            filter_annotation, FILTER_FILENAME, config_dir
        ),
        _annotation_includes_managed_file(
            entity_annotation, ENTITY_CONFIG_FILENAME, config_dir
        ),
    )


async def async_resolved_alexa_config(hass) -> dict[str, Any]:
    """Read only resolved Alexa filter/metadata and include provenance."""
    from homeassistant.config import async_hass_config_yaml, find_annotation

    try:
        config = await async_hass_config_yaml(hass)
    except Exception:
        return {
            "filter": {},
            "entity_config": {},
            "filter_active": False,
            "entity_config_active": False,
            "legacy_source_available": False,
            "issues": [
                "Home Assistant could not resolve configuration YAML; fix the YAML "
                "error shown in Settings > System > Logs"
            ],
        }

    alexa = config.get("alexa")
    smart_home = alexa.get("smart_home") if isinstance(alexa, Mapping) else None
    if not isinstance(smart_home, Mapping):
        return {
            "filter": {},
            "entity_config": {},
            "filter_active": False,
            "entity_config_active": False,
            "legacy_source_available": False,
            "issues": ["alexa.smart_home is not configured"],
        }

    filter_config = sanitize_alexa_mapping(smart_home.get("filter") or {})
    entity_config = sanitize_alexa_mapping(smart_home.get("entity_config") or {})
    filter_annotation = find_annotation(config, ["alexa", "smart_home", "filter"])
    entity_annotation = find_annotation(
        config, ["alexa", "smart_home", "entity_config"]
    )
    filter_active, entity_active = await hass.async_add_executor_job(
        _activation_from_annotations,
        filter_annotation,
        entity_annotation,
        hass.config.config_dir,
    )
    issues: list[str] = []
    if not filter_active:
        issues.append(
            "alexa.smart_home.filter is not loaded from alexa_exposure_filter.yaml"
        )
    if not entity_active:
        issues.append(
            "alexa.smart_home.entity_config is not loaded from alexa_entity_config.yaml"
        )
    return {
        "filter": filter_config if isinstance(filter_config, dict) else {},
        "entity_config": entity_config if isinstance(entity_config, dict) else {},
        "filter_active": filter_active,
        "entity_config_active": entity_active,
        "legacy_source_available": not filter_active and not entity_active,
        "issues": issues,
    }


async def async_validate_full_config(hass) -> str | None:
    """Run Home Assistant's complete configuration validation."""
    from homeassistant.config import async_check_ha_config_file

    error = await async_check_ha_config_file(hass)
    if error is None:
        return None
    normalized = error.casefold()
    if "entity_config" in normalized or "alexa_entity_config" in normalized:
        return (
            "Home Assistant rejected alexa.smart_home.entity_config; review the "
            "staged Alexa metadata"
        )
    if "filter" in normalized or "alexa_exposure_filter" in normalized:
        return (
            "Home Assistant rejected alexa.smart_home.filter; review the staged "
            "exposure choices"
        )
    if "alexa" in normalized:
        return (
            "Home Assistant rejected the resolved Alexa configuration; review the "
            "nested include structure and Alexa settings"
        )
    return (
        "Home Assistant full configuration validation failed outside the managed "
        "Alexa files; review Settings > System > Logs"
    )


def filter_config_is_empty(filter_config: Mapping[str, Any]) -> bool:
    """Return whether a legacy Alexa filter contains no include/exclude rules."""
    return not any(bool(value) for value in filter_config.values())


def evaluate_entity_filter(filter_config: Mapping[str, Any], entity_id: str) -> bool:
    """Evaluate an entity ID with Home Assistant EntityFilter precedence."""
    from homeassistant.helpers.entityfilter import FILTER_SCHEMA

    entity_filter = FILTER_SCHEMA(dict(filter_config))
    return bool(entity_filter(entity_id))


def alexa_effective_exposure(
    filter_config: Mapping[str, Any],
    entity_id: str,
    *,
    default_exposed: bool,
) -> bool:
    """Match local Alexa exposure semantics for empty and non-empty filters."""
    if filter_config_is_empty(filter_config):
        return default_exposed
    return evaluate_entity_filter(filter_config, entity_id)


def alexa_display_categories() -> set[str]:
    """Return the Alexa display category vocabulary for managed YAML validation."""
    from .const import DISPLAY_CATEGORIES

    return set(DISPLAY_CATEGORIES)


class _CatalogAlexaConfig:
    """Minimal adapter config used only to ask HA about discovery support."""

    def __init__(self, entity_config: Mapping[str, Any]) -> None:
        self.entity_config = entity_config
        self.locale = "en-US"


def alexa_entity_support(
    hass, state, entity_config: Mapping[str, Any]
) -> tuple[bool, str | None, list[str] | None]:
    """Ask Home Assistant's built-in Alexa adapter about an entity."""
    from homeassistant.components.alexa.entities import ENTITY_ADAPTERS

    adapter_class = ENTITY_ADAPTERS.get(state.domain)
    if adapter_class is None:
        return False, "This entity domain is not supported by Alexa", None
    try:
        adapter = adapter_class(
            hass,
            cast("AbstractConfig", _CatalogAlexaConfig(entity_config)),
            state,
        )
        if not list(adapter.interfaces()):
            return False, "This entity has no Alexa-compatible capabilities", None
        categories = adapter.default_display_categories()
    except Exception:
        _LOGGER.exception(
            "Alexa adapter failed while checking support for %s", state.entity_id
        )
        return (
            False,
            "This entity's current state or device class is not compatible with Alexa",
            None,
        )
    return True, None, list(categories) if categories else None


def entity_catalog(hass, entity_config: Mapping[str, Any]) -> list[dict[str, Any]]:
    """Build the real catalog from states and the entity/device/area registries."""
    from homeassistant.const import ATTR_ICON, STATE_UNAVAILABLE
    from homeassistant.helpers import (
        area_registry as ar,
    )
    from homeassistant.helpers import (
        device_registry as dr,
    )
    from homeassistant.helpers import (
        entity_registry as er,
    )

    entity_registry = er.async_get(hass)
    device_registry = dr.async_get(hass)
    area_registry = ar.async_get(hass)
    entities: list[dict[str, Any]] = []
    for state in hass.states.async_all():
        registry_entry = entity_registry.async_get(state.entity_id)
        device = (
            device_registry.async_get(registry_entry.device_id)
            if registry_entry is not None and registry_entry.device_id
            else None
        )
        area_id = (
            registry_entry.area_id
            if registry_entry is not None and registry_entry.area_id
            else device.area_id
            if device is not None
            else None
        )
        area = area_registry.async_get_area(area_id) if area_id else None
        supported, reason, categories = alexa_entity_support(hass, state, entity_config)
        if registry_entry is not None and registry_entry.disabled:
            supported = False
            reason = "This entity is disabled in Home Assistant"
        metadata = entity_config.get(state.entity_id, {})
        configured_categories = metadata.get("display_categories")
        if isinstance(configured_categories, str):
            configured_categories = [configured_categories]
        entities.append(
            {
                "entity_id": state.entity_id,
                "name": state.name,
                "icon": (
                    registry_entry.icon
                    if registry_entry is not None and registry_entry.icon
                    else state.attributes.get(ATTR_ICON)
                ),
                "state": state.state,
                "domain": state.domain,
                "available": state.state != STATE_UNAVAILABLE,
                "device_name": (
                    (device.name_by_user or device.name) if device is not None else None
                ),
                "area_name": area.name if area is not None else None,
                "integration": (
                    registry_entry.platform if registry_entry is not None else None
                ),
                "supported": supported,
                "unsupported_reason": reason,
                "default_exposed": not bool(
                    registry_entry is not None
                    and (
                        registry_entry.entity_category is not None
                        or registry_entry.hidden_by is not None
                    )
                ),
                "display_categories": configured_categories or categories or [],
                "inferred_display_category": categories[0] if categories else None,
                "missing": False,
            }
        )
    return sorted(entities, key=lambda item: item["entity_id"])
