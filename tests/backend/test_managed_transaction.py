from __future__ import annotations

import ast
import asyncio
from pathlib import Path

import homeassistant
import pytest
import yaml
from homeassistant.helpers.entityfilter import FILTER_SCHEMA

from custom_components.alexa_exposure_manager.const import DISPLAY_CATEGORIES
from custom_components.alexa_exposure_manager.managed_files import (
    InvalidManagedConfigurationError,
    ManagedFilesError,
    ManagedFileTransaction,
    ManagedYamlReadOnlyError,
    RevisionConflictError,
    SemanticVerificationFailedError,
    ValidationFailedError,
)


async def run_blocking(func, *args):
    return await asyncio.to_thread(func, *args)


async def valid_config() -> str | None:
    return None


def transaction(tmp_path: Path, validator=valid_config) -> ManagedFileTransaction:
    return ManagedFileTransaction(tmp_path, run_blocking, validator)


def mixed_fixture() -> tuple[dict[str, object], dict[str, object]]:
    fixture_path = (
        Path(__file__).parents[1] / "fixtures" / "alexa" / "mixed_rules" / "alexa.yaml"
    )
    smart_home = yaml.safe_load(fixture_path.read_text())["smart_home"]
    return smart_home["filter"], smart_home.get("entity_config", {})


@pytest.mark.asyncio
async def test_mixed_filter_rules_are_editable_and_preserved(tmp_path: Path) -> None:
    filter_config, entity_config = mixed_fixture()
    (tmp_path / "alexa_exposure_filter.yaml").write_text(
        yaml.safe_dump(filter_config, sort_keys=False)
    )
    (tmp_path / "alexa_entity_config.yaml").write_text(
        yaml.safe_dump(entity_config, sort_keys=False)
    )
    managed = transaction(tmp_path)
    entity_ids = {
        "script.start_movie_time",
        "automation.voice_daily_summary",
        "light.kitchen",
        "sensor.utility_rate",
        "switch.voice_receiver",
        "weather.local",
    }
    snapshot = await managed.async_read(entity_ids)

    assert snapshot["read_only"] is False
    assert snapshot["strategy"] == "rule_based"
    assert snapshot["filter"] == filter_config
    entity_filter = FILTER_SCHEMA(filter_config)
    configured_entity_ids = {
        entity_id
        for key in ("include_entities", "exclude_entities")
        for entity_id in filter_config.get(key, [])
    } | set(entity_config)
    assert snapshot["exposure"] == {
        entity_id: bool(entity_filter(entity_id))
        for entity_id in sorted(entity_ids | configured_entity_ids)
    }


@pytest.mark.asyncio
async def test_import_preview_round_trips_mixed_rules_without_writing(
    tmp_path: Path,
) -> None:
    filter_config, entity_config = mixed_fixture()
    assert entity_config == {
        "script.start_movie_time": {
            "name": "Movie time",
            "description": "Starts the shared movie scene",
            "display_categories": "ACTIVITY_TRIGGER",
        },
        "sensor.utility_rate": {"description": "Current utility rate"},
        "switch.removed_device": {"name": "Retired voice switch"},
    }
    managed = transaction(tmp_path)
    await managed.async_initialize()
    before_filter = (tmp_path / "alexa_exposure_filter.yaml").read_bytes()
    before_entities = (tmp_path / "alexa_entity_config.yaml").read_bytes()

    preview = await managed.async_import_preview(
        filter_config=filter_config,
        entity_config=entity_config,
    )

    assert preview["strategy"] == "rule_based"
    assert yaml.safe_load(preview["filter_yaml"]) == filter_config
    assert (yaml.safe_load(preview["entity_config_yaml"]) or {}) == entity_config
    assert (tmp_path / "alexa_exposure_filter.yaml").read_bytes() == before_filter
    assert (tmp_path / "alexa_entity_config.yaml").read_bytes() == before_entities


@pytest.mark.asyncio
async def test_import_save_commits_and_verifies_complete_mixed_rules(
    tmp_path: Path,
) -> None:
    filter_config, entity_config = mixed_fixture()
    managed = transaction(tmp_path)
    await managed.async_initialize()
    preview = await managed.async_import_preview(
        filter_config=filter_config,
        entity_config=entity_config,
    )

    saved = await managed.async_import_save(
        expected_revision=preview["revision"],
        expected_entities_revision=preview["entities_revision"],
        filter_config=filter_config,
        entity_config=entity_config,
    )

    assert saved["restart_required"] is True
    assert saved["strategy"] == "rule_based"
    assert yaml.safe_load((tmp_path / "alexa_exposure_filter.yaml").read_text()) == (
        filter_config
    )
    assert (
        yaml.safe_load((tmp_path / "alexa_entity_config.yaml").read_text()) or {}
    ) == entity_config
    snapshot = await managed.async_read(
        {"light.future", "sensor.future_rssi", "weather.future"}
    )
    entity_filter = FILTER_SCHEMA(filter_config)
    assert snapshot["exposure"]["light.future"] is bool(entity_filter("light.future"))
    assert snapshot["exposure"]["sensor.future_rssi"] is bool(
        entity_filter("sensor.future_rssi")
    )
    assert snapshot["exposure"]["weather.future"] is bool(
        entity_filter("weather.future")
    )


@pytest.mark.asyncio
async def test_semantic_verification_rollback_failure_records_failed_validation(
    tmp_path: Path, monkeypatch
) -> None:
    managed = transaction(tmp_path)
    await managed.async_initialize()
    preview = await managed.async_import_preview(
        filter_config={"include_entities": ["light.one"]},
        entity_config={},
    )
    real_read_pair = managed._read_pair
    read_calls = 0

    def mismatched_read_pair():
        nonlocal read_calls
        read_calls += 1
        parsed = real_read_pair()
        if read_calls >= 2:
            parsed.filter = {"include_entities": ["light.other"]}
        return parsed

    real_replace_pair = managed._replace_bytes_pair
    replace_calls = 0

    def fail_rollback(filter_bytes, entity_bytes):
        nonlocal replace_calls
        replace_calls += 1
        if replace_calls >= 2:
            raise OSError("simulated rollback failure")
        real_replace_pair(filter_bytes, entity_bytes)

    monkeypatch.setattr(managed, "_read_pair", mismatched_read_pair)
    monkeypatch.setattr(managed, "_replace_bytes_pair", fail_rollback)

    with pytest.raises(SemanticVerificationFailedError, match="rollback failed"):
        await managed.async_import_save(
            expected_revision=preview["revision"],
            expected_entities_revision=preview["entities_revision"],
            filter_config={"include_entities": ["light.one"]},
            entity_config={},
        )

    assert managed.last_validation is not None
    assert managed.last_validation["ok"] is False
    assert managed.last_validation["rollback"] == "failed"


@pytest.mark.asyncio
async def test_rule_based_entity_edits_preserve_domain_and_glob_rules(
    tmp_path: Path,
) -> None:
    filter_config, entity_config = mixed_fixture()
    (tmp_path / "alexa_exposure_filter.yaml").write_text(
        yaml.safe_dump(filter_config, sort_keys=False)
    )
    (tmp_path / "alexa_entity_config.yaml").write_text(
        yaml.safe_dump(entity_config, sort_keys=False)
    )
    managed = transaction(tmp_path)
    snapshot = await managed.async_read(
        {"light.kitchen", "sensor.kitchen_rssi", "weather.local"}
    )

    await managed.async_save(
        expected_revision=snapshot["revision"],
        expected_entities_revision=snapshot["entities_revision"],
        expose_new_entities=snapshot["expose_new_entities"],
        entities=[
            {"entity_id": "light.kitchen", "exposed": False},
            {"entity_id": "sensor.kitchen_rssi", "exposed": True},
            {"entity_id": "weather.local", "exposed": True},
        ],
        known_entity_ids={"light.kitchen", "sensor.kitchen_rssi", "weather.local"},
    )

    saved_filter = yaml.safe_load((tmp_path / "alexa_exposure_filter.yaml").read_text())
    assert saved_filter["exclude_domains"] == filter_config["exclude_domains"]
    assert saved_filter["exclude_entity_globs"] == filter_config["exclude_entity_globs"]
    assert set(saved_filter["include_entities"]) == set(
        filter_config["include_entities"]
    ) | {"sensor.kitchen_rssi", "weather.local"}
    assert set(saved_filter["exclude_entities"]) == set(
        filter_config["exclude_entities"]
    ) | {"light.kitchen"}


@pytest.mark.asyncio
async def test_six_section_filter_with_empty_includes_uses_native_excludes(
    tmp_path: Path,
) -> None:
    filter_config = {
        "include_entities": [],
        "include_domains": [],
        "include_entity_globs": [],
        "exclude_entities": ["light.secret"],
        "exclude_domains": [],
        "exclude_entity_globs": [],
    }
    (tmp_path / "alexa_exposure_filter.yaml").write_text(
        yaml.safe_dump(filter_config, sort_keys=False)
    )
    (tmp_path / "alexa_entity_config.yaml").write_text("{}\n")

    snapshot = await transaction(tmp_path).async_read({"light.public", "light.secret"})

    assert snapshot["strategy"] == "rule_based"
    assert snapshot["exposure"] == {
        "light.public": True,
        "light.secret": False,
    }


@pytest.mark.asyncio
async def test_empty_native_filter_is_reported_as_registry_default(
    tmp_path: Path,
) -> None:
    (tmp_path / "alexa_exposure_filter.yaml").write_text("{}\n")
    (tmp_path / "alexa_entity_config.yaml").write_text("{}\n")

    snapshot = await transaction(tmp_path).async_read({"light.one"})

    assert snapshot["strategy"] == "registry_default"
    assert snapshot["filter_empty"] is True


@pytest.mark.asyncio
async def test_metadata_only_rule_edit_preserves_entity_filter_case(
    tmp_path: Path,
) -> None:
    original_filter = {
        "include_entities": ["light.only"],
        "exclude_entities": ["light.secret"],
    }
    (tmp_path / "alexa_exposure_filter.yaml").write_text(
        yaml.safe_dump(original_filter, sort_keys=False)
    )
    (tmp_path / "alexa_entity_config.yaml").write_text("{}\n")
    managed = transaction(tmp_path)
    snapshot = await managed.async_read({"light.only", "light.other", "light.secret"})

    await managed.async_save(
        expected_revision=snapshot["revision"],
        expected_entities_revision=snapshot["entities_revision"],
        expose_new_entities=False,
        entities=[
            {
                "entity_id": "light.only",
                "exposed": True,
                "name": "Only light",
            }
        ],
        known_entity_ids={"light.only", "light.other", "light.secret"},
    )

    assert yaml.safe_load((tmp_path / "alexa_exposure_filter.yaml").read_text()) == (
        original_filter
    )


@pytest.mark.asyncio
async def test_rule_edit_rejects_removing_last_include_when_defaults_would_change(
    tmp_path: Path,
) -> None:
    original_text = (
        "include_entities:\n  - light.only\nexclude_entities:\n  - light.secret\n"
    )
    (tmp_path / "alexa_exposure_filter.yaml").write_text(original_text)
    (tmp_path / "alexa_entity_config.yaml").write_text("{}\n")
    managed = transaction(tmp_path)
    snapshot = await managed.async_read({"light.only", "light.other", "light.secret"})

    with pytest.raises(InvalidManagedConfigurationError, match="unrelated"):
        await managed.async_save(
            expected_revision=snapshot["revision"],
            expected_entities_revision=snapshot["entities_revision"],
            expose_new_entities=False,
            entities=[{"entity_id": "light.only", "exposed": False}],
            known_entity_ids={"light.only", "light.other", "light.secret"},
        )

    assert (tmp_path / "alexa_exposure_filter.yaml").read_text() == original_text


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "changes",
    [
        [
            {"entity_id": "light.a", "exposed": False},
            {"entity_id": "light.b", "exposed": True},
        ],
        [
            {"entity_id": "light.b", "exposed": True},
            {"entity_id": "light.a", "exposed": False},
        ],
    ],
)
async def test_multi_entity_rule_edits_are_independent_of_staging_order(
    tmp_path: Path, changes: list[dict[str, object]]
) -> None:
    (tmp_path / "alexa_exposure_filter.yaml").write_text(
        "include_entities:\n  - light.a\nexclude_entities:\n  - light.b\n"
    )
    (tmp_path / "alexa_entity_config.yaml").write_text("{}\n")
    managed = transaction(tmp_path)
    snapshot = await managed.async_read({"light.a", "light.b", "light.other"})

    await managed.async_save(
        expected_revision=snapshot["revision"],
        expected_entities_revision=snapshot["entities_revision"],
        expose_new_entities=False,
        entities=changes,
        known_entity_ids={"light.a", "light.b", "light.other"},
    )

    reloaded = await managed.async_read({"light.a", "light.b", "light.other"})
    assert reloaded["exposure"] == {
        "light.a": False,
        "light.b": True,
        "light.other": False,
    }


@pytest.mark.asyncio
async def test_setup_creates_only_missing_managed_files(tmp_path: Path) -> None:
    filter_path = tmp_path / "alexa_exposure_filter.yaml"
    filter_path.write_text("include_entities:\n  - light.existing\n")
    managed = transaction(tmp_path)

    created = await managed.async_initialize()

    assert created == {"filter": False, "entity_config": True}
    assert filter_path.read_text() == "include_entities:\n  - light.existing\n"
    assert (tmp_path / "alexa_entity_config.yaml").read_text() == "{}\n"


@pytest.mark.asyncio
async def test_read_recreates_managed_files_deleted_after_setup(tmp_path: Path) -> None:
    managed = transaction(tmp_path)
    await managed.async_initialize()
    (tmp_path / "alexa_exposure_filter.yaml").unlink()
    (tmp_path / "alexa_entity_config.yaml").unlink()

    snapshot = await managed.async_read({"light.kitchen"})

    assert snapshot["expose_new_entities"] is False
    assert snapshot["exposure"] == {"light.kitchen": False}
    assert (tmp_path / "alexa_exposure_filter.yaml").read_text() == (
        "# Managed by Alexa Exposure Manager.\n"
        "include_entity_globs:\n"
        "  - __alexa_exposure_manager_never_match__.*\n"
    )
    assert (tmp_path / "alexa_entity_config.yaml").read_text() == "{}\n"


@pytest.mark.asyncio
async def test_filter_key_alone_determines_exposure_mode(tmp_path: Path) -> None:
    """A hand-edited mode switch must be honoured, not locked out."""
    filter_path = tmp_path / "alexa_exposure_filter.yaml"
    filter_path.write_text(
        "# Managed by Alexa Exposure Manager.\n"
        "# alexa_exposure_manager: expose_new_entities=false\n"
        "exclude_entities:\n"
        "  - light.hidden\n"
    )
    managed = transaction(tmp_path)
    await managed.async_initialize()

    snapshot = await managed.async_read({"light.hidden", "light.other"})

    assert snapshot["expose_new_entities"] is True
    assert snapshot["read_only"] is False
    assert snapshot["read_only_reasons"] == []
    assert snapshot["exposure"] == {"light.hidden": False, "light.other": True}


@pytest.mark.asyncio
async def test_filter_without_any_key_defaults_to_new_entities_hidden(
    tmp_path: Path,
) -> None:
    filter_path = tmp_path / "alexa_exposure_filter.yaml"
    filter_path.write_text("# Managed by Alexa Exposure Manager.\n")
    managed = transaction(tmp_path)
    await managed.async_initialize()

    snapshot = await managed.async_read({"light.other"})

    assert snapshot["expose_new_entities"] is False
    assert snapshot["read_only"] is False
    assert snapshot["exposure"] == {"light.other": False}


@pytest.mark.asyncio
async def test_saved_filter_carries_no_mode_marker_comment(tmp_path: Path) -> None:
    managed = transaction(tmp_path)
    await managed.async_initialize()
    snapshot = await managed.async_read({"light.one"})

    await managed.async_save(
        expected_revision=snapshot["revision"],
        expected_entities_revision=snapshot["entities_revision"],
        expose_new_entities=True,
        entities=[{"entity_id": "light.one", "exposed": False}],
        known_entity_ids={"light.one"},
    )

    assert (tmp_path / "alexa_exposure_filter.yaml").read_text() == (
        "# Managed by Alexa Exposure Manager.\nexclude_entities:\n  - light.one\n"
    )


@pytest.mark.asyncio
async def test_save_is_deterministic_and_preserves_hidden_metadata(
    tmp_path: Path,
) -> None:
    managed = transaction(tmp_path)
    await managed.async_initialize()
    initial = await managed.async_read({"light.kitchen", "switch.coffee"})

    result = await managed.async_save(
        expected_revision=initial["revision"],
        expected_entities_revision=initial["entities_revision"],
        expose_new_entities=False,
        entities=[
            {
                "entity_id": "switch.coffee",
                "exposed": False,
                "name": "Coffee's plug",
                "description": "Kitchen: counter #2",
                "display_categories": ["SMARTPLUG"],
            },
            {"entity_id": "light.kitchen", "exposed": True},
        ],
        known_entity_ids={"light.kitchen", "switch.coffee"},
    )

    assert result["restart_required"] is True
    assert (tmp_path / "alexa_exposure_filter.yaml").read_text() == (
        "# Managed by Alexa Exposure Manager.\ninclude_entities:\n  - light.kitchen\n"
    )
    assert (tmp_path / "alexa_entity_config.yaml").read_text() == (
        "switch.coffee:\n"
        "  name: Coffee's plug\n"
        "  description: 'Kitchen: counter #2'\n"
        "  display_categories: SMARTPLUG\n"
    )


@pytest.mark.asyncio
async def test_mode_switch_materializes_existing_exposure_and_keeps_missing_ids(
    tmp_path: Path,
) -> None:
    managed = transaction(tmp_path)
    await managed.async_initialize()
    initial = await managed.async_read({"light.one", "light.two"})
    saved = await managed.async_save(
        expected_revision=initial["revision"],
        expected_entities_revision=initial["entities_revision"],
        expose_new_entities=False,
        entities=[
            {"entity_id": "light.one", "exposed": True},
            {"entity_id": "light.missing", "exposed": True},
        ],
        known_entity_ids={"light.one", "light.two"},
    )

    switched = await managed.async_save(
        expected_revision=saved["revision"],
        expected_entities_revision=saved["entities_revision"],
        expose_new_entities=True,
        entities=[],
        known_entity_ids={"light.one", "light.two"},
    )

    assert switched["expose_new_entities"] is True
    assert (
        (tmp_path / "alexa_exposure_filter.yaml")
        .read_text()
        .endswith("exclude_entities:\n  - light.two\n")
    )
    snapshot = await managed.async_read({"light.one", "light.two"})
    assert snapshot["exposure"] == {
        "light.missing": True,
        "light.one": True,
        "light.two": False,
    }
    assert snapshot["missing_entity_ids"] == ["light.missing"]


@pytest.mark.asyncio
async def test_mode_switch_on_to_off_preserves_exposure_and_missing_ids(
    tmp_path: Path,
) -> None:
    managed = transaction(tmp_path)
    await managed.async_initialize()
    initial = await managed.async_read({"light.one", "light.two"})
    allowlist = await managed.async_save(
        expected_revision=initial["revision"],
        expected_entities_revision=initial["entities_revision"],
        expose_new_entities=False,
        entities=[
            {"entity_id": "light.one", "exposed": True},
            {"entity_id": "light.missing", "exposed": True},
        ],
        known_entity_ids={"light.one", "light.two"},
    )
    on_mode = await managed.async_save(
        expected_revision=allowlist["revision"],
        expected_entities_revision=allowlist["entities_revision"],
        expose_new_entities=True,
        entities=[],
        known_entity_ids={"light.one", "light.two"},
    )

    switched = await managed.async_save(
        expected_revision=on_mode["revision"],
        expected_entities_revision=on_mode["entities_revision"],
        expose_new_entities=False,
        entities=[],
        known_entity_ids={"light.one", "light.two"},
    )

    assert switched["expose_new_entities"] is False
    filter_text = (tmp_path / "alexa_exposure_filter.yaml").read_text()
    assert "include_entities:" in filter_text
    assert "light.one" in filter_text
    assert "light.two" not in filter_text
    snapshot = await managed.async_read({"light.one", "light.two"})
    assert snapshot["exposure"] == {
        "light.missing": True,
        "light.one": True,
        "light.two": False,
    }
    assert snapshot["missing_entity_ids"] == ["light.missing"]


@pytest.mark.asyncio
async def test_new_entity_defaults_follow_expose_new_entities_mode(
    tmp_path: Path,
) -> None:
    managed = transaction(tmp_path)
    await managed.async_initialize()
    allowlist = await managed.async_read({"light.one"})
    saved_allowlist = await managed.async_save(
        expected_revision=allowlist["revision"],
        expected_entities_revision=allowlist["entities_revision"],
        expose_new_entities=False,
        entities=[{"entity_id": "light.one", "exposed": True}],
        known_entity_ids={"light.one"},
    )

    after_allowlist = await managed.async_read({"light.one", "light.brand_new"})
    assert after_allowlist["expose_new_entities"] is False
    assert after_allowlist["exposure"]["light.one"] is True
    assert after_allowlist["exposure"]["light.brand_new"] is False

    blocklist = await managed.async_save(
        expected_revision=saved_allowlist["revision"],
        expected_entities_revision=saved_allowlist["entities_revision"],
        expose_new_entities=True,
        entities=[],
        known_entity_ids={"light.one"},
    )
    after_blocklist = await managed.async_read(
        {"light.one", "light.brand_new", "light.another_new"}
    )
    assert blocklist["expose_new_entities"] is True
    assert after_blocklist["exposure"]["light.one"] is True
    assert after_blocklist["exposure"]["light.brand_new"] is True
    assert after_blocklist["exposure"]["light.another_new"] is True


@pytest.mark.asyncio
async def test_stale_revision_rejects_both_file_write(tmp_path: Path) -> None:
    managed = transaction(tmp_path)
    await managed.async_initialize()
    snapshot = await managed.async_read({"light.one"})
    (tmp_path / "alexa_entity_config.yaml").write_text(
        "light.manual:\n  name: Manual\n"
    )

    with pytest.raises(RevisionConflictError, match="entity configuration"):
        await managed.async_save(
            expected_revision=snapshot["revision"],
            expected_entities_revision=snapshot["entities_revision"],
            expose_new_entities=False,
            entities=[{"entity_id": "light.one", "exposed": True}],
            known_entity_ids={"light.one"},
        )

    assert (tmp_path / "alexa_exposure_filter.yaml").read_text() == (
        "# Managed by Alexa Exposure Manager.\n"
        "include_entity_globs:\n"
        "  - __alexa_exposure_manager_never_match__.*\n"
    )


@pytest.mark.asyncio
async def test_validation_failure_rolls_back_both_files(tmp_path: Path) -> None:
    validation_calls = 0

    async def invalid_after_write() -> str | None:
        nonlocal validation_calls
        validation_calls += 1
        return "Alexa configuration is invalid at smart_home.filter"

    managed = transaction(tmp_path, invalid_after_write)
    await managed.async_initialize()
    before_filter = (tmp_path / "alexa_exposure_filter.yaml").read_bytes()
    before_entities = (tmp_path / "alexa_entity_config.yaml").read_bytes()
    snapshot = await managed.async_read({"light.one"})

    with pytest.raises(ValidationFailedError, match="smart_home.filter"):
        await managed.async_save(
            expected_revision=snapshot["revision"],
            expected_entities_revision=snapshot["entities_revision"],
            expose_new_entities=False,
            entities=[
                {
                    "entity_id": "light.one",
                    "exposed": True,
                    "name": "One",
                }
            ],
            known_entity_ids={"light.one"},
        )

    assert validation_calls == 1
    assert (tmp_path / "alexa_exposure_filter.yaml").read_bytes() == before_filter
    assert (tmp_path / "alexa_entity_config.yaml").read_bytes() == before_entities
    assert len(await managed.async_list_backups()) == 1


@pytest.mark.asyncio
async def test_interrupted_second_replace_restores_both_previous_files(
    tmp_path: Path, monkeypatch
) -> None:
    managed = transaction(tmp_path)
    await managed.async_initialize()
    before_filter = (tmp_path / "alexa_exposure_filter.yaml").read_bytes()
    before_entities = (tmp_path / "alexa_entity_config.yaml").read_bytes()
    snapshot = await managed.async_read({"light.one"})
    real_replace = __import__("os").replace
    failed = False

    def fail_entity_replace_once(source, destination):
        nonlocal failed
        if str(destination).endswith("alexa_entity_config.yaml") and not failed:
            failed = True
            raise OSError("simulated interrupted second replace")
        real_replace(source, destination)

    monkeypatch.setattr("os.replace", fail_entity_replace_once)

    with pytest.raises(ManagedFilesError, match="previous files were restored"):
        await managed.async_save(
            expected_revision=snapshot["revision"],
            expected_entities_revision=snapshot["entities_revision"],
            expose_new_entities=False,
            entities=[
                {
                    "entity_id": "light.one",
                    "exposed": True,
                    "name": "Changed",
                }
            ],
            known_entity_ids={"light.one"},
        )

    assert (tmp_path / "alexa_exposure_filter.yaml").read_bytes() == before_filter
    assert (tmp_path / "alexa_entity_config.yaml").read_bytes() == before_entities


@pytest.mark.asyncio
async def test_backup_retention_keeps_latest_five_pairs(tmp_path: Path) -> None:
    managed = transaction(tmp_path)
    await managed.async_initialize()

    for index in range(7):
        snapshot = await managed.async_read({"light.one"})
        await managed.async_save(
            expected_revision=snapshot["revision"],
            expected_entities_revision=snapshot["entities_revision"],
            expose_new_entities=False,
            entities=[
                {
                    "entity_id": "light.one",
                    "exposed": index % 2 == 0,
                    "name": f"Revision {index}",
                }
            ],
            known_entity_ids={"light.one"},
        )

    backups = await managed.async_list_backups()
    assert len(backups) == 5
    assert all(backup["healthy"] for backup in backups)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "filter_yaml",
    [
        "include_entities: &lights\n  - light.one\n",
        "include_entities: !secret exposed_entities\n",
        "include_entities:\n  - 42\n",
    ],
)
async def test_unknown_or_lossy_yaml_is_read_only(
    tmp_path: Path, filter_yaml: str
) -> None:
    (tmp_path / "alexa_exposure_filter.yaml").write_text(filter_yaml)
    (tmp_path / "alexa_entity_config.yaml").write_text("{}\n")
    managed = transaction(tmp_path)

    snapshot = await managed.async_read({"light.one"})

    assert snapshot["read_only"] is True
    with pytest.raises(ManagedYamlReadOnlyError):
        await managed.async_save(
            expected_revision=snapshot["revision"],
            expected_entities_revision=snapshot["entities_revision"],
            expose_new_entities=False,
            entities=[],
            known_entity_ids={"light.one"},
        )


@pytest.mark.asyncio
async def test_restore_uses_same_revision_and_validation_transaction(
    tmp_path: Path,
) -> None:
    managed = transaction(tmp_path)
    await managed.async_initialize()
    initial = await managed.async_read({"light.one"})
    first = await managed.async_save(
        expected_revision=initial["revision"],
        expected_entities_revision=initial["entities_revision"],
        expose_new_entities=False,
        entities=[{"entity_id": "light.one", "exposed": True}],
        known_entity_ids={"light.one"},
    )
    backup_id = (await managed.async_list_backups())[0]["id"]

    restored = await managed.async_restore(
        backup_id,
        expected_revision=first["revision"],
        expected_entities_revision=first["entities_revision"],
    )

    assert restored["restart_required"] is True
    assert (
        (tmp_path / "alexa_exposure_filter.yaml")
        .read_text()
        .endswith(
            "include_entity_globs:\n  - __alexa_exposure_manager_never_match__.*\n"
        )
    )


@pytest.mark.asyncio
async def test_restore_validation_failure_rolls_back_to_pre_restore_pair(
    tmp_path: Path,
) -> None:
    validation_calls = 0

    async def fail_restore_validation() -> str | None:
        nonlocal validation_calls
        validation_calls += 1
        return None if validation_calls == 1 else "restored configuration is invalid"

    managed = transaction(tmp_path, fail_restore_validation)
    await managed.async_initialize()
    initial = await managed.async_read({"light.one"})
    saved = await managed.async_save(
        expected_revision=initial["revision"],
        expected_entities_revision=initial["entities_revision"],
        expose_new_entities=False,
        entities=[{"entity_id": "light.one", "exposed": True}],
        known_entity_ids={"light.one"},
    )
    backup_id = (await managed.async_list_backups())[0]["id"]
    before_filter = (tmp_path / "alexa_exposure_filter.yaml").read_bytes()
    before_entities = (tmp_path / "alexa_entity_config.yaml").read_bytes()

    with pytest.raises(ValidationFailedError, match="restored configuration"):
        await managed.async_restore(
            backup_id,
            expected_revision=saved["revision"],
            expected_entities_revision=saved["entities_revision"],
        )

    assert (tmp_path / "alexa_exposure_filter.yaml").read_bytes() == before_filter
    assert (tmp_path / "alexa_entity_config.yaml").read_bytes() == before_entities


@pytest.mark.asyncio
async def test_single_display_category_is_written_as_scalar_for_ha_yaml_schema(
    tmp_path: Path,
) -> None:
    managed = transaction(tmp_path)
    await managed.async_initialize()
    snapshot = await managed.async_read({"light.one"})

    await managed.async_save(
        expected_revision=snapshot["revision"],
        expected_entities_revision=snapshot["entities_revision"],
        expose_new_entities=False,
        entities=[
            {
                "entity_id": "light.one",
                "exposed": True,
                "display_categories": ["LIGHT"],
            }
        ],
        known_entity_ids={"light.one"},
    )

    assert (tmp_path / "alexa_entity_config.yaml").read_text() == (
        "light.one:\n  display_categories: LIGHT\n"
    )


@pytest.mark.asyncio
async def test_import_accepts_every_home_assistant_display_category(
    tmp_path: Path,
) -> None:
    managed = transaction(tmp_path)
    await managed.async_initialize()
    entities_path = (
        Path(homeassistant.__file__).parent / "components" / "alexa" / "entities.py"
    )
    module = ast.parse(entities_path.read_text())
    display_category = next(
        node
        for node in module.body
        if isinstance(node, ast.ClassDef) and node.name == "DisplayCategory"
    )
    categories = {
        node.value.value
        for node in display_category.body
        if isinstance(node, ast.Assign)
        and len(node.targets) == 1
        and isinstance(node.targets[0], ast.Name)
        and node.targets[0].id.isupper()
        and isinstance(node.value, ast.Constant)
        and isinstance(node.value.value, str)
    }
    assert DISPLAY_CATEGORIES == categories

    for category in sorted(categories):
        preview = await managed.async_import_preview(
            filter_config={"include_entities": ["light.one"]},
            entity_config={
                "light.one": {"display_categories": category},
            },
        )
        assert yaml.safe_load(preview["entity_config_yaml"]) == {
            "light.one": {"display_categories": category}
        }


@pytest.mark.asyncio
async def test_multi_category_save_is_rejected_not_truncated(
    tmp_path: Path,
) -> None:
    managed = transaction(tmp_path)
    await managed.async_initialize()
    snapshot = await managed.async_read({"light.one"})

    with pytest.raises(InvalidManagedConfigurationError, match="at most one"):
        await managed.async_save(
            expected_revision=snapshot["revision"],
            expected_entities_revision=snapshot["entities_revision"],
            expose_new_entities=False,
            entities=[
                {
                    "entity_id": "light.one",
                    "exposed": True,
                    "display_categories": ["LIGHT", "SWITCH"],
                }
            ],
            known_entity_ids={"light.one"},
        )

    assert (tmp_path / "alexa_entity_config.yaml").read_text() == "{}\n"


@pytest.mark.asyncio
async def test_multi_category_managed_file_is_read_only_not_truncated(
    tmp_path: Path,
) -> None:
    (tmp_path / "alexa_entity_config.yaml").write_text(
        "light.one:\n  display_categories:\n    - LIGHT\n    - SWITCH\n"
    )
    (tmp_path / "alexa_exposure_filter.yaml").write_text(
        "include_entities:\n  - light.one\n"
    )
    managed = transaction(tmp_path)

    snapshot = await managed.async_read({"light.one"})

    assert snapshot["read_only"] is True
    assert any(
        "more than one category" in reason for reason in snapshot["read_only_reasons"]
    )
    assert (tmp_path / "alexa_entity_config.yaml").read_text() == (
        "light.one:\n  display_categories:\n    - LIGHT\n    - SWITCH\n"
    )
    with pytest.raises(ManagedYamlReadOnlyError):
        await managed.async_save(
            expected_revision=snapshot["revision"],
            expected_entities_revision=snapshot["entities_revision"],
            expose_new_entities=False,
            entities=[],
            known_entity_ids={"light.one"},
        )


@pytest.mark.asyncio
async def test_hidden_missing_entity_is_retained_without_a_mode_switch(
    tmp_path: Path,
) -> None:
    """Migration flattens a legacy exclude list into include mode without switching.

    A hidden missing ID cannot be represented in ``include_entities``, so its only
    record is the entity configuration. It must survive until explicitly removed.
    """
    managed = transaction(tmp_path)
    await managed.async_initialize()
    initial = await managed.async_read({"light.present"})

    await managed.async_save(
        expected_revision=initial["revision"],
        expected_entities_revision=initial["entities_revision"],
        expose_new_entities=False,
        entities=[
            {"entity_id": "light.present", "exposed": True},
            {"entity_id": "switch.legacy_excluded", "exposed": False},
        ],
        known_entity_ids={"light.present"},
    )

    snapshot = await managed.async_read({"light.present"})
    assert snapshot["missing_entity_ids"] == ["switch.legacy_excluded"]
    assert snapshot["exposure"]["switch.legacy_excluded"] is False


@pytest.mark.asyncio
async def test_retained_hidden_missing_entity_returns_on_mode_switch(
    tmp_path: Path,
) -> None:
    """A retained hidden missing ID must reappear in exclude_entities later."""
    managed = transaction(tmp_path)
    await managed.async_initialize()
    initial = await managed.async_read({"light.present"})
    saved = await managed.async_save(
        expected_revision=initial["revision"],
        expected_entities_revision=initial["entities_revision"],
        expose_new_entities=False,
        entities=[
            {"entity_id": "light.present", "exposed": True},
            {"entity_id": "switch.legacy_excluded", "exposed": False},
        ],
        known_entity_ids={"light.present"},
    )

    await managed.async_save(
        expected_revision=saved["revision"],
        expected_entities_revision=saved["entities_revision"],
        expose_new_entities=True,
        entities=[],
        known_entity_ids={"light.present"},
    )

    filter_text = (tmp_path / "alexa_exposure_filter.yaml").read_text()
    assert "switch.legacy_excluded" in filter_text


@pytest.mark.asyncio
async def test_missing_entry_can_be_explicitly_removed(tmp_path: Path) -> None:
    (tmp_path / "alexa_exposure_filter.yaml").write_text(
        "include_entities:\n  - light.missing\n"
    )
    (tmp_path / "alexa_entity_config.yaml").write_text(
        "light.missing:\n  name: Missing light\n"
    )
    managed = transaction(tmp_path)
    snapshot = await managed.async_read({"light.present"})

    result = await managed.async_save(
        expected_revision=snapshot["revision"],
        expected_entities_revision=snapshot["entities_revision"],
        expose_new_entities=False,
        entities=[{"entity_id": "light.missing", "remove": True}],
        known_entity_ids={"light.present"},
    )

    reloaded = await managed.async_read({"light.present"})
    assert result["restart_required"] is True
    assert reloaded["missing_entity_ids"] == []
    assert (tmp_path / "alexa_entity_config.yaml").read_text() == "{}\n"
