"""Runtime service behind the administrator WebSocket API."""

from __future__ import annotations

import hashlib
import json
from typing import Any

import yaml
from homeassistant.const import __version__ as HA_VERSION
from homeassistant.core import Context
from homeassistant.helpers.storage import Store

from . import compatibility
from .const import (
    ALEXA_INCLUDE,
    CONFIGURATION_INCLUDE,
    DOMAIN,
    VERSION,
)
from .diagnostics import build_redacted_diagnostics
from .managed_files import (
    InvalidManagedConfigurationError,
    ManagedFileTransaction,
)


class AlexaExposureManagerRuntime:
    """Coordinate activation, catalog, transactions, migration, and recovery."""

    def __init__(self, hass, entry, startup_alexa: dict[str, Any]) -> None:
        self.hass = hass
        self.entry = entry
        self.startup_alexa = startup_alexa
        self.transaction = ManagedFileTransaction(
            hass.config.config_dir,
            hass.async_add_executor_job,
            lambda: compatibility.async_validate_full_config(hass),
            display_category_lists=(
                compatibility.alexa_display_category_lists_supported()
            ),
            valid_display_categories=compatibility.alexa_display_categories(),
        )
        self._store = Store(hass, 1, f"{DOMAIN}.{entry.entry_id}")
        self._state: dict[str, Any] = {
            "restart_required": False,
            "restart_revisions": None,
            "migration_state": "not_started",
        }
        self._migration_previews: dict[str, dict[str, Any]] = {}
        self.created_files: dict[str, bool] = {}

    async def async_initialize(self) -> None:
        """Initialize managed files and persistent operational state."""
        self.created_files = await self.transaction.async_initialize()
        stored = await self._store.async_load()
        if isinstance(stored, dict):
            self._state.update(stored)
        if self._state["restart_required"] and await self._active_matches_managed():
            self._state["restart_required"] = False
            self._state["restart_revisions"] = None
            await self._async_save_state()

    async def async_status(self) -> dict[str, Any]:
        """Return setup, activation, file health, and operational state."""
        snapshot = await self.transaction.async_read()
        configured = bool(
            self.startup_alexa.get("filter_active")
            and self.startup_alexa.get("entity_config_active")
        )
        return {
            "configured": configured,
            "setup_complete": configured,
            "activation": {
                "filter": bool(self.startup_alexa.get("filter_active")),
                "entity_config": bool(self.startup_alexa.get("entity_config_active")),
                "issues": list(self.startup_alexa.get("issues", [])),
            },
            "managed_files": {
                "filter_created": self.created_files.get("filter", False),
                "entity_config_created": self.created_files.get("entity_config", False),
            },
            "include_instructions": {
                "configuration_yaml": CONFIGURATION_INCLUDE,
                "alexa_yaml": ALEXA_INCLUDE,
            },
            "editing_enabled": configured and not snapshot["read_only"],
            "read_only": snapshot["read_only"],
            "read_only_reasons": snapshot["read_only_reasons"],
            "revision": snapshot["revision"],
            "entities_revision": snapshot["entities_revision"],
            "expose_new_entities": snapshot["expose_new_entities"],
            "restart_required": bool(self._state["restart_required"]),
            "last_validation": self.transaction.last_validation,
            "migration_state": self._state["migration_state"],
            "discovery_instructions": (
                "After restart, ask Alexa to discover devices or use the Alexa app."
            ),
        }

    async def async_entities(self, query: str | None = None) -> dict[str, Any]:
        """Return the enriched real entity catalog plus configured missing IDs."""
        base_snapshot = await self.transaction.async_read()
        catalog = compatibility.entity_catalog(
            self.hass, base_snapshot["entity_config"]
        )
        known_ids = {entity["entity_id"] for entity in catalog}
        snapshot = await self.transaction.async_read(known_ids)
        by_id = {entity["entity_id"]: entity for entity in catalog}
        for entity_id in snapshot["missing_entity_ids"]:
            by_id[entity_id] = {
                "entity_id": entity_id,
                "name": entity_id,
                "icon": None,
                "state": "missing",
                "domain": entity_id.split(".", 1)[0],
                "available": False,
                "device_name": None,
                "area_name": None,
                "integration": None,
                "supported": False,
                "unsupported_reason": "This configured entity is missing",
                "display_categories": [],
                "inferred_display_category": None,
                "missing": True,
            }

        entities: list[dict[str, Any]] = []
        for entity_id in sorted(by_id):
            entity = by_id[entity_id]
            metadata = snapshot["entity_config"].get(entity_id, {})
            exposed = snapshot["exposure"].get(
                entity_id, snapshot["expose_new_entities"]
            )
            entity.update(
                {
                    "exposed": exposed,
                    "exposure": "include" if exposed else "exclude",
                    "alexa_name": metadata.get("name", ""),
                    "description": metadata.get("description", ""),
                    "display_categories": metadata.get(
                        "display_categories", entity["display_categories"]
                    ),
                }
            )
            entities.append(entity)

        if query:
            needle = query.casefold()
            entities = [
                entity
                for entity in entities
                if any(
                    needle in str(entity.get(field) or "").casefold()
                    for field in (
                        "name",
                        "entity_id",
                        "device_name",
                        "area_name",
                    )
                )
            ]
        return {
            "revision": snapshot["revision"],
            "entities_revision": snapshot["entities_revision"],
            "expose_new_entities": snapshot["expose_new_entities"],
            "read_only": snapshot["read_only"],
            "entities": entities,
        }

    async def async_preview(self, message: dict[str, Any]) -> dict[str, Any]:
        """Preview deterministic YAML for staged browser changes."""
        self._require_editing()
        catalog = await self.async_entities()
        known_ids = {
            entity["entity_id"]
            for entity in catalog["entities"]
            if not entity["missing"]
        }
        return await self.transaction.async_preview(
            expose_new_entities=message["expose_new_entities"],
            entities=message.get("entities", []),
            known_entity_ids=known_ids,
        )

    async def async_save(self, message: dict[str, Any]) -> dict[str, Any]:
        """Validate exposure support and save staged browser changes."""
        self._require_editing()
        catalog_response = await self.async_entities()
        catalog = {
            entity["entity_id"]: entity for entity in catalog_response["entities"]
        }
        for change in message.get("entities", []):
            entity = catalog.get(change["entity_id"])
            if (
                change.get("exposed") is True
                and entity is not None
                and not entity["supported"]
                and not entity["missing"]
            ):
                raise InvalidManagedConfigurationError(
                    entity["unsupported_reason"]
                    or "This entity cannot be exposed through Alexa"
                )
        known_ids = {
            entity_id for entity_id, entity in catalog.items() if not entity["missing"]
        }
        result = await self.transaction.async_save(
            expected_revision=message["expected_revision"],
            expected_entities_revision=message["expected_entities_revision"],
            expose_new_entities=message["expose_new_entities"],
            entities=message.get("entities", []),
            known_entity_ids=known_ids,
        )
        await self._record_restart_required(result)
        return result

    async def async_migration_preview(self) -> dict[str, Any]:
        """Flatten the active legacy filter using HA EntityFilter semantics."""
        catalog_response = await self.async_entities()
        catalog = catalog_response["entities"]
        legacy_filter = self.startup_alexa.get("filter", {})
        legacy_metadata = self.startup_alexa.get("entity_config", {})
        include_keys = {
            "include_entities",
            "include_domains",
            "include_entity_globs",
        }
        expose_new_entities = not any(legacy_filter.get(key) for key in include_keys)
        current_ids = {
            entity["entity_id"] for entity in catalog if not entity["missing"]
        }
        configured_ids = {
            entity_id
            for key, value in legacy_filter.items()
            if key.endswith("_entities") and isinstance(value, list)
            for entity_id in value
            if isinstance(entity_id, str)
        } | set(legacy_metadata)
        missing_ids = configured_ids - current_ids
        proposed_entities: list[dict[str, Any]] = []
        counts = {"exposed": 0, "hidden": 0, "unsupported": 0, "missing": 0}
        for entity in catalog:
            if entity["missing"]:
                continue
            exposed = (
                entity.get("default_exposed", True)
                if not any(legacy_filter.values())
                else compatibility.evaluate_entity_filter(
                    legacy_filter, entity["entity_id"]
                )
            )
            if entity["supported"]:
                counts["exposed" if exposed else "hidden"] += 1
            else:
                counts["unsupported"] += 1
            proposed_entities.append(
                self._migration_entity(
                    entity["entity_id"],
                    exposed,
                    legacy_metadata.get(entity["entity_id"]),
                )
            )
        for entity_id in sorted(missing_ids):
            counts["missing"] += 1
            proposed_entities.append(
                self._migration_entity(
                    entity_id,
                    compatibility.evaluate_entity_filter(legacy_filter, entity_id),
                    legacy_metadata.get(entity_id),
                )
            )
        preview_data = {
            "expected_revision": catalog_response["revision"],
            "expected_entities_revision": catalog_response["entities_revision"],
            "expose_new_entities": expose_new_entities,
            "entities": proposed_entities,
            "known_entity_ids": sorted(current_ids),
        }
        token = hashlib.sha256(
            json.dumps(preview_data, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        self._migration_previews[token] = preview_data
        preview = await self.transaction.async_preview(
            expose_new_entities=expose_new_entities,
            entities=proposed_entities,
            known_entity_ids=current_ids,
        )
        return {
            "token": token,
            "counts": counts,
            "expose_new_entities": expose_new_entities,
            "revision": preview["revision"],
            "entities_revision": preview["entities_revision"],
            "filter_yaml": preview["filter_yaml"],
            "entity_config_yaml": preview["entity_config_yaml"],
        }

    async def async_migration_confirm(self, message: dict[str, Any]) -> dict[str, Any]:
        """Confirm an unchanged migration preview and save it transactionally."""
        preview = self._migration_previews.pop(message["token"], None)
        if preview is None:
            raise InvalidManagedConfigurationError(
                "Migration preview expired; create a new preview"
            )
        if (
            preview["expected_revision"] != message["expected_revision"]
            or preview["expected_entities_revision"]
            != message["expected_entities_revision"]
        ):
            raise InvalidManagedConfigurationError(
                "Migration revisions changed; create a new preview"
            )
        result = await self.transaction.async_save(
            expected_revision=preview["expected_revision"],
            expected_entities_revision=preview["expected_entities_revision"],
            expose_new_entities=preview["expose_new_entities"],
            entities=preview["entities"],
            known_entity_ids=preview["known_entity_ids"],
        )
        self._state["migration_state"] = "complete"
        await self._record_restart_required(result)
        return result

    async def async_backups(self) -> dict[str, Any]:
        """Return retained paired backups."""
        return {"backups": await self.transaction.async_list_backups()}

    async def async_restore(self, message: dict[str, Any]) -> dict[str, Any]:
        """Restore a paired backup through the normal transaction."""
        self._require_editing()
        result = await self.transaction.async_restore(
            message["backup_id"],
            expected_revision=message["expected_revision"],
            expected_entities_revision=message["expected_entities_revision"],
        )
        await self._record_restart_required(result)
        return result

    async def async_restart(self, user_id: str) -> dict[str, bool]:
        """Call Home Assistant's restart service with the requesting user context."""
        await self.hass.services.async_call(
            "homeassistant",
            "restart",
            {},
            blocking=False,
            context=Context(user_id=user_id),
        )
        return {"requested": True}

    async def async_diagnostics(self) -> dict[str, Any]:
        """Return redacted diagnostics and aggregate health only."""
        status = await self.async_status()
        entities = (await self.async_entities())["entities"]
        backups = await self.transaction.async_list_backups()
        return build_redacted_diagnostics(
            ha_version=HA_VERSION,
            integration_version=VERSION,
            status=status,
            entity_counts={
                "total": len(entities),
                "supported": sum(entity["supported"] for entity in entities),
                "missing": sum(entity["missing"] for entity in entities),
                "exposed": sum(entity["exposed"] for entity in entities),
            },
            backup_health={
                "count": len(backups),
                "healthy": sum(backup["healthy"] for backup in backups),
            },
            errors=[
                error
                for error, present in (
                    ("managed_yaml_read_only", status["read_only"]),
                    ("activation_incomplete", not status["configured"]),
                )
                if present
            ],
        )

    async def async_support_export(self, confirmed: bool) -> dict[str, Any]:
        """Return full YAML only after explicit privacy confirmation."""
        if not confirmed:
            raise InvalidManagedConfigurationError(
                "Support export can reveal entity IDs and Alexa metadata; confirm first"
            )
        return {
            "privacy_warning": (
                "This export contains complete managed YAML, entity IDs, names, and "
                "descriptions. Review it before sharing."
            ),
            "files": await self.transaction.async_support_export(),
        }

    def _require_editing(self) -> None:
        if not (
            self.startup_alexa.get("filter_active")
            and self.startup_alexa.get("entity_config_active")
        ):
            raise InvalidManagedConfigurationError(
                "Editing is disabled until Home Assistant loads both managed includes"
            )

    async def _record_restart_required(self, result: dict[str, Any]) -> None:
        self._state["restart_required"] = True
        self._state["restart_revisions"] = {
            "revision": result["revision"],
            "entities_revision": result["entities_revision"],
        }
        await self._async_save_state()

    async def _async_save_state(self) -> None:
        await self._store.async_save(self._state)

    async def _active_matches_managed(self) -> bool:
        if not (
            self.startup_alexa.get("filter_active")
            and self.startup_alexa.get("entity_config_active")
        ):
            return False
        files = await self.transaction.async_support_export()
        return (
            yaml.safe_load(files["alexa_exposure_filter.yaml"]) or {}
        ) == self.startup_alexa.get("filter", {}) and (
            yaml.safe_load(files["alexa_entity_config.yaml"]) or {}
        ) == self.startup_alexa.get("entity_config", {})

    @staticmethod
    def _migration_entity(
        entity_id: str, exposed: bool, metadata: Any
    ) -> dict[str, Any]:
        metadata = metadata if isinstance(metadata, dict) else {}
        categories = metadata.get("display_categories", [])
        if isinstance(categories, str):
            categories = [categories]
        return {
            "entity_id": entity_id,
            "exposed": exposed,
            "name": metadata.get("name", ""),
            "description": metadata.get("description", ""),
            "display_categories": categories,
        }
