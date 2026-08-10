"""Safe management of the two files owned by Alexa Exposure Manager."""

from __future__ import annotations

import asyncio
import hashlib
import os
import re
import shutil
import tempfile
import time
from collections.abc import Awaitable, Callable, Collection, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml
from yaml.tokens import AliasToken, AnchorToken, TagToken

from .const import (
    BACKUP_DIRECTORY,
    BACKUP_RETENTION,
    ENTITY_CONFIG_FILENAME,
    FILTER_FILENAME,
)

Executor = Callable[..., Awaitable[Any]]
Validator = Callable[[], Awaitable[str | None]]

_ENTITY_ID = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
_MODE_MARKER = re.compile(
    r"^# alexa_exposure_manager: expose_new_entities=(true|false)$", re.MULTILINE
)
_FILTER_KEYS = frozenset({"include_entities", "exclude_entities"})
_ENTITY_CONFIG_KEYS = frozenset({"name", "description", "display_categories"})
_DEFAULT_DISPLAY_CATEGORIES = frozenset(
    {
        "ACTIVITY_TRIGGER",
        "AIR_CONDITIONER",
        "AIR_FRESHENER",
        "AIR_PURIFIER",
        "AUTO_ACCESSORY",
        "CAMERA",
        "CHRISTMAS_TREE",
        "COFFEE_MAKER",
        "CONTACT_SENSOR",
        "DOOR",
        "DOORBELL",
        "EXTERIOR_BLIND",
        "FAN",
        "GAME_CONSOLE",
        "GARAGE_DOOR",
        "HEADPHONES",
        "HUB",
        "INTERIOR_BLIND",
        "LAPTOP",
        "LIGHT",
        "MICROWAVE",
        "MOBILE_PHONE",
        "MOTION_SENSOR",
        "MUSIC_SYSTEM",
        "NETWORK_HARDWARE",
        "OTHER",
        "OVEN",
        "PHONE",
        "PRINTER",
        "ROUTER",
        "SCENE_TRIGGER",
        "SCREEN",
        "SECURITY_PANEL",
        "SMARTLOCK",
        "SMARTPLUG",
        "SPEAKER",
        "STREAMING_DEVICE",
        "SWITCH",
        "TABLET",
        "TEMPERATURE_SENSOR",
        "THERMOSTAT",
        "TV",
        "VACUUM_CLEANER",
        "WATER_HEATER",
        "WEARABLE",
    }
)


class _IndentedSafeDumper(yaml.SafeDumper):
    """Indent sequence values beneath their mapping key."""

    def increase_indent(self, flow: bool = False, indentless: bool = False) -> None:
        return super().increase_indent(flow, False)


class ManagedFilesError(Exception):
    """Base error for managed file operations."""


class RevisionConflictError(ManagedFilesError):
    """Raised when either managed file changed since it was read."""


class ManagedYamlReadOnlyError(ManagedFilesError):
    """Raised when managed YAML cannot be changed without losing data."""


class ValidationFailedError(ManagedFilesError):
    """Raised when Home Assistant rejects the complete configuration."""


class BackupNotFoundError(ManagedFilesError):
    """Raised when a requested backup pair does not exist."""


class InvalidManagedConfigurationError(ManagedFilesError):
    """Raised when requested manager-owned values are invalid."""


@dataclass(slots=True)
class _ParsedPair:
    expose_new_entities: bool
    filter_entities: set[str]
    entity_config: dict[str, dict[str, Any]]
    revision: str
    entities_revision: str
    read_only_reasons: list[str]

    @property
    def configured_entity_ids(self) -> set[str]:
        return self.filter_entities | set(self.entity_config)


class ManagedFileTransaction:
    """Serialize, validate, back up, and atomically replace both managed files."""

    def __init__(
        self,
        config_dir: Path | str,
        executor: Executor,
        validator: Validator,
        *,
        display_category_lists: bool = False,
        valid_display_categories: Collection[str] = _DEFAULT_DISPLAY_CATEGORIES,
    ) -> None:
        self.config_dir = Path(config_dir)
        self.filter_path = self.config_dir / FILTER_FILENAME
        self.entity_config_path = self.config_dir / ENTITY_CONFIG_FILENAME
        self.backup_path = self.config_dir / BACKUP_DIRECTORY
        self._executor = executor
        self._validator = validator
        self._display_category_lists = display_category_lists
        self._valid_display_categories = frozenset(valid_display_categories)
        self._lock = asyncio.Lock()
        self.last_validation: dict[str, Any] | None = None

    async def async_initialize(self) -> dict[str, bool]:
        """Create only managed files that do not already exist."""
        return await self._executor(self._initialize_files)

    async def async_read(
        self, known_entity_ids: Collection[str] = ()
    ) -> dict[str, Any]:
        """Read both files and expose one boolean state per known/configured entity."""
        parsed = await self._executor(self._read_pair)
        return self._snapshot(parsed, set(known_entity_ids))

    async def async_preview(
        self,
        *,
        expose_new_entities: bool,
        entities: list[Mapping[str, Any]],
        known_entity_ids: Collection[str],
    ) -> dict[str, Any]:
        """Render a proposed configuration without changing either file."""
        parsed = await self._executor(self._read_pair)
        if parsed.read_only_reasons:
            raise ManagedYamlReadOnlyError("; ".join(parsed.read_only_reasons))
        filter_text, entity_text, exposure, entity_config = self._build_update(
            parsed,
            expose_new_entities,
            entities,
            set(known_entity_ids),
        )
        return {
            "revision": parsed.revision,
            "entities_revision": parsed.entities_revision,
            "expose_new_entities": expose_new_entities,
            "exposure": exposure,
            "entity_config": entity_config,
            "filter_yaml": filter_text,
            "entity_config_yaml": entity_text,
        }

    async def async_save(
        self,
        *,
        expected_revision: str,
        expected_entities_revision: str,
        expose_new_entities: bool,
        entities: list[Mapping[str, Any]],
        known_entity_ids: Collection[str],
    ) -> dict[str, Any]:
        """Save both files through one serialized, revision-checked transaction."""
        async with self._lock:
            parsed = await self._executor(self._read_pair)
            self._check_revisions(parsed, expected_revision, expected_entities_revision)
            if parsed.read_only_reasons:
                raise ManagedYamlReadOnlyError("; ".join(parsed.read_only_reasons))

            filter_text, entity_text, _exposure, _entity_config = self._build_update(
                parsed,
                expose_new_entities,
                entities,
                set(known_entity_ids),
            )
            old_filter, old_entities = await self._executor(self._read_bytes_pair)
            try:
                await self._executor(self._backup_and_replace, filter_text, entity_text)
            except OSError as error:
                raise ManagedFilesError(
                    "Managed file write failed; the previous files were restored"
                ) from error
            validation_error = await self._validator()
            if validation_error is not None:
                try:
                    await self._executor(
                        self._replace_bytes_pair, old_filter, old_entities
                    )
                except OSError as rollback_error:
                    self.last_validation = {
                        "ok": False,
                        "error": validation_error,
                        "rollback": "failed",
                    }
                    raise ValidationFailedError(
                        "Home Assistant rejected the configuration and automatic "
                        f"rollback failed: {rollback_error}"
                    ) from rollback_error
                self.last_validation = {
                    "ok": False,
                    "error": validation_error,
                    "rollback": "complete",
                }
                raise ValidationFailedError(validation_error)

            self.last_validation = {"ok": True, "error": None}
            saved = await self._executor(self._read_pair)
            return {
                "revision": saved.revision,
                "entities_revision": saved.entities_revision,
                "expose_new_entities": saved.expose_new_entities,
                "restart_required": True,
            }

    async def async_list_backups(self) -> list[dict[str, Any]]:
        """List retained backup pairs, newest first."""
        return await self._executor(self._list_backups)

    async def async_restore(
        self,
        backup_id: str,
        *,
        expected_revision: str,
        expected_entities_revision: str,
    ) -> dict[str, Any]:
        """Restore a backup through the same protected transaction as normal saves."""
        async with self._lock:
            parsed = await self._executor(self._read_pair)
            self._check_revisions(parsed, expected_revision, expected_entities_revision)
            backup_filter, backup_entities = await self._executor(
                self._read_backup_pair, backup_id
            )
            backup = self._parse_pair(backup_filter, backup_entities)
            if backup.read_only_reasons:
                raise ManagedYamlReadOnlyError("; ".join(backup.read_only_reasons))
            old_filter, old_entities = await self._executor(self._read_bytes_pair)
            try:
                await self._executor(
                    self._backup_and_replace_bytes, backup_filter, backup_entities
                )
            except OSError as error:
                raise ManagedFilesError(
                    "Backup restore write failed; the previous files were restored"
                ) from error
            validation_error = await self._validator()
            if validation_error is not None:
                try:
                    await self._executor(
                        self._replace_bytes_pair, old_filter, old_entities
                    )
                except OSError as rollback_error:
                    self.last_validation = {
                        "ok": False,
                        "error": validation_error,
                        "rollback": "failed",
                    }
                    raise ValidationFailedError(
                        "Home Assistant rejected the restored configuration and "
                        f"automatic rollback failed: {rollback_error}"
                    ) from rollback_error
                self.last_validation = {
                    "ok": False,
                    "error": validation_error,
                    "rollback": "complete",
                }
                raise ValidationFailedError(validation_error)

            self.last_validation = {"ok": True, "error": None}
            restored = await self._executor(self._read_pair)
            return {
                "revision": restored.revision,
                "entities_revision": restored.entities_revision,
                "expose_new_entities": restored.expose_new_entities,
                "restart_required": True,
            }

    async def async_support_export(self) -> dict[str, str]:
        """Return the complete managed YAML for an explicitly confirmed export."""
        filter_bytes, entity_bytes = await self._executor(self._read_bytes_pair)
        return {
            FILTER_FILENAME: filter_bytes.decode("utf-8"),
            ENTITY_CONFIG_FILENAME: entity_bytes.decode("utf-8"),
        }

    def _initialize_files(self) -> dict[str, bool]:
        self.config_dir.mkdir(parents=True, exist_ok=True)
        created_filter = self._create_if_missing(
            self.filter_path,
            self._render_filter(False, set()).encode(),
        )
        created_entities = self._create_if_missing(self.entity_config_path, b"{}\n")
        return {"filter": created_filter, "entity_config": created_entities}

    @staticmethod
    def _create_if_missing(path: Path, content: bytes) -> bool:
        try:
            descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            return False
        with os.fdopen(descriptor, "wb") as file_handle:
            file_handle.write(content)
            file_handle.flush()
            os.fsync(file_handle.fileno())
        ManagedFileTransaction._fsync_directory(path.parent)
        return True

    def _read_pair(self) -> _ParsedPair:
        filter_bytes, entity_bytes = self._read_bytes_pair()
        return self._parse_pair(filter_bytes, entity_bytes)

    def _read_bytes_pair(self) -> tuple[bytes, bytes]:
        return self.filter_path.read_bytes(), self.entity_config_path.read_bytes()

    def _parse_pair(self, filter_bytes: bytes, entity_bytes: bytes) -> _ParsedPair:
        reasons: list[str] = []
        filter_text = self._decode(filter_bytes, "filter", reasons)
        entity_text = self._decode(entity_bytes, "entity configuration", reasons)
        filter_data = self._safe_mapping(filter_text, "filter", reasons)
        entity_data = self._safe_mapping(entity_text, "entity configuration", reasons)

        unknown_filter_keys = set(filter_data) - _FILTER_KEYS
        if unknown_filter_keys:
            reasons.append(
                "The filter contains unknown keys: "
                + ", ".join(sorted(map(str, unknown_filter_keys)))
            )

        present_filter_keys = set(filter_data) & _FILTER_KEYS
        if len(present_filter_keys) > 1:
            reasons.append(
                "The filter contains both include_entities and exclude_entities"
            )

        marker_match = _MODE_MARKER.search(filter_text)
        if marker_match:
            expose_new_entities = marker_match.group(1) == "true"
        else:
            expose_new_entities = "exclude_entities" in present_filter_keys

        expected_key = "exclude_entities" if expose_new_entities else "include_entities"
        if present_filter_keys and expected_key not in present_filter_keys:
            reasons.append("The exposure mode marker conflicts with the filter key")

        raw_filter_entities = filter_data.get(expected_key, [])
        filter_entities = self._string_entity_list(
            raw_filter_entities, expected_key, reasons
        )

        parsed_entity_config: dict[str, dict[str, Any]] = {}
        for raw_entity_id, raw_metadata in entity_data.items():
            if not isinstance(raw_entity_id, str) or not _ENTITY_ID.fullmatch(
                raw_entity_id
            ):
                reasons.append(
                    "The entity configuration key "
                    f"{raw_entity_id!r} is not an entity ID"
                )
                continue
            if raw_metadata is None:
                raw_metadata = {}
            if not isinstance(raw_metadata, dict):
                reasons.append(f"Metadata for {raw_entity_id} must be a mapping")
                continue
            unknown_metadata = set(raw_metadata) - _ENTITY_CONFIG_KEYS
            if unknown_metadata:
                reasons.append(
                    f"Metadata for {raw_entity_id} contains unknown keys: "
                    + ", ".join(sorted(map(str, unknown_metadata)))
                )
            metadata: dict[str, Any] = {}
            for text_key in ("name", "description"):
                if text_key not in raw_metadata:
                    continue
                value = raw_metadata[text_key]
                if not isinstance(value, str):
                    reasons.append(f"{text_key} for {raw_entity_id} must be text")
                    continue
                metadata[text_key] = value

            if "display_categories" in raw_metadata:
                categories = raw_metadata["display_categories"]
                if isinstance(categories, str):
                    categories = [categories]
                elif isinstance(categories, list) and self._display_category_lists:
                    categories = list(categories)
                else:
                    reasons.append(
                        f"display_categories for {raw_entity_id} uses an "
                        "unsupported value"
                    )
                    categories = []
                valid_categories = self._validate_categories(
                    raw_entity_id, categories, reasons
                )
                if valid_categories:
                    metadata["display_categories"] = valid_categories
            parsed_entity_config[raw_entity_id] = metadata

        return _ParsedPair(
            expose_new_entities=expose_new_entities,
            filter_entities=filter_entities,
            entity_config=parsed_entity_config,
            revision=self._revision(filter_bytes),
            entities_revision=self._revision(entity_bytes),
            read_only_reasons=reasons,
        )

    @staticmethod
    def _decode(content: bytes, label: str, reasons: list[str]) -> str:
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            reasons.append(f"The managed {label} is not UTF-8")
            return "{}\n"

    @staticmethod
    def _safe_mapping(text: str, label: str, reasons: list[str]) -> dict[Any, Any]:
        try:
            for token in yaml.scan(text):
                if isinstance(token, (AnchorToken, AliasToken, TagToken)):
                    reasons.append(
                        f"The managed {label} contains YAML anchors, aliases, or tags"
                    )
                    break
            value = yaml.safe_load(text)
        except yaml.YAMLError as error:
            reasons.append(f"The managed {label} is invalid YAML: {error}")
            return {}
        if value is None:
            return {}
        if not isinstance(value, dict):
            reasons.append(f"The managed {label} must be a mapping")
            return {}
        return value

    @staticmethod
    def _string_entity_list(value: Any, key: str, reasons: list[str]) -> set[str]:
        if not isinstance(value, list):
            reasons.append(f"{key} must be a list")
            return set()
        result: set[str] = set()
        for entity_id in value:
            if not isinstance(entity_id, str) or not _ENTITY_ID.fullmatch(entity_id):
                reasons.append(f"{key} contains an invalid entity ID: {entity_id!r}")
                continue
            result.add(entity_id)
        return result

    def _validate_categories(
        self, entity_id: str, categories: list[Any], reasons: list[str]
    ) -> list[str]:
        validated: list[str] = []
        for category in categories:
            if (
                not isinstance(category, str)
                or category not in self._valid_display_categories
            ):
                reasons.append(
                    f"display_categories for {entity_id} contains invalid "
                    f"category {category!r}"
                )
                continue
            if category not in validated:
                validated.append(category)
        if len(validated) > 1 and not self._display_category_lists:
            reasons.append(
                "This Home Assistant version accepts only one Alexa display category"
            )
        return validated

    def _snapshot(
        self, parsed: _ParsedPair, known_entity_ids: set[str]
    ) -> dict[str, Any]:
        all_entity_ids = known_entity_ids | parsed.configured_entity_ids
        if parsed.expose_new_entities:
            exposure = {
                entity_id: entity_id not in parsed.filter_entities
                for entity_id in sorted(all_entity_ids)
            }
        else:
            exposure = {
                entity_id: entity_id in parsed.filter_entities
                for entity_id in sorted(all_entity_ids)
            }
        return {
            "revision": parsed.revision,
            "entities_revision": parsed.entities_revision,
            "expose_new_entities": parsed.expose_new_entities,
            "exposure": exposure,
            "entity_config": parsed.entity_config,
            "missing_entity_ids": sorted(
                parsed.configured_entity_ids - known_entity_ids
            ),
            "read_only": bool(parsed.read_only_reasons),
            "read_only_reasons": parsed.read_only_reasons,
        }

    def _build_update(
        self,
        parsed: _ParsedPair,
        expose_new_entities: bool,
        entities: list[Mapping[str, Any]],
        known_entity_ids: set[str],
    ) -> tuple[str, str, dict[str, bool], dict[str, dict[str, Any]]]:
        universe = known_entity_ids | parsed.configured_entity_ids
        if parsed.expose_new_entities:
            exposure = {
                entity_id: entity_id not in parsed.filter_entities
                for entity_id in universe
            }
        else:
            exposure = {
                entity_id: entity_id in parsed.filter_entities for entity_id in universe
            }
        entity_config = {
            entity_id: dict(metadata)
            for entity_id, metadata in parsed.entity_config.items()
        }
        removed_entity_ids: set[str] = set()

        for entity in entities:
            entity_id = entity.get("entity_id")
            if not isinstance(entity_id, str) or not _ENTITY_ID.fullmatch(entity_id):
                raise InvalidManagedConfigurationError(
                    f"Invalid entity ID: {entity_id!r}"
                )
            universe.add(entity_id)
            if entity.get("remove") is True:
                exposure.pop(entity_id, None)
                entity_config.pop(entity_id, None)
                universe.discard(entity_id)
                removed_entity_ids.add(entity_id)
                continue
            if "exposed" in entity:
                if not isinstance(entity["exposed"], bool):
                    raise InvalidManagedConfigurationError(
                        f"Exposure for {entity_id} must be true or false"
                    )
                exposure[entity_id] = entity["exposed"]

            metadata = dict(entity_config.get(entity_id, {}))
            for text_key in ("name", "description"):
                if text_key not in entity:
                    continue
                value = entity[text_key]
                if value in (None, ""):
                    metadata.pop(text_key, None)
                elif not isinstance(value, str) or len(value) > 256:
                    raise InvalidManagedConfigurationError(
                        f"{text_key} for {entity_id} must be text up to 256 characters"
                    )
                else:
                    metadata[text_key] = value

            if "display_categories" in entity:
                raw_categories = entity["display_categories"]
                if raw_categories in (None, []):
                    metadata.pop("display_categories", None)
                elif not isinstance(raw_categories, list):
                    raise InvalidManagedConfigurationError(
                        f"display_categories for {entity_id} must be a list"
                    )
                else:
                    category_reasons: list[str] = []
                    categories = self._validate_categories(
                        entity_id, raw_categories, category_reasons
                    )
                    if category_reasons:
                        raise InvalidManagedConfigurationError(
                            "; ".join(category_reasons)
                        )
                    metadata["display_categories"] = categories

            if metadata or entity_id in entity_config:
                entity_config[entity_id] = metadata

        # A missing explicit ID can disappear when the representation changes.
        # Keep an empty entity_config entry so it remains reviewable and reversible.
        if expose_new_entities != parsed.expose_new_entities:
            for entity_id in (
                parsed.configured_entity_ids - known_entity_ids - removed_entity_ids
            ):
                entity_config.setdefault(entity_id, {})

        represented = {
            entity_id
            for entity_id, is_exposed in exposure.items()
            if is_exposed != expose_new_entities
        }
        filter_text = self._render_filter(expose_new_entities, represented)
        entity_text = self._render_entity_config(entity_config)
        return filter_text, entity_text, dict(sorted(exposure.items())), entity_config

    @staticmethod
    def _render_filter(expose_new_entities: bool, entity_ids: set[str]) -> str:
        key = "exclude_entities" if expose_new_entities else "include_entities"
        marker = str(expose_new_entities).lower()
        data = {key: sorted(entity_ids)}
        return (
            "# Managed by Alexa Exposure Manager.\n"
            f"# alexa_exposure_manager: expose_new_entities={marker}\n"
            + yaml.dump(
                data,
                Dumper=_IndentedSafeDumper,
                allow_unicode=True,
                default_flow_style=False,
                sort_keys=False,
            )
        )

    def _render_entity_config(
        self, entity_config: Mapping[str, Mapping[str, Any]]
    ) -> str:
        if not entity_config:
            return "{}\n"
        rendered: dict[str, dict[str, Any]] = {}
        for entity_id in sorted(entity_config):
            source = entity_config[entity_id]
            metadata: dict[str, Any] = {}
            for key in ("name", "description"):
                if key in source:
                    metadata[key] = source[key]
            if categories := source.get("display_categories"):
                metadata["display_categories"] = (
                    list(categories) if self._display_category_lists else categories[0]
                )
            rendered[entity_id] = metadata
        return yaml.dump(
            rendered,
            Dumper=_IndentedSafeDumper,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
        )

    @staticmethod
    def _revision(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    @staticmethod
    def _check_revisions(
        parsed: _ParsedPair, expected_revision: str, expected_entities_revision: str
    ) -> None:
        changed: list[str] = []
        if parsed.revision != expected_revision:
            changed.append("filter")
        if parsed.entities_revision != expected_entities_revision:
            changed.append("entity configuration")
        if changed:
            raise RevisionConflictError(
                "The managed " + " and ".join(changed) + " changed; reload and retry"
            )

    def _backup_and_replace(self, filter_text: str, entity_text: str) -> None:
        self._backup_and_replace_bytes(filter_text.encode(), entity_text.encode())

    def _backup_and_replace_bytes(
        self, filter_bytes: bytes, entity_bytes: bytes
    ) -> None:
        old_filter, old_entities = self._read_bytes_pair()
        self._create_backup(old_filter, old_entities)
        try:
            self._replace_bytes_pair(filter_bytes, entity_bytes)
        except Exception:
            self._replace_bytes_pair(old_filter, old_entities)
            raise

    def _replace_bytes_pair(self, filter_bytes: bytes, entity_bytes: bytes) -> None:
        self._atomic_replace(self.filter_path, filter_bytes)
        self._atomic_replace(self.entity_config_path, entity_bytes)

    @staticmethod
    def _atomic_replace(path: Path, content: bytes) -> None:
        descriptor, temporary_name = tempfile.mkstemp(
            prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
        )
        temporary_path = Path(temporary_name)
        try:
            with os.fdopen(descriptor, "wb") as file_handle:
                file_handle.write(content)
                file_handle.flush()
                os.fsync(file_handle.fileno())
            os.replace(temporary_path, path)
            ManagedFileTransaction._fsync_directory(path.parent)
        finally:
            if temporary_path.exists():
                temporary_path.unlink()

    @staticmethod
    def _fsync_directory(path: Path) -> None:
        descriptor = os.open(path, os.O_RDONLY)
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)

    def _create_backup(self, filter_bytes: bytes, entity_bytes: bytes) -> None:
        self.backup_path.mkdir(mode=0o700, parents=True, exist_ok=True)
        now = datetime.now(UTC)
        backup_id = f"{now:%Y%m%dT%H%M%S.%fZ}-{time.time_ns()}"
        pair_path = self.backup_path / backup_id
        pair_path.mkdir(mode=0o700)
        self._write_backup_file(pair_path / FILTER_FILENAME, filter_bytes)
        self._write_backup_file(pair_path / ENTITY_CONFIG_FILENAME, entity_bytes)
        self._fsync_directory(pair_path)
        self._fsync_directory(self.backup_path)
        for stale in sorted(self.backup_path.iterdir(), reverse=True)[
            BACKUP_RETENTION:
        ]:
            if stale.is_dir():
                shutil.rmtree(stale)
        self._fsync_directory(self.backup_path)

    @staticmethod
    def _write_backup_file(path: Path, content: bytes) -> None:
        with path.open("xb") as file_handle:
            file_handle.write(content)
            file_handle.flush()
            os.fsync(file_handle.fileno())

    def _list_backups(self) -> list[dict[str, Any]]:
        if not self.backup_path.exists():
            return []
        result: list[dict[str, Any]] = []
        for pair_path in sorted(self.backup_path.iterdir(), reverse=True):
            if not pair_path.is_dir():
                continue
            filter_path = pair_path / FILTER_FILENAME
            entity_path = pair_path / ENTITY_CONFIG_FILENAME
            healthy = filter_path.is_file() and entity_path.is_file()
            item: dict[str, Any] = {
                "id": pair_path.name,
                "timestamp": pair_path.name.split("-", 1)[0],
                "healthy": healthy,
            }
            if healthy:
                item["revision"] = self._revision(filter_path.read_bytes())
                item["entities_revision"] = self._revision(entity_path.read_bytes())
            result.append(item)
        return result

    def _read_backup_pair(self, backup_id: str) -> tuple[bytes, bytes]:
        if not re.fullmatch(r"[0-9TZ.]+-[0-9]+", backup_id):
            raise BackupNotFoundError("The requested backup does not exist")
        pair_path = self.backup_path / backup_id
        filter_path = pair_path / FILTER_FILENAME
        entity_path = pair_path / ENTITY_CONFIG_FILENAME
        if not filter_path.is_file() or not entity_path.is_file():
            raise BackupNotFoundError("The requested backup pair is incomplete")
        return filter_path.read_bytes(), entity_path.read_bytes()
