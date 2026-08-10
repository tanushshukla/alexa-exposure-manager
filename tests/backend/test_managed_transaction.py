from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from custom_components.alexa_exposure_manager.managed_files import (
    InvalidManagedConfigurationError,
    ManagedFilesError,
    ManagedFileTransaction,
    ManagedYamlReadOnlyError,
    RevisionConflictError,
    ValidationFailedError,
)


async def run_blocking(func, *args):
    return await asyncio.to_thread(func, *args)


async def valid_config() -> str | None:
    return None


def transaction(tmp_path: Path, validator=valid_config) -> ManagedFileTransaction:
    return ManagedFileTransaction(tmp_path, run_blocking, validator)


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
        "# Managed by Alexa Exposure Manager.\ninclude_entities: []\n"
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
        "include_domains:\n  - light\n",
        "include_entities: &lights\n  - light.one\n",
        "include_entities: !secret exposed_entities\n",
        "include_entities:\n  - 42\n",
        "include_entities:\n  - light.one\nexclude_entities:\n  - light.two\n",
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
        .endswith("include_entities: []\n")
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
