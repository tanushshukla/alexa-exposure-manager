# Disposable Home Assistant Acceptance Harness

The primary v1 acceptance seam is a disposable running Home Assistant instance,
not the standalone frontend prototype. This harness installs the repository's
production custom integration by read-only bind mount, creates representative
Home Assistant entities, and starts with the managed Alexa includes inactive so
the config flow and activation sequence can be tested honestly.

It does not create Alexa or AWS resources, generate credentials, bypass Home
Assistant onboarding, or call Amazon APIs.

## Requirements

- Docker Engine with Docker Compose v2.
- The production integration at
  `custom_components/alexa_exposure_manager`.
- A browser.
- Free local port `8123`, or set `HA_PORT`.

The harness refuses to start when the production integration manifest or
`__init__.py` is missing.

## Supported Matrix

Run the seam against every supported Home Assistant patch release:

| Home Assistant | pytest-homeassistant-custom-component |
| --- | --- |
| `2026.6.4` | `0.13.340` |
| `2026.7.4` | `0.13.348` |
| `2026.8.1` | `0.13.355` |

Example:

```bash
HA_VERSION=2026.8.1 scripts/acceptance-ha.sh up
```

State is stored under `.acceptance/<HA version>/` and ignored by Git. Choose a
different port for parallel runs:

```bash
HA_VERSION=2026.7.4 HA_PORT=8124 scripts/acceptance-ha.sh up
```

## What `prepare` Creates

```bash
scripts/acceptance-ha.sh prepare
```

The generated `/config` contains:

- A minimal Home Assistant configuration with `default_config`.
- An inactive manual Alexa `smart_home` configuration.
- YAML helpers representing supported and unsupported Alexa candidates:
  `input_boolean`, `input_number`, `input_button`, a motion binary sensor, a
  temperature sensor, and a text sensor.
- Debug logging for `custom_components.alexa_exposure_manager`.
- An empty `secrets.yaml` with restrictive permissions.

It does not create Home Assistant users, passwords, access tokens, Alexa client
credentials, or external URLs.

## Confirmed Acceptance Sequence

### 1. Start and Onboard

```bash
scripts/acceptance-ha.sh up
scripts/acceptance-ha.sh logs
```

Open `http://127.0.0.1:8123` and complete Home Assistant onboarding with
temporary credentials you choose. Do not reuse production credentials.

Expected result:

- Home Assistant starts without the managed nested includes.
- The custom integration is importable from the bind mount.
- Representative entities appear in Home Assistant.

### 2. Create the Config Entry

1. Open **Settings > Devices & services > Add integration**.
2. Add **Alexa Exposure Manager**.
3. Confirm exactly one config entry is created.
4. Confirm the config flow creates
   `alexa_exposure_filter.yaml` and `alexa_entity_config.yaml` because they were
   absent.
5. Confirm reopening setup does not alter existing managed files.

Expected result:

- The administrator can open the Lit panel.
- The panel is setup-only and editing is disabled.
- A non-administrator cannot open the panel or call backend commands.

### 3. Confirm Panel and Entity Retrieval

1. Open the panel at desktop width.
2. Confirm it retrieves the generated Home Assistant entities, not sample data.
3. Search by name and exact entity ID.
4. Confirm Alexa support state comes from Home Assistant adapters.
5. Confirm the unsupported text sensor remains searchable with disabled exposure
   and a reason.
6. Resize to a mobile width and repeat the search and setup-state checks.

For device and area context, create an **Acceptance Lab** area in Home Assistant
and assign at least one generated helper entity before repeating the search.

### 4. Activate Exact Nested Includes

After the config flow has created both managed files:

```bash
scripts/acceptance-ha.sh activate
```

The command:

- Backs up the harness's user-owned `alexa.yaml`.
- Adds `filter: !include alexa_exposure_filter.yaml` and
  `entity_config: !include alexa_entity_config.yaml` under `smart_home`.
- Runs `python -m homeassistant --script check_config --config /config` inside
  the container.
- Restores the previous `alexa.yaml` automatically if validation fails.
- Does not restart Home Assistant.

Restart only after the configuration check succeeds:

```bash
scripts/acceptance-ha.sh restart
```

Expected result:

- The panel verifies both includes are active after restart.
- Exposure editing becomes available.

### 5. Confirm Normal Save Seam

1. Set **Expose new entities** off.
2. Expose `input_boolean.acceptance_lamp`.
3. Add an Alexa name, description, and display category.
4. Confirm pending changes are visible.
5. Save once.
6. Confirm deterministic YAML is written to both managed files.
7. Confirm timestamped backups are created.
8. Confirm the full Home Assistant configuration check succeeds.
9. Confirm the panel shows persistent restart-required state and does not restart
   automatically.

Then test:

- Individual hide with metadata retained.
- Bulk expose and unexpose with one count-based confirmation.
- **Expose new entities** mode changes in both directions without changing
  current effective exposure.
- A stale revision conflict by changing one managed file after loading the panel.
- A validation failure using synthetic invalid user-owned Alexa configuration,
  followed by automatic two-file rollback.
- Backup list retention and guarded restore.
- Missing configured entity retention and explicit removal.
- Read-only mode for unsupported YAML structures.
- Redacted diagnostics and separately warned full-YAML export.

### 6. Confirm Restart-Required State

After a successful save:

1. Select **Later** and confirm Home Assistant keeps running.
2. Reopen the panel and confirm restart-required state persists.
3. Select **Restart Home Assistant** and cancel the confirmation once.
4. Retry and confirm once.
5. Wait for Home Assistant to return.
6. Confirm the banner clears only after active revisions match the managed files.
7. Confirm the panel instructs the user to ask Alexa to discover devices without
   claiming discovery was triggered.

## Useful Commands

```bash
scripts/acceptance-ha.sh status
scripts/acceptance-ha.sh logs
scripts/acceptance-ha.sh check
scripts/acceptance-ha.sh restart
scripts/acceptance-ha.sh down
```

`down` removes the container but preserves the disposable configuration and its
backups for inspection. Delete `.acceptance/<HA version>/` manually only after
capturing required evidence.

## Evidence to Capture

- Home Assistant and integration versions.
- Config flow completion and single-entry behavior.
- Desktop and mobile panel screenshots without credentials or real household
  data.
- Entity catalog support and search behavior.
- Managed file revisions before and after save.
- Configuration-check output.
- Backup pair and rollback evidence.
- Restart-required state before and after restart.
- Redaction check for diagnostics and privacy warning for full export.

## Home Assistant OS Owner Pass

Container acceptance is necessary but not sufficient. Before publication, the
project owner must repeat the release checklist on a backed-up Home Assistant OS
installation with real integrations, devices, areas, unavailable entities,
missing IDs, existing manual filters, restart behavior, and the real Alexa skill.

Only that pass can verify Supervisor/OS file permissions, real registry scale,
production include layout, backup/restore interaction, network restart behavior,
account linking, and actual Alexa discovery and control.
