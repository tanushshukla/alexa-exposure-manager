"""Alexa Exposure Manager integration."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from homeassistant.helpers.typing import ConfigType

from . import compatibility
from .const import (
    DATA_PANEL_REGISTERED,
    DATA_RUNTIME,
    DATA_STARTUP_ALEXA,
    DATA_STATIC_REGISTERED,
    DATA_WEBSOCKET_REGISTERED,
    DOMAIN,
    PANEL_COMPONENT,
    PANEL_URL,
    STATIC_URL,
)

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Capture a safe startup view of the resolved Alexa configuration."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    domain_data[DATA_STARTUP_ALEXA] = await compatibility.async_resolved_alexa_config(
        hass
    )
    return True


async def async_setup_entry(hass: HomeAssistant, entry) -> bool:
    """Set up the manager runtime, static asset, panel, and WebSocket API."""
    from homeassistant.components import panel_custom
    from homeassistant.components.http import StaticPathConfig

    from .runtime import AlexaExposureManagerRuntime
    from .websocket import async_register as async_register_websocket

    domain_data = hass.data.setdefault(DOMAIN, {})
    startup_alexa = domain_data.get(
        DATA_STARTUP_ALEXA,
        {
            "filter": {},
            "entity_config": {},
            "filter_active": False,
            "entity_config_active": False,
            "issues": ["Alexa configuration was not available during startup"],
        },
    )
    runtime = AlexaExposureManagerRuntime(hass, entry, startup_alexa)
    await runtime.async_initialize()
    domain_data.setdefault(DATA_RUNTIME, {})[entry.entry_id] = runtime

    if not domain_data.get(DATA_STATIC_REGISTERED):
        frontend_path = Path(__file__).parent / "frontend" / "entrypoint.js"
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_URL, str(frontend_path), True)]
        )
        domain_data[DATA_STATIC_REGISTERED] = True
    if not domain_data.get(DATA_PANEL_REGISTERED):
        await panel_custom.async_register_panel(
            hass,
            frontend_url_path=PANEL_URL,
            webcomponent_name=PANEL_COMPONENT,
            sidebar_title="Alexa Exposure Manager",
            sidebar_icon="mdi:amazon-alexa",
            module_url=STATIC_URL,
            require_admin=True,
            config_panel_domain=DOMAIN,
        )
        domain_data[DATA_PANEL_REGISTERED] = True
    if not domain_data.get(DATA_WEBSOCKET_REGISTERED):
        async_register_websocket(hass)
        domain_data[DATA_WEBSOCKET_REGISTERED] = True
    return True


async def async_unload_entry(hass: HomeAssistant, entry) -> bool:
    """Unload the single config entry."""
    from homeassistant.components import frontend

    domain_data = hass.data.get(DOMAIN, {})
    runtimes = domain_data.get(DATA_RUNTIME, {})
    runtimes.pop(entry.entry_id, None)
    frontend.async_remove_panel(hass, PANEL_URL, warn_if_unknown=False)
    domain_data[DATA_PANEL_REGISTERED] = False
    return True
