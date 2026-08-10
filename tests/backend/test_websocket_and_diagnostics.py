from __future__ import annotations

import asyncio
from dataclasses import dataclass
from types import SimpleNamespace

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import Unauthorized

from custom_components.alexa_exposure_manager import async_setup
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
    assert "must-not-leak" not in repr(status)
    assert "light.secret_name" not in repr(status)


@pytest.mark.asyncio
async def test_status_activation_comes_from_resolved_nested_includes(
    tmp_path,
) -> None:
    (tmp_path / "configuration.yaml").write_text("alexa: !include alexa.yaml\n")
    (tmp_path / "alexa.yaml").write_text(
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

    async def async_entities():
        return {
            "revision": "filter-r1",
            "entities_revision": "entities-r1",
            "entities": [
                {
                    "entity_id": "light.public",
                    "supported": True,
                    "missing": False,
                },
                {
                    "entity_id": "light.secret",
                    "supported": True,
                    "missing": False,
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
