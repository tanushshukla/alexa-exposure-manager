"""Runtime service behind the administrator WebSocket API."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping
from datetime import UTC, datetime
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

_SAFE_DEFAULT_FILTER = {
    "include_entity_globs": ["__alexa_exposure_manager_never_match__.*"]
}
_EMPTY_MANAGED_FILTERS: tuple[dict[str, list[str]], ...] = (
    _SAFE_DEFAULT_FILTER,
    {"include_entities": []},
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
            valid_display_categories=compatibility.alexa_display_categories(),
        )
        self._store: Store[dict[str, Any]] = Store(
            hass, 1, f"{DOMAIN}.{entry.entry_id}"
        )
        self._state: dict[str, Any] = {
            "restart_required": False,
            "restart_revisions": None,
            "migration_state": "not_started",
            "last_validation": None,
        }
        self._migration_previews: dict[str, dict[str, Any]] = {}
        self.created_files: dict[str, bool] = {}

    async def async_initialize(self) -> None:
        """Initialize managed files and persistent operational state."""
        self.created_files = await self.transaction.async_initialize()
        stored = await self._store.async_load()
        if isinstance(stored, dict):
            self._state.update(stored)
        await self._async_capture_legacy_snapshot()
        if self._state["restart_required"] and await self._active_matches_managed():
            self._state["restart_required"] = False
            self._state["restart_revisions"] = None
            await self._async_save_state()

    async def _async_capture_legacy_snapshot(self) -> None:
        """Retain the last Alexa configuration seen before activation.

        Activation repoints alexa.smart_home.filter and entity_config at the
        managed files, so the legacy rules stop being readable from the resolved
        configuration. Re-capture on every startup until activation freezes the
        last good copy, which is what migration must flatten.
        """
        if self.startup_alexa.get("filter_active"):
            return
        if not self.startup_alexa.get("legacy_source_available", True):
            return
        legacy_filter = self.startup_alexa.get("filter") or {}
        legacy_metadata = self.startup_alexa.get("entity_config") or {}
        legacy_fingerprint = self._legacy_source_fingerprint(
            legacy_filter, legacy_metadata
        )
        managed = await self.transaction.async_read()
        if self._state["migration_state"] == "complete":
            stale_completion = bool(
                (legacy_filter or legacy_metadata)
                and not managed["read_only"]
                and not managed["expose_new_entities"]
                and managed.get("filter", _SAFE_DEFAULT_FILTER)
                in _EMPTY_MANAGED_FILTERS
                and not managed.get("exposure")
                and not managed.get("entity_config")
                and (
                    self._state.get("migration_source_fingerprint")
                    != legacy_fingerprint
                    or any(self.created_files.values())
                )
            )
            if not stale_completion:
                return
            self._state["migration_state"] = "not_started"
            self._state.pop("migration_source_fingerprint", None)
            self._state.pop("legacy_snapshot", None)
        self._state["legacy_snapshot"] = {
            "filter": legacy_filter,
            "entity_config": legacy_metadata,
            "captured_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "managed_revisions": {
                "revision": managed["revision"],
                "entities_revision": managed["entities_revision"],
            },
        }
        await self._async_save_state()

    @staticmethod
    def _legacy_source_fingerprint(
        legacy_filter: Mapping[str, Any], legacy_metadata: Mapping[str, Any]
    ) -> str:
        """Identify the inline source used for a completed migration."""
        return hashlib.sha256(
            json.dumps(
                {"filter": legacy_filter, "entity_config": legacy_metadata},
                sort_keys=True,
                separators=(",", ":"),
            ).encode()
        ).hexdigest()

    @staticmethod
    def _require_fresh_snapshot(
        legacy_source: Mapping[str, Any], catalog_response: Mapping[str, Any]
    ) -> None:
        """Refuse to flatten a snapshot older than the current managed files.

        Importing then would silently discard exposure choices saved through the
        panel after the legacy configuration was captured.
        """
        captured = legacy_source.get("managed_revisions")
        if not isinstance(captured, Mapping):
            return
        if (
            captured.get("revision") == catalog_response["revision"]
            and captured.get("entities_revision")
            == catalog_response["entities_revision"]
        ):
            return
        raise InvalidManagedConfigurationError(
            "The managed Alexa files changed after the existing configuration was "
            f"captured on {legacy_source.get('captured_at')}. Re-check your Alexa "
            "YAML and reload this page before importing, so that saved exposure "
            "choices are not overwritten."
        )

    def _legacy_source(self) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
        """Return the legacy filter, metadata, and where they came from."""
        snapshot = self._state.get("legacy_snapshot")
        if isinstance(snapshot, dict):
            return (
                snapshot.get("filter") or {},
                snapshot.get("entity_config") or {},
                {
                    "from_snapshot": True,
                    "available": True,
                    "captured_at": snapshot.get("captured_at"),
                    "managed_revisions": snapshot.get("managed_revisions"),
                },
            )
        available = self.startup_alexa.get("legacy_source_available")
        if not isinstance(available, bool):
            available = not self.startup_alexa.get(
                "filter_active", False
            ) and not self.startup_alexa.get("entity_config_active", False)
        return (
            self.startup_alexa.get("filter", {}),
            self.startup_alexa.get("entity_config", {}),
            {
                "from_snapshot": False,
                "available": available,
                "captured_at": None,
            },
        )

    async def async_status(self) -> dict[str, Any]:
        """Return setup, activation, file health, and operational state."""
        snapshot = await self.transaction.async_read()
        _legacy_filter, _legacy_metadata, legacy_source = self._legacy_source()
        configured = bool(
            self.startup_alexa.get("filter_active")
            and self.startup_alexa.get("entity_config_active")
        )
        strategy = snapshot.get(
            "strategy",
            "blocklist" if snapshot["expose_new_entities"] else "allowlist",
        )
        safe_defaults = bool(
            not snapshot["read_only"]
            and not snapshot["expose_new_entities"]
            and snapshot.get("filter", _SAFE_DEFAULT_FILTER) in _EMPTY_MANAGED_FILTERS
            and not snapshot.get("exposure")
            and not snapshot.get("entity_config")
        )
        active_matches_saved = bool(
            configured
            and snapshot.get("filter") == self.startup_alexa.get("filter", {})
            and self._normalize_entity_config(snapshot.get("entity_config", {}))
            == self._normalize_entity_config(
                self.startup_alexa.get("entity_config", {})
            )
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
                "safe_defaults": safe_defaults,
            },
            "configuration_state": {
                "active_uses_managed_files": configured,
                "active_matches_saved": active_matches_saved,
                "saved_valid": not snapshot["read_only"],
                "pending_restart": bool(self._state["restart_required"]),
            },
            "migration_available": bool(
                self._state["migration_state"] != "complete"
                and legacy_source["available"]
            ),
            "include_instructions": {
                "configuration_yaml": CONFIGURATION_INCLUDE,
                "alexa_yaml": ALEXA_INCLUDE,
            },
            "editing_enabled": bool(
                configured
                and not snapshot["read_only"]
                and strategy != "registry_default"
            ),
            "editing_disabled_reason": (
                "Registry-default Alexa exposure cannot be edited losslessly; "
                "choose an explicit filter strategy first"
                if strategy == "registry_default"
                else None
            ),
            "read_only": snapshot["read_only"],
            "read_only_reasons": snapshot["read_only_reasons"],
            "revision": snapshot["revision"],
            "entities_revision": snapshot["entities_revision"],
            "strategy": strategy,
            "expose_new_entities": snapshot["expose_new_entities"],
            "restart_required": bool(self._state["restart_required"]),
            "last_validation": (
                self.transaction.last_validation
                if self.transaction.last_validation is not None
                else self._state.get("last_validation")
            ),
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
                "default_exposed": True,
            }

        entities: list[dict[str, Any]] = []
        for entity_id in sorted(by_id):
            entity = by_id[entity_id]
            metadata = snapshot["entity_config"].get(entity_id, {})
            exposed = (
                bool(entity.get("default_exposed", True))
                if snapshot.get("strategy") == "registry_default"
                else snapshot["exposure"].get(
                    entity_id, snapshot["expose_new_entities"]
                )
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
            "strategy": snapshot.get(
                "strategy",
                "blocklist" if snapshot["expose_new_entities"] else "allowlist",
            ),
            "expose_new_entities": snapshot["expose_new_entities"],
            "read_only": snapshot["read_only"],
            "entities": entities,
        }

    async def async_preview(self, message: dict[str, Any]) -> dict[str, Any]:
        """Preview deterministic YAML for staged browser changes."""
        self._require_editing()
        await self._require_lossless_editing_strategy()
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
        if catalog_response["strategy"] == "registry_default":
            raise InvalidManagedConfigurationError(
                "Registry-default Alexa exposure cannot be edited losslessly; "
                "choose an explicit filter strategy first"
            )
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
        """Preview an exact transfer of the captured Alexa filter and metadata."""
        catalog_response = await self.async_entities()
        catalog = catalog_response["entities"]
        legacy_filter, legacy_metadata, legacy_source = self._legacy_source()
        if self._state["migration_state"] == "complete":
            raise InvalidManagedConfigurationError("Migration is already complete")
        if not legacy_source["available"]:
            raise InvalidManagedConfigurationError(
                "No previous Alexa configuration was captured. Restore the old "
                "inline Alexa filter from a backup and restart Home Assistant, or "
                "start fresh with the manager."
            )
        self._require_fresh_snapshot(legacy_source, catalog_response)
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
        counts = {"exposed": 0, "hidden": 0, "unsupported": 0, "missing": 0}
        for entity in catalog:
            if entity["missing"]:
                continue
            exposed = compatibility.alexa_effective_exposure(
                legacy_filter,
                entity["entity_id"],
                default_exposed=bool(entity.get("default_exposed", True)),
            )
            if entity["supported"]:
                counts["exposed" if exposed else "hidden"] += 1
            else:
                counts["unsupported"] += 1
        counts["missing"] = len(missing_ids)
        preview_data = {
            "expected_revision": catalog_response["revision"],
            "expected_entities_revision": catalog_response["entities_revision"],
            "filter_config": legacy_filter,
            "entity_config": legacy_metadata,
            "legacy_source_fingerprint": self._legacy_source_fingerprint(
                legacy_filter, legacy_metadata
            ),
        }
        token = hashlib.sha256(
            json.dumps(preview_data, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        preview = await self.transaction.async_import_preview(
            filter_config=legacy_filter,
            entity_config=legacy_metadata,
        )
        self._migration_previews[token] = preview_data
        if self._state["migration_state"] == "not_started":
            # Preview deliberately changes no persisted state or managed file.
            self._state["migration_state"] = "previewed"
        return {
            "token": token,
            "counts": counts,
            "legacy_source": legacy_source,
            "strategy": preview["strategy"],
            "expose_new_entities": preview["expose_new_entities"],
            "source_inventory": {
                key: len(value) if isinstance(value, list) else 0
                for key, value in legacy_filter.items()
            }
            | {"entity_config": len(legacy_metadata)},
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
        try:
            result = await self.transaction.async_import_save(
                expected_revision=preview["expected_revision"],
                expected_entities_revision=preview["expected_entities_revision"],
                filter_config=preview["filter_config"],
                entity_config=preview["entity_config"],
            )
        except Exception:
            await self._persist_validation_state()  # noqa: TRY302
            raise
        self._state["migration_state"] = "complete"
        self._state["migration_source_fingerprint"] = preview[
            "legacy_source_fingerprint"
        ]
        await self._record_restart_required(result)
        result["migration_state"] = "complete"
        result["migration_available"] = False
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

    async def _require_lossless_editing_strategy(self) -> None:
        snapshot = await self.transaction.async_read()
        if snapshot["strategy"] == "registry_default":
            raise InvalidManagedConfigurationError(
                "Registry-default Alexa exposure cannot be edited losslessly; "
                "choose an explicit filter strategy first"
            )

    async def _record_restart_required(self, result: dict[str, Any]) -> None:
        self._state["restart_required"] = True
        self._state["restart_revisions"] = {
            "revision": result["revision"],
            "entities_revision": result["entities_revision"],
        }
        self._state["last_validation"] = result.get(
            "last_validation", self.transaction.last_validation
        )
        await self._async_save_state()

    async def _persist_validation_state(self) -> None:
        self._state["last_validation"] = self.transaction.last_validation
        await self._store.async_save(self._state)

    async def _async_save_state(self) -> None:
        await self._store.async_save(self._state)

    async def _active_matches_managed(self) -> bool:
        if not (
            self.startup_alexa.get("filter_active")
            and self.startup_alexa.get("entity_config_active")
        ):
            return False
        restart_revisions = self._state.get("restart_revisions") or {}
        snapshot = await self.transaction.async_read()
        if snapshot["revision"] != restart_revisions.get("revision") or snapshot[
            "entities_revision"
        ] != restart_revisions.get("entities_revision"):
            return False
        files = await self.transaction.async_support_export()
        from .const import ENTITY_CONFIG_FILENAME, FILTER_FILENAME

        return (yaml.safe_load(files[FILTER_FILENAME]) or {}) == self.startup_alexa.get(
            "filter", {}
        ) and self._normalize_entity_config(
            yaml.safe_load(files[ENTITY_CONFIG_FILENAME]) or {}
        ) == self._normalize_entity_config(self.startup_alexa.get("entity_config", {}))

    @staticmethod
    def _normalize_entity_config(value: Any) -> dict[str, Any]:
        if not isinstance(value, Mapping):
            return {}
        normalized: dict[str, Any] = {}
        for entity_id, raw_metadata in value.items():
            metadata = dict(raw_metadata) if isinstance(raw_metadata, Mapping) else {}
            categories = metadata.get("display_categories")
            if isinstance(categories, str):
                metadata["display_categories"] = [categories]
            normalized[str(entity_id)] = metadata
        return normalized
