from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from custom_components.alexa_exposure_manager import async_setup_entry
from custom_components.alexa_exposure_manager.config_flow import (
    AlexaExposureManagerConfigFlow,
)
from custom_components.alexa_exposure_manager.const import DOMAIN, VERSION

ROOT = Path(__file__).parents[2]


def test_manifest_declares_installable_single_config_flow_integration() -> None:
    manifest = json.loads(
        (ROOT / "custom_components/alexa_exposure_manager/manifest.json").read_text()
    )

    assert manifest["domain"] == "alexa_exposure_manager"
    assert manifest["name"] == "Alexa Exposure Manager"
    assert manifest["config_flow"] is True
    # HACS installs from manifest.json while diagnostics report const.VERSION;
    # a release that bumps one and not the other ships mismatched versions.
    assert manifest["version"] == VERSION
    assert "homeassistant" not in manifest
    assert manifest["codeowners"] == ["@tanushshukla"]


@pytest.mark.asyncio
async def test_config_flow_creates_entry_without_credentials(monkeypatch) -> None:
    flow = AlexaExposureManagerConfigFlow()
    monkeypatch.setattr(flow, "_async_current_entries", lambda: [])

    form = await flow.async_step_user()
    result = await flow.async_step_user({})

    assert form["type"] == "form"
    assert result["type"] == "create_entry"
    assert result["title"] == "Alexa Exposure Manager"
    assert result["data"] == {}


@pytest.mark.asyncio
async def test_config_flow_rejects_second_instance(monkeypatch) -> None:
    flow = AlexaExposureManagerConfigFlow()
    monkeypatch.setattr(flow, "_async_current_entries", lambda: [object()])

    result = await flow.async_step_user()

    assert result == {
        "type": "abort",
        "flow_id": None,
        "handler": None,
        "reason": "single_instance_allowed",
        "description_placeholders": None,
    }


@pytest.mark.asyncio
async def test_setup_entry_registers_admin_panel_and_expected_static_entrypoint(
    tmp_path: Path, monkeypatch
) -> None:
    import homeassistant.components

    calls = {"static": [], "panel": [], "websocket": 0}

    class FakeRuntime:
        def __init__(self, hass, entry, startup_alexa) -> None:
            self.initialized = False

        async def async_initialize(self) -> None:
            self.initialized = True

    async def register_panel(hass, **kwargs) -> None:
        calls["panel"].append(kwargs)

    class Http:
        async def async_register_static_paths(self, paths) -> None:
            calls["static"].extend(paths)

    def register_websocket(hass) -> None:
        calls["websocket"] += 1

    from custom_components.alexa_exposure_manager import runtime, websocket

    monkeypatch.setattr(runtime, "AlexaExposureManagerRuntime", FakeRuntime)
    monkeypatch.setattr(websocket, "async_register", register_websocket)
    monkeypatch.setattr(
        homeassistant.components,
        "panel_custom",
        SimpleNamespace(async_register_panel=register_panel),
        raising=False,
    )
    hass = SimpleNamespace(
        data={
            DOMAIN: {
                "startup_alexa": {
                    "filter": {},
                    "entity_config": {},
                    "filter_active": False,
                    "entity_config_active": False,
                    "issues": [],
                }
            }
        },
        config=SimpleNamespace(config_dir=str(tmp_path)),
        http=Http(),
    )
    entry = SimpleNamespace(entry_id="entry-1")

    assert await async_setup_entry(hass, entry) is True

    assert calls["websocket"] == 1
    assert len(calls["static"]) == 1
    assert calls["static"][0].url_path == "/alexa_exposure_manager/entrypoint.js"
    assert calls["static"][0].path.endswith(
        "custom_components/alexa_exposure_manager/frontend/entrypoint.js"
    )
    assert calls["panel"] == [
        {
            "frontend_url_path": "alexa-exposure-manager",
            "webcomponent_name": "alexa-exposure-manager-panel",
            "sidebar_title": "Alexa Exposure Manager",
            "sidebar_icon": "mdi:amazon-alexa",
            "module_url": "/alexa_exposure_manager/entrypoint.js",
            "require_admin": True,
            "config_panel_domain": DOMAIN,
        }
    ]
