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


async def test_combined_cleanup_counts_overlapping_findings_once(runtime):
    message = {
        "expose_new_entities": False,
        "filter_config": {"include_entities": ["light.gone", "light.gone"]},
        "entities": [{"entity_id": "light.gone", "name": "Old"}],
        "cleanup_checks": ["duplicates", "missing"],
    }
    result = await runtime.async_preview(message)
    assert len(result["cleanup_findings"]) == 2
    assert result["cleanup_summary"] == {"findings": 2, "affected_entities": 1}
    result = await runtime.async_preview(
        {
            **message,
            "cleanup_selected": [item["id"] for item in result["cleanup_findings"]],
        }
    )
    assert result["filter"]["include_entities"] == []
    assert result["entity_config"] == {}
    partial = await runtime.async_preview(
        {**message, "cleanup_selected": ["duplicate:include_entities:light.gone"]}
    )
    assert partial["filter"]["include_entities"] == ["light.gone"]
    assert partial["entity_config"]["light.gone"] == {"name": "Old"}


async def test_metadata_only_missing_reference_is_found(runtime):
    preview = await runtime.async_preview(
        {
            "expose_new_entities": False,
            "filter_config": {},
            "entities": [{"entity_id": "light.metadata_only", "name": "Old"}],
            "cleanup_checks": ["missing"],
        }
    )
    assert [item["value"] for item in preview["cleanup_findings"]] == [
        "light.metadata_only"
    ]


async def test_cleanup_reappearing_during_validation_rolls_back(
    runtime, hass, tmp_path
):
    from custom_components.alexa_exposure_manager.managed_files import (
        ValidationFailedError,
    )

    before = await runtime.transaction.async_read()

    async def reappear():
        hass.states.async_set("light.gone", "on")
        return None

    runtime.transaction = ManagedFileTransaction(tmp_path, execute, reappear)
    with pytest.raises(ValidationFailedError, match="reappeared"):
        await runtime.async_save(
            {
                "expose_new_entities": False,
                "filter_config": {},
                "cleanup_missing": ["light.gone"],
                "expected_revision": before["revision"],
                "expected_entities_revision": before["entities_revision"],
            }
        )
    assert (await runtime.transaction.async_read())["revision"] == before["revision"]


async def test_missing_cleanup_preserves_registry_and_states_and_removes_metadata(
    runtime, hass
):
    from homeassistant.helpers import entity_registry as er

    registry = er.async_get(hass)
    registered = registry.async_get_or_create(
        "light", "test", "disabled", suggested_object_id="disabled"
    )
    hass.states.async_set("light.state_only", "unavailable")
    rules = {
        "include_entities": [registered.entity_id, "light.state_only", "light.gone"],
        "exclude_entities": ["light.gone"],
        "include_entity_globs": ["light.gone*"],
    }
    message = {
        "expose_new_entities": False,
        "filter_config": rules,
        "entities": [{"entity_id": "light.gone", "name": "Gone"}],
        "cleanup_checks": ["missing"],
    }
    result = await runtime.async_preview(message)
    assert [finding["value"] for finding in result["cleanup_findings"]] == [
        "light.gone"
    ]
    result = await runtime.async_preview(
        {**message, "cleanup_selected": ["missing:light.gone"]}
    )
    assert "light.gone" not in result["filter"]["include_entities"]
    assert result["filter"]["exclude_entities"] == []
    assert result["filter"]["include_entity_globs"] == ["light.gone*"]
    assert "light.gone" not in result["entity_config"]
    assert result["cleanup_missing"] == ["light.gone"]
    catalog = await runtime.async_entities()
    assert not next(
        entity
        for entity in catalog["entities"]
        if entity["entity_id"] == registered.entity_id
    )["missing"]


async def test_missing_cleanup_blocks_startup_and_reappearing_entity(runtime, hass):
    from homeassistant.core import CoreState

    message = {
        "expose_new_entities": False,
        "filter_config": {"include_entities": ["light.gone"]},
        "cleanup_checks": ["missing"],
    }
    hass.set_state(CoreState.starting)
    with pytest.raises(InvalidManagedConfigurationError, match="inventory"):
        await runtime.async_preview(message)
    hass.set_state(CoreState.running)
    before = await runtime.transaction.async_read()
    hass.states.async_set("light.gone", "on")
    with pytest.raises(InvalidManagedConfigurationError, match="reappeared"):
        await runtime.async_save(
            {
                "expose_new_entities": False,
                "filter_config": {},
                "cleanup_missing": ["light.gone"],
                "expected_revision": before["revision"],
                "expected_entities_revision": before["entities_revision"],
            }
        )
    assert (await runtime.transaction.async_read())["revision"] == before["revision"]
    assert await runtime.transaction.async_list_backups() == []


async def test_duplicate_cleanup_is_selective_and_does_not_write(runtime):
    before = await runtime.transaction.async_read()
    rules = {
        "include_domains": ["light", "switch", "light", "light"],
        "exclude_entity_globs": ["switch.*", "switch.*", "switch.room"],
    }
    message = {
        "expose_new_entities": False,
        "filter_config": rules,
        "entities": [{"entity_id": "light.room", "name": "Room"}],
        "cleanup_checks": ["duplicates"],
    }
    preview = await runtime.async_preview(message)
    assert preview["filter"] == rules
    findings = preview["cleanup_findings"]
    assert len(findings) == 2
    assert findings[0] == {
        "id": "duplicate:include_domains:light",
        "kind": "duplicate",
        "section": "include_domains",
        "value": "light",
        "count": 2,
    }
    selected = await runtime.async_preview(
        {**message, "cleanup_selected": [findings[0]["id"]]}
    )
    assert selected["filter"]["include_domains"] == ["light", "switch"]
    assert selected["filter"]["exclude_entity_globs"] == rules["exclude_entity_globs"]
    assert selected["entity_config"]["light.room"] == {"name": "Room"}
    assert (await runtime.transaction.async_read())["revision"] == before["revision"]


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
