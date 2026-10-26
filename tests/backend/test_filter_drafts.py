"""Public transaction seam for native rule drafts."""

import asyncio
from types import SimpleNamespace

import pytest
import yaml

from custom_components.alexa_exposure_manager.managed_files import (
    InvalidManagedConfigurationError,
    ManagedFileTransaction,
    RevisionConflictError,
)
from custom_components.alexa_exposure_manager.runtime import AlexaExposureManagerRuntime


async def execute(func, *args):
    return await asyncio.to_thread(func, *args)


async def valid():
    return None


@pytest.mark.asyncio
async def test_use_rules_removes_both_explicit_lists_but_preserves_metadata(
    runtime, hass
):
    hass.states.async_set("light.room", "on")
    rules = {
        "include_domains": ["light"],
        "include_entities": ["light.room"],
        "exclude_entities": ["light.room", "light.room"],
    }
    preview = await runtime.async_preview(
        {
            "expose_new_entities": False,
            "filter_config": rules,
            "entities": [
                {"entity_id": "light.room", "use_rules": True, "name": "Room"}
            ],
        }
    )
    assert preview["filter"]["include_entities"] == []
    assert preview["filter"]["exclude_entities"] == []
    assert preview["entity_config"]["light.room"] == {"name": "Room"}
    assert preview["exposure"]["light.room"] is True
    assert preview["reasons"]["light.room"] == "Included by domain: light"


@pytest.mark.parametrize(
    ("rules", "expected"),
    [
        (
            {"include_domains": ["light"], "exclude_entities": ["light.room"]},
            "Explicitly excluded",
        ),
        (
            {"include_entity_globs": ["light.*"], "exclude_entity_globs": ["*.room"]},
            "Included by glob: light.*",
        ),
        (
            {"exclude_domains": ["light"], "include_entities": ["light.room"]},
            "Explicitly included",
        ),
        ({"include_entities": ["switch.other"]}, "Not matched by include rules"),
        ({"exclude_domains": ["switch"]}, "Included by default (no exclusion matched)"),
    ],
)
async def test_preview_explains_native_precedence(runtime, hass, rules, expected):
    hass.states.async_set("light.room", "on")
    preview = await runtime.async_preview(
        {"expose_new_entities": False, "filter_config": rules}
    )
    assert preview["reasons"]["light.room"] == expected


@pytest.fixture
async def runtime(hass, tmp_path):
    hass.config.config_dir = str(tmp_path)
    runtime = AlexaExposureManagerRuntime(
        hass,
        SimpleNamespace(entry_id="rules-test"),
        {"filter_active": True, "entity_config_active": True},
    )
    runtime.transaction = ManagedFileTransaction(tmp_path, execute, valid)
    await runtime.async_initialize()
    return runtime


@pytest.mark.asyncio
async def test_runtime_previews_native_impact_and_registry_defaults(runtime, hass):
    hass.states.async_set("light.room", "on")
    hass.states.async_set("fan.bedroom", "off")
    preview = await runtime.async_preview(
        {
            "expose_new_entities": False,
            "filter_config": {"include_domains": ["light"]},
        }
    )
    assert preview["impact"] == {"exposed": ["light.room"], "hidden": []}
    assert "future" in preview["future_behavior"].lower()
    empty = await runtime.async_preview(
        {"expose_new_entities": False, "filter_config": {}}
    )
    assert empty["strategy"] == "registry_default"
    assert empty["exposure"]["fan.bedroom"] is True
    assert "registry-default" in empty["future_behavior"]


@pytest.mark.asyncio
async def test_native_draft_rejects_invalid_sections_and_stale_revisions(tmp_path):
    managed = ManagedFileTransaction(tmp_path, execute, valid)
    await managed.async_initialize()
    snapshot = await managed.async_read()
    for rules in ({"regex": [".*"]}, {"include_domains": ["bad.domain"]}):
        with pytest.raises(InvalidManagedConfigurationError):
            await managed.async_preview(
                expose_new_entities=False,
                entities=[],
                known_entity_ids=[],
                filter_config=rules,
            )
    with pytest.raises(RevisionConflictError):
        await managed.async_save(
            expected_revision="stale",
            expected_entities_revision=snapshot["entities_revision"],
            expose_new_entities=False,
            entities=[],
            known_entity_ids=[],
            filter_config={"include_domains": ["light"]},
        )


@pytest.mark.asyncio
async def test_native_filter_draft_previews_and_saves_with_metadata(tmp_path):
    managed = ManagedFileTransaction(tmp_path, execute, valid)
    await managed.async_initialize()
    before = await managed.async_read()
    rules = {
        "include_entities": ["script.voice"],
        "include_domains": ["light"],
        "include_entity_globs": ["switch.voice_*"],
        "exclude_entities": ["light.secret"],
        "exclude_domains": ["sensor"],
        "exclude_entity_globs": ["switch.*_child_lock", "switch.mac_mini"],
    }
    arguments = {
        "expose_new_entities": False,
        "entities": [{"entity_id": "light.room", "name": "Room"}],
        "known_entity_ids": {
            "light.room",
            "light.secret",
            "switch.voice_tv",
            "sensor.rate",
        },
        "filter_config": rules,
    }
    preview = await managed.async_preview(**arguments)
    assert preview["filter"] == rules
    assert preview["exposure"] == {
        "light.room": True,
        "light.secret": False,
        "script.voice": True,
        "sensor.rate": False,
        "switch.voice_tv": True,
    }
    assert (await managed.async_read())["revision"] == before["revision"]
    saved = await managed.async_save(
        expected_revision=before["revision"],
        expected_entities_revision=before["entities_revision"],
        **arguments,
    )
    assert saved["filter"] == rules
    assert yaml.safe_load((tmp_path / "alexa_entity_config.yaml").read_text()) == {
        "light.room": {"name": "Room"}
    }
    assert len(await managed.async_list_backups()) == 1
