from __future__ import annotations

import asyncio
import sys
from dataclasses import dataclass
from types import ModuleType, SimpleNamespace

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import Unauthorized

from custom_components.alexa_exposure_manager import async_setup
from custom_components.alexa_exposure_manager.compatibility import alexa_entity_support
from custom_components.alexa_exposure_manager.const import DOMAIN
from custom_components.alexa_exposure_manager.diagnostics import (
    build_redacted_diagnostics,
)
from custom_components.alexa_exposure_manager.websocket import (
    WS_COMMANDS,
    websocket_migration_preview,
    websocket_restart,
    websocket_status,
    websocket_support_export,
)

EXPECTED_COMMANDS = {
    "alexa_exposure_manager/status",
    "alexa_exposure_manager/entities",
    "alexa_exposure_manager/preview",
    "alexa_exposure_manager/save",
    "alexa_exposure_manager/migration/preview",
    "alexa_exposure_manager/migration/confirm",
    "alexa_exposure_manager/backups",
    "alexa_exposure_manager/restore",
    "alexa_exposure_manager/restart",
    "alexa_exposure_manager/diagnostics",
    "alexa_exposure_manager/support_export",
}


def test_alexa_support_uses_home_assistant_adapter_without_false_negative(
    monkeypatch,
) -> None:
    class Adapter:
        def __init__(self, hass, config, state) -> None:
            assert hass == "hass"
            assert config.entity_config == {}
            assert config.locale == "en-US"
            self.state = state

        def interfaces(self):
            return [object()]

        def default_display_categories(self):
            return ["LIGHT"]

    entities_module = ModuleType("homeassistant.components.alexa.entities")
    entities_module.ENTITY_ADAPTERS = {"light": Adapter}
    monkeypatch.setitem(
        sys.modules, "homeassistant.components.alexa.entities", entities_module
    )

    supported, reason, categories = alexa_entity_support(
        "hass",
        SimpleNamespace(domain="light", entity_id="light.kitchen"),
        {},
    )

    assert supported is True
    assert reason is None
    assert categories == ["LIGHT"]


@pytest.mark.asyncio
async def test_empty_inline_alexa_configuration_is_captured_for_migration() -> None:
    from custom_components.alexa_exposure_manager.runtime import (
        AlexaExposureManagerRuntime,
    )

    class Transaction:
        async def async_read(self):
            return {"revision": "filter-r1", "entities_revision": "entities-r1"}

    runtime = AlexaExposureManagerRuntime.__new__(AlexaExposureManagerRuntime)
    runtime.startup_alexa = {
        "filter": {},
        "entity_config": {},
        "filter_active": False,
        "entity_config_active": False,
        "legacy_source_available": True,
    }
    runtime.transaction = Transaction()
    runtime._state = {"migration_state": "not_started"}

    async def _async_save_state():
        return None

    runtime._async_save_state = _async_save_state

    await runtime._async_capture_legacy_snapshot()

    assert runtime._state["legacy_snapshot"]["filter"] == {}
    assert runtime._state["legacy_snapshot"]["entity_config"] == {}
    assert runtime._state["legacy_snapshot"]["managed_revisions"] == {
        "revision": "filter-r1",
        "entities_revision": "entities-r1",
    }


@pytest.mark.asyncio
async def test_empty_recreated_files_reopen_migration_for_inline_alexa_config(
    tmp_path, monkeypatch
) -> None:
    """A stale completed flag must not strand recovery after managed-file deletion."""
    from custom_components.alexa_exposure_manager.runtime import (
        AlexaExposureManagerRuntime,
    )

    (tmp_path / "configuration.yaml").write_text("alexa: !include alexa.yaml\n")
    (tmp_path / "alexa.yaml").write_text(
        "smart_home:\n"
        "  endpoint: https://api.amazonalexa.com/v3/events\n"
        "  filter:\n"
        "    include_entities:\n"
        "      - script.find_shield_remote\n"
    )
    hass = HomeAssistant(str(tmp_path))
    await async_setup(hass, {})
    (tmp_path / "alexa_exposure_filter.yaml").write_text("include_entities: []\n")
    (tmp_path / "alexa_entity_config.yaml").write_text("{}\n")

    async def valid_config(_hass):
        return None

    def entity_catalog(_hass, _entity_config):
        return [
            {
                "entity_id": "script.find_shield_remote",
                "supported": True,
                "missing": False,
                "default_exposed": True,
                "display_categories": ["ACTIVITY_TRIGGER"],
            }
        ]

    from custom_components.alexa_exposure_manager import compatibility

    monkeypatch.setattr(compatibility, "async_validate_full_config", valid_config)
    monkeypatch.setattr(compatibility, "entity_catalog", entity_catalog)

    runtime = AlexaExposureManagerRuntime(
        hass,
        SimpleNamespace(entry_id="entry-1"),
        hass.data[DOMAIN]["startup_alexa"],
    )
    await runtime._store.async_save(
        {
            "restart_required": False,
            "restart_revisions": None,
            "migration_state": "complete",
            "last_validation": None,
        }
    )

    await runtime.async_initialize()
    status = await runtime.async_status()
    preview = await runtime.async_migration_preview()
    result = await runtime.async_migration_confirm(
        {
            "token": preview["token"],
            "expected_revision": preview["revision"],
            "expected_entities_revision": preview["entities_revision"],
        }
    )
    await hass.async_stop(force=True)

    assert runtime.startup_alexa["legacy_source_available"] is True
    assert runtime._state["legacy_snapshot"]["filter"] == {
        "include_entities": ["script.find_shield_remote"]
    }
    assert status["configured"] is False
    assert status["migration_available"] is True
    assert preview["counts"]["exposed"] == 1
    assert "script.find_shield_remote" in preview["filter_yaml"]
    assert result["migration_state"] == "complete"
    assert (
        "script.find_shield_remote"
        in (tmp_path / "alexa_exposure_filter.yaml").read_text()
    )
    assert runtime._state["migration_source_fingerprint"]


@pytest.mark.asyncio
async def test_completed_empty_migration_does_not_reopen_on_every_restart() -> None:
    from custom_components.alexa_exposure_manager.runtime import (
        AlexaExposureManagerRuntime,
    )

    legacy_filter = {"include_entities": ["select.unsupported"]}

    class Transaction:
        async def async_read(self):
            return {
                "expose_new_entities": False,
                "exposure": {},
                "entity_config": {},
                "read_only": False,
            }

    runtime = AlexaExposureManagerRuntime.__new__(AlexaExposureManagerRuntime)
    runtime.startup_alexa = {
        "filter": legacy_filter,
        "entity_config": {},
        "filter_active": False,
        "legacy_source_available": True,
    }
    runtime.transaction = Transaction()
    runtime.created_files = {"filter": False, "entity_config": False}
    runtime._state = {
        "migration_state": "complete",
        "migration_source_fingerprint": runtime._legacy_source_fingerprint(
            legacy_filter, {}
        ),
    }

    await runtime._async_capture_legacy_snapshot()

    assert runtime._state["migration_state"] == "complete"
    assert "legacy_snapshot" not in runtime._state


@pytest.mark.asyncio
async def test_read_only_managed_files_are_not_treated_as_empty_recovery() -> None:
    from custom_components.alexa_exposure_manager.runtime import (
        AlexaExposureManagerRuntime,
    )

    class Transaction:
        last_validation = None

        async def async_read(self):
            return {
                "revision": "filter-r1",
                "entities_revision": "entities-r1",
                "expose_new_entities": False,
                "exposure": {},
                "entity_config": {},
                "read_only": True,
                "read_only_reasons": ["unsupported YAML"],
            }

    runtime = AlexaExposureManagerRuntime.__new__(AlexaExposureManagerRuntime)
    runtime.startup_alexa = {
        "filter": {"include_entities": ["light.kitchen"]},
        "entity_config": {},
        "filter_active": False,
        "entity_config_active": False,
        "legacy_source_available": True,
        "issues": [],
    }
    runtime.transaction = Transaction()
    runtime.created_files = {"filter": False, "entity_config": False}
    runtime._state = {
        "restart_required": False,
        "migration_state": "complete",
    }

    await runtime._async_capture_legacy_snapshot()
    status = await runtime.async_status()

    assert runtime._state["migration_state"] == "complete"
    assert status["managed_files"]["safe_defaults"] is False


@dataclass
class User:
    is_admin: bool
    id: str = "user-1"


@dataclass
class Connection:
    user: User

    def __post_init__(self) -> None:
        self.results = []
        self.errors = []

    def send_result(self, message_id, result=None) -> None:
        self.results.append((message_id, result))

    def send_error(self, message_id, code, message) -> None:
        self.errors.append((message_id, code, message))


class Hass:
    def __init__(self, runtime) -> None:
        self.data = {DOMAIN: {"runtime": {"entry-1": runtime}}}
        self.task = None

    def async_create_background_task(
        self, coroutine, _name, *, eager_start=False
    ) -> None:
        self.task = asyncio.create_task(coroutine)


async def call_command(command, runtime, message):
    hass = Hass(runtime)
    connection = Connection(User(is_admin=True))
    command(hass, connection, message)
    await hass.task
    return connection


def test_all_expected_websocket_commands_are_admin_only() -> None:
    assert {command._ws_command for command in WS_COMMANDS} == EXPECTED_COMMANDS

    connection = Connection(User(is_admin=False))
    for index, command in enumerate(WS_COMMANDS, start=1):
        with pytest.raises(Unauthorized):
            command(object(), connection, {"id": index, "type": command._ws_command})


def test_redacted_diagnostics_excludes_home_details_and_yaml() -> None:
    diagnostics = build_redacted_diagnostics(
        ha_version="2026.8.1",
        integration_version="0.1.0",
        status={
            "configured": True,
            "revision": "filter-revision",
            "entities_revision": "entities-revision",
            "restart_required": True,
            "last_validation": {
                "ok": False,
                "error": (
                    "Invalid /config/alexa_exposure_filter.yaml for light.kitchen"
                ),
                "rollback": "complete",
            },
        },
        entity_counts={"total": 4, "supported": 3, "missing": 1},
        backup_health={"count": 5, "healthy": 5},
        errors=["validation_failed"],
    )

    assert diagnostics["domain"] == DOMAIN
    assert diagnostics["revisions"] == {
        "filter": "filter-revision",
        "entity_config": "entities-revision",
    }
    serialized = repr(diagnostics)
    assert "light.kitchen" not in serialized
    assert "alexa_exposure_filter.yaml" not in serialized
    assert "include_entities" not in serialized
    assert "/config" not in serialized
    assert "light.kitchen" not in serialized


@pytest.mark.asyncio
async def test_status_command_returns_nested_instructions_without_secrets() -> None:
    class Transaction:
        last_validation = None

        async def async_read(self):
            return {
                "revision": "filter-r1",
                "entities_revision": "entities-r1",
                "expose_new_entities": False,
                "exposure": {},
                "entity_config": {},
                "read_only": False,
                "read_only_reasons": [],
            }

    from custom_components.alexa_exposure_manager.runtime import (
        AlexaExposureManagerRuntime,
    )

    runtime = AlexaExposureManagerRuntime.__new__(AlexaExposureManagerRuntime)
    runtime.startup_alexa = {
        "filter_active": True,
        "entity_config_active": True,
        "legacy_source_available": True,
        "filter": {"include_entities": ["light.secret_name"]},
        "entity_config": {},
        "client_secret": "must-not-leak",
        "issues": [],
    }
    runtime.transaction = Transaction()
    runtime.created_files = {"filter": False, "entity_config": False}
    runtime._state = {
        "restart_required": False,
        "migration_state": "not_started",
    }

    connection = await call_command(
        websocket_status,
        runtime,
        {"id": 1, "type": "alexa_exposure_manager/status"},
    )

    status = connection.results[0][1]
    assert status["include_instructions"] == {
        "configuration_yaml": "alexa: !include alexa.yaml",
        "alexa_yaml": (
            "smart_home:\n"
            "  filter: !include alexa_exposure_filter.yaml\n"
            "  entity_config: !include alexa_entity_config.yaml"
        ),
    }
    assert status["managed_files"]["safe_defaults"] is True
    assert status["migration_available"] is True
    assert "must-not-leak" not in repr(status)
    assert "light.secret_name" not in repr(status)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "parent_include",
    [
        "alexa: !include alexa.yaml\n",
        "alexa: !include my_alexa.yaml\n",
    ],
)
async def test_status_activation_comes_from_resolved_nested_includes(
    tmp_path, parent_include
) -> None:
    parent_name = parent_include.split("!include ", 1)[1].strip()
    (tmp_path / "configuration.yaml").write_text(parent_include)
    (tmp_path / parent_name).write_text(
        "smart_home:\n"
        "  client_secret: never-return-this\n"
        "  filter: !include alexa_exposure_filter.yaml\n"
        "  entity_config: !include alexa_entity_config.yaml\n"
    )
    (tmp_path / "alexa_exposure_filter.yaml").write_text(
        "include_entities:\n  - light.private_entity\n"
    )
    (tmp_path / "alexa_entity_config.yaml").write_text("{}\n")
    hass = HomeAssistant(str(tmp_path))
    await async_setup(hass, {})

    class Transaction:
        last_validation = None

        async def async_read(self):
            return {
                "revision": "filter-r1",
                "entities_revision": "entities-r1",
                "expose_new_entities": False,
                "read_only": False,
                "read_only_reasons": [],
            }

    from custom_components.alexa_exposure_manager.runtime import (
        AlexaExposureManagerRuntime,
    )

    runtime = AlexaExposureManagerRuntime.__new__(AlexaExposureManagerRuntime)
    runtime.startup_alexa = hass.data[DOMAIN]["startup_alexa"]
    runtime.transaction = Transaction()
    runtime.created_files = {"filter": False, "entity_config": False}
    runtime._state = {
        "restart_required": False,
        "migration_state": "not_started",
        "last_validation": None,
    }

    connection = await call_command(
        websocket_status,
        runtime,
        {"id": 6, "type": "alexa_exposure_manager/status"},
    )
    await hass.async_stop(force=True)

    status = connection.results[0][1]
    assert status["configured"] is True
    assert status["activation"] == {
        "filter": True,
        "entity_config": True,
        "issues": [],
    }
    assert "never-return-this" not in repr(status)
    assert "light.private_entity" not in repr(status)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "include_line",
    [
        '  filter: !include "alexa_exposure_filter.yaml"\n'
        '  entity_config: !include "alexa_entity_config.yaml"\n',
        "  filter: !include 'alexa_exposure_filter.yaml'\n"
        "  entity_config: !include 'alexa_entity_config.yaml'\n",
    ],
)
async def test_status_activation_accepts_quoted_include_forms(
    tmp_path, include_line
) -> None:
    (tmp_path / "configuration.yaml").write_text("alexa: !include alexa.yaml\n")
    (tmp_path / "alexa.yaml").write_text("smart_home:\n" + include_line)
    (tmp_path / "alexa_exposure_filter.yaml").write_text("include_entities: []\n")
    (tmp_path / "alexa_entity_config.yaml").write_text("{}\n")
    hass = HomeAssistant(str(tmp_path))
    await async_setup(hass, {})

    class Transaction:
        last_validation = None

        async def async_read(self):
            return {
                "revision": "filter-r1",
                "entities_revision": "entities-r1",
                "expose_new_entities": False,
                "read_only": False,
                "read_only_reasons": [],
            }

    from custom_components.alexa_exposure_manager.runtime import (
        AlexaExposureManagerRuntime,
    )

    runtime = AlexaExposureManagerRuntime.__new__(AlexaExposureManagerRuntime)
    runtime.startup_alexa = hass.data[DOMAIN]["startup_alexa"]
    runtime.transaction = Transaction()
    runtime.created_files = {"filter": False, "entity_config": False}
    runtime._state = {
        "restart_required": False,
        "migration_state": "not_started",
        "last_validation": None,
    }

    connection = await call_command(
        websocket_status,
        runtime,
        {"id": 8, "type": "alexa_exposure_manager/status"},
    )
    await hass.async_stop(force=True)

    status = connection.results[0][1]
    assert status["configured"] is True
    assert status["activation"] == {
        "filter": True,
        "entity_config": True,
        "issues": [],
    }


@pytest.mark.asyncio
async def test_status_activation_accepts_include_dir_merge_named(tmp_path) -> None:
    (tmp_path / "configuration.yaml").write_text("alexa: !include alexa.yaml\n")
    (tmp_path / "filter_parts").mkdir()
    (tmp_path / "entity_parts").mkdir()
    (tmp_path / "filter_parts" / "alexa_exposure_filter.yaml").write_text(
        "include_entities: []\n"
    )
    (tmp_path / "entity_parts" / "alexa_entity_config.yaml").write_text("{}\n")
    (tmp_path / "alexa.yaml").write_text(
        "smart_home:\n"
        "  filter: !include_dir_merge_named filter_parts\n"
        "  entity_config: !include_dir_merge_named entity_parts\n"
    )
    # Managed fixed paths under config_dir must still be the activation target.
    (tmp_path / "alexa_exposure_filter.yaml").write_text("include_entities: []\n")
    (tmp_path / "alexa_entity_config.yaml").write_text("{}\n")

    from custom_components.alexa_exposure_manager.compatibility import (
        _annotation_includes_managed_file,
    )

    alexa_path = tmp_path / "alexa.yaml"
    assert (
        _annotation_includes_managed_file(
            (str(alexa_path), 2),
            "alexa_exposure_filter.yaml",
            tmp_path,
        )
        is False
    )
    # Dir include is active only when the managed fixed path is inside that dir.
    (tmp_path / "managed_filters").mkdir()
    managed_filter = tmp_path / "managed_filters" / "alexa_exposure_filter.yaml"
    managed_filter.write_text("include_entities: []\n")
    parent = tmp_path / "parent_alexa.yaml"
    parent.write_text(
        "smart_home:\n  filter: !include_dir_merge_named managed_filters\n"
    )
    assert (
        _annotation_includes_managed_file(
            (str(parent), 2),
            "alexa_exposure_filter.yaml",
            tmp_path / "managed_filters",
        )
        is True
    )
    assert (
        _annotation_includes_managed_file(
            (str(parent), 2),
            "alexa_exposure_filter.yaml",
            tmp_path,
        )
        is False
    )


@pytest.mark.asyncio
async def test_status_activation_ignores_same_named_file_outside_config_dir(
    tmp_path,
) -> None:
    (tmp_path / "configuration.yaml").write_text("alexa: !include alexa.yaml\n")
    (tmp_path / "alexa.yaml").write_text(
        "smart_home:\n"
        "  filter: !include subdir/alexa_exposure_filter.yaml\n"
        "  entity_config: !include subdir/alexa_entity_config.yaml\n"
    )
    (tmp_path / "subdir").mkdir()
    (tmp_path / "subdir" / "alexa_exposure_filter.yaml").write_text(
        "include_entities:\n  - light.private_entity\n"
    )
    (tmp_path / "subdir" / "alexa_entity_config.yaml").write_text("{}\n")
    hass = HomeAssistant(str(tmp_path))
    await async_setup(hass, {})

    class Transaction:
        last_validation = None

        async def async_read(self):
            return {
                "revision": "filter-r1",
                "entities_revision": "entities-r1",
                "expose_new_entities": False,
                "read_only": False,
                "read_only_reasons": [],
            }

    from custom_components.alexa_exposure_manager.runtime import (
        AlexaExposureManagerRuntime,
    )

    runtime = AlexaExposureManagerRuntime.__new__(AlexaExposureManagerRuntime)
    runtime.startup_alexa = hass.data[DOMAIN]["startup_alexa"]
    runtime.transaction = Transaction()
    runtime.created_files = {"filter": False, "entity_config": False}
    runtime._state = {
        "restart_required": False,
        "migration_state": "not_started",
        "last_validation": None,
    }

    connection = await call_command(
        websocket_status,
        runtime,
        {"id": 7, "type": "alexa_exposure_manager/status"},
    )
    await hass.async_stop(force=True)

    status = connection.results[0][1]
    assert status["configured"] is False
    assert status["activation"] == {
        "filter": False,
        "entity_config": False,
        "issues": [
            ("alexa.smart_home.filter is not loaded from alexa_exposure_filter.yaml"),
            (
                "alexa.smart_home.entity_config is not loaded from "
                "alexa_entity_config.yaml"
            ),
        ],
    }


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("legacy_filter", "expected_counts"),
    [
        ({}, {"exposed": 2, "hidden": 0, "unsupported": 0, "missing": 0}),
        (
            {
                "include_domains": ["light"],
                "exclude_entities": ["light.secret"],
            },
            {"exposed": 1, "hidden": 1, "unsupported": 0, "missing": 0},
        ),
        (
            {
                "include_entities": ["light.secret"],
                "exclude_domains": ["light"],
            },
            {"exposed": 1, "hidden": 1, "unsupported": 0, "missing": 0},
        ),
        (
            {"include_entity_globs": ["light.*"], "exclude_entities": ["light.secret"]},
            {"exposed": 1, "hidden": 1, "unsupported": 0, "missing": 0},
        ),
        (
            {"include_entities": ["light.public"]},
            {"exposed": 1, "hidden": 1, "unsupported": 0, "missing": 0},
        ),
        (
            {"exclude_entities": ["light.secret"]},
            {"exposed": 1, "hidden": 1, "unsupported": 0, "missing": 0},
        ),
    ],
)
async def test_migration_preview_uses_home_assistant_filter_precedence(
    legacy_filter, expected_counts
) -> None:
    class Transaction:
        async def async_preview(self, **_kwargs):
            return {
                "revision": "filter-r1",
                "entities_revision": "entities-r1",
                "filter_yaml": "preview-filter",
                "entity_config_yaml": "preview-entities",
            }

    from custom_components.alexa_exposure_manager.runtime import (
        AlexaExposureManagerRuntime,
    )

    runtime = AlexaExposureManagerRuntime.__new__(AlexaExposureManagerRuntime)
    runtime.startup_alexa = {"filter": legacy_filter, "entity_config": {}}
    runtime.transaction = Transaction()
    runtime._migration_previews = {}
    runtime._state = {
        "restart_required": False,
        "migration_state": "not_started",
    }

    async def _async_save_state():
        return None

    runtime._async_save_state = _async_save_state

    async def async_entities():
        return {
            "revision": "filter-r1",
            "entities_revision": "entities-r1",
            "entities": [
                {
                    "entity_id": "light.public",
                    "supported": True,
                    "missing": False,
                    "default_exposed": True,
                },
                {
                    "entity_id": "light.secret",
                    "supported": True,
                    "missing": False,
                    "default_exposed": True,
                },
            ],
        }

    runtime.async_entities = async_entities
    connection = await call_command(
        websocket_migration_preview,
        runtime,
        {"id": 2, "type": "alexa_exposure_manager/migration/preview"},
    )

    assert connection.results[0][1]["counts"] == expected_counts


@pytest.mark.asyncio
async def test_support_export_requires_confirmation_before_returning_full_yaml() -> (
    None
):
    class Transaction:
        async def async_support_export(self):
            return {"alexa_exposure_filter.yaml": "include_entities: []\n"}

    from custom_components.alexa_exposure_manager.runtime import (
        AlexaExposureManagerRuntime,
    )

    runtime = AlexaExposureManagerRuntime.__new__(AlexaExposureManagerRuntime)
    runtime.transaction = Transaction()
    denied = await call_command(
        websocket_support_export,
        runtime,
        {
            "id": 3,
            "type": "alexa_exposure_manager/support_export",
            "confirmed": False,
        },
    )
    allowed = await call_command(
        websocket_support_export,
        runtime,
        {
            "id": 4,
            "type": "alexa_exposure_manager/support_export",
            "confirmed": True,
        },
    )

    assert denied.errors[0][1] == "invalid_configuration"
    assert allowed.results[0][1]["files"] == {
        "alexa_exposure_filter.yaml": "include_entities: []\n"
    }


@pytest.mark.asyncio
async def test_restart_command_passes_requesting_admin_context() -> None:
    calls = []

    class Services:
        async def async_call(self, domain, service, data, **kwargs):
            calls.append((domain, service, data, kwargs))

    from custom_components.alexa_exposure_manager.runtime import (
        AlexaExposureManagerRuntime,
    )

    runtime = AlexaExposureManagerRuntime.__new__(AlexaExposureManagerRuntime)
    runtime.hass = SimpleNamespace(services=Services())
    connection = await call_command(
        websocket_restart,
        runtime,
        {
            "id": 5,
            "type": "alexa_exposure_manager/restart",
            "confirmed": True,
        },
    )

    assert connection.results == [(5, {"requested": True})]
    assert calls[0][0:3] == ("homeassistant", "restart", {})
    assert calls[0][3]["context"].user_id == "user-1"


@pytest.mark.asyncio
async def test_empty_filter_migration_uses_default_exposed_semantics() -> None:
    class Transaction:
        async def async_preview(self, **_kwargs):
            return {
                "revision": "filter-r1",
                "entities_revision": "entities-r1",
                "filter_yaml": "preview-filter",
                "entity_config_yaml": "preview-entities",
            }

    from custom_components.alexa_exposure_manager.runtime import (
        AlexaExposureManagerRuntime,
    )

    runtime = AlexaExposureManagerRuntime.__new__(AlexaExposureManagerRuntime)
    runtime.startup_alexa = {"filter": {}, "entity_config": {}}
    runtime.transaction = Transaction()
    runtime._migration_previews = {}
    runtime._state = {
        "restart_required": False,
        "migration_state": "not_started",
    }

    async def _async_save_state():
        return None

    runtime._async_save_state = _async_save_state

    async def async_entities():
        return {
            "revision": "filter-r1",
            "entities_revision": "entities-r1",
            "entities": [
                {
                    "entity_id": "light.public",
                    "supported": True,
                    "missing": False,
                    "default_exposed": True,
                },
                {
                    "entity_id": "sensor.diagnostics",
                    "supported": True,
                    "missing": False,
                    "default_exposed": False,
                },
            ],
        }

    runtime.async_entities = async_entities
    connection = await call_command(
        websocket_migration_preview,
        runtime,
        {"id": 7, "type": "alexa_exposure_manager/migration/preview"},
    )

    assert connection.results[0][1]["counts"] == {
        "exposed": 1,
        "hidden": 1,
        "unsupported": 0,
        "missing": 0,
    }


@pytest.mark.asyncio
async def test_migration_does_not_propose_alexa_unsupported_entities() -> None:
    """Alexa can never discover an unsupported entity, and a normal save rejects it."""

    class Transaction:
        async def async_preview(self, **kwargs):
            self.proposed = kwargs["entities"]
            return {
                "revision": "filter-r1",
                "entities_revision": "entities-r1",
                "filter_yaml": "preview-filter",
                "entity_config_yaml": "preview-entities",
            }

    from custom_components.alexa_exposure_manager.runtime import (
        AlexaExposureManagerRuntime,
    )

    runtime = AlexaExposureManagerRuntime.__new__(AlexaExposureManagerRuntime)
    runtime.startup_alexa = {
        "filter": {"exclude_domains": ["sensor"]},
        "entity_config": {},
    }
    transaction = Transaction()
    runtime.transaction = transaction
    runtime._migration_previews = {}
    runtime._state = {"restart_required": False, "migration_state": "not_started"}

    async def _async_save_state():
        return None

    runtime._async_save_state = _async_save_state

    async def async_entities():
        return {
            "revision": "filter-r1",
            "entities_revision": "entities-r1",
            "entities": [
                {
                    "entity_id": "light.public",
                    "supported": True,
                    "missing": False,
                    "default_exposed": True,
                },
                {
                    "entity_id": "select.thermostat_mode",
                    "supported": False,
                    "missing": False,
                    "default_exposed": True,
                },
            ],
        }

    runtime.async_entities = async_entities
    connection = await call_command(
        websocket_migration_preview,
        runtime,
        {"id": 9, "type": "alexa_exposure_manager/migration/preview"},
    )

    counts = connection.results[0][1]["counts"]
    assert counts["unsupported"] == 1
    proposed = {entity["entity_id"] for entity in transaction.proposed}
    assert "select.thermostat_mode" not in proposed
    assert "light.public" in proposed


def _migration_runtime(startup_alexa, catalog, state=None):
    """Build a runtime with stubbed storage for migration preview tests."""
    from custom_components.alexa_exposure_manager.runtime import (
        AlexaExposureManagerRuntime,
    )

    class Transaction:
        async def async_preview(self, **kwargs):
            self.proposed = kwargs["entities"]
            self.expose_new_entities = kwargs["expose_new_entities"]
            return {
                "revision": "filter-r1",
                "entities_revision": "entities-r1",
                "filter_yaml": "preview-filter",
                "entity_config_yaml": "preview-entities",
            }

    runtime = AlexaExposureManagerRuntime.__new__(AlexaExposureManagerRuntime)
    runtime.startup_alexa = startup_alexa
    runtime.transaction = Transaction()
    runtime._migration_previews = {}
    runtime._state = state or {
        "restart_required": False,
        "migration_state": "not_started",
    }

    async def _async_save_state():
        return None

    async def async_entities():
        return {
            "revision": "filter-r1",
            "entities_revision": "entities-r1",
            "entities": catalog,
        }

    runtime._async_save_state = _async_save_state
    runtime.async_entities = async_entities
    return runtime


@pytest.mark.asyncio
async def test_missing_entity_defaults_to_exposed_under_an_empty_legacy_filter() -> (
    None
):
    """Mirror homeassistant.components.alexa.smart_home.AlexaConfig.should_expose.

    With an empty filter HA falls back to the entity registry, and an entity with
    no registry entry yields ``auxiliary_entity = False`` -> exposed. A missing ID
    has no registry entry, so migration must treat it as exposed.
    """
    runtime = _migration_runtime(
        {"filter": {}, "entity_config": {"light.removed_last_year": {"name": "Old"}}},
        [
            {
                "entity_id": "light.live",
                "supported": True,
                "missing": False,
                "default_exposed": True,
            }
        ],
    )

    connection = await call_command(
        websocket_migration_preview,
        runtime,
        {"id": 20, "type": "alexa_exposure_manager/migration/preview"},
    )

    assert connection.results[0][1]["counts"]["missing"] == 1
    proposed = {e["entity_id"]: e["exposed"] for e in runtime.transaction.proposed}
    assert proposed["light.removed_last_year"] is True


@pytest.mark.asyncio
async def test_migration_reads_the_pre_activation_snapshot_not_the_managed_file() -> (
    None
):
    """After activation the live filter IS the managed file; do not read it."""
    runtime = _migration_runtime(
        {
            "filter": {"include_entities": []},
            "entity_config": {},
            "filter_active": True,
            "entity_config_active": True,
        },
        [
            {
                "entity_id": "light.kept",
                "supported": True,
                "missing": False,
                "default_exposed": True,
            },
            {
                "entity_id": "light.dropped",
                "supported": True,
                "missing": False,
                "default_exposed": True,
            },
        ],
        state={
            "restart_required": False,
            "migration_state": "not_started",
            "legacy_snapshot": {
                "filter": {"include_entities": ["light.kept"]},
                "entity_config": {"light.kept": {"name": "Kept"}},
                "captured_at": "2026-08-09T10:00:00+00:00",
            },
        },
    )

    connection = await call_command(
        websocket_migration_preview,
        runtime,
        {"id": 21, "type": "alexa_exposure_manager/migration/preview"},
    )

    result = connection.results[0][1]
    assert result["counts"] == {
        "exposed": 1,
        "hidden": 1,
        "unsupported": 0,
        "missing": 0,
    }
    assert result["legacy_source"]["from_snapshot"] is True
    assert result["legacy_source"]["captured_at"] == "2026-08-09T10:00:00+00:00"
    proposed = {e["entity_id"]: e["exposed"] for e in runtime.transaction.proposed}
    assert proposed == {"light.kept": True, "light.dropped": False}


@pytest.mark.asyncio
async def test_migration_refuses_managed_files_without_a_legacy_snapshot() -> None:
    runtime = _migration_runtime(
        {
            "filter": {"include_entities": []},
            "entity_config": {},
            "filter_active": True,
            "entity_config_active": True,
            "legacy_source_available": False,
        },
        [],
    )

    connection = await call_command(
        websocket_migration_preview,
        runtime,
        {"id": 23, "type": "alexa_exposure_manager/migration/preview"},
    )

    assert connection.results == []
    assert connection.errors[0][1] == "invalid_configuration"
    assert "No previous Alexa configuration was captured" in connection.errors[0][2]


@pytest.mark.asyncio
async def test_migration_refuses_a_snapshot_older_than_the_managed_files() -> None:
    """Managed edits made after capture would be overwritten by a stale import."""
    runtime = _migration_runtime(
        {
            "filter": {"include_entities": []},
            "entity_config": {},
            "filter_active": True,
            "entity_config_active": True,
        },
        [
            {
                "entity_id": "light.kept",
                "supported": True,
                "missing": False,
                "default_exposed": True,
            }
        ],
        state={
            "restart_required": False,
            "migration_state": "not_started",
            "legacy_snapshot": {
                "filter": {"include_entities": ["light.kept"]},
                "entity_config": {},
                "captured_at": "2026-08-09T10:00:00+00:00",
                "managed_revisions": {
                    "revision": "filter-r0",
                    "entities_revision": "entities-r0",
                },
            },
        },
    )

    connection = await call_command(
        websocket_migration_preview,
        runtime,
        {"id": 22, "type": "alexa_exposure_manager/migration/preview"},
    )

    assert connection.results == []
    assert connection.errors[0][1] == "invalid_configuration"
    assert "2026-08-09" in connection.errors[0][2]
