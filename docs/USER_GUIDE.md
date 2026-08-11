# Alexa Exposure Manager User Guide

This guide covers installation, activation, migration, daily entity management,
safe saving, recovery, privacy, and troubleshooting for Alexa Exposure Manager.

GitHub issue [#12](https://github.com/tanushshukla/alexa-exposure-manager/issues/12)
is the canonical v1 specification.

## Before You Begin

Alexa Exposure Manager is an editor for Home Assistant's manually configured
Alexa Smart Home Skill. It does not create the skill or its infrastructure.

You need all of the following:

- Home Assistant `2026.6.4` or newer.
- A Home Assistant administrator account.
- HACS `2.0.5` or newer.
- A working manual Alexa Smart Home Skill.
- A working AWS Lambda function that forwards Alexa directives to Home
  Assistant.
- External HTTPS access and Alexa account linking already configured.
- File access under `/config` through Studio Code Server, File editor, SSH,
  Samba, or an equivalent method.
- A fresh full Home Assistant backup.

If you use Home Assistant Cloud for Alexa, use Home Assistant's built-in voice
assistant exposure controls instead. This integration does not manage the Cloud
connection.

## Install From a HACS Custom Repository

Use these steps only after a tagged GitHub release has passed the release
checklist.

1. Open **HACS**.
2. Open the three-dot menu in the upper-right corner.
3. Select **Custom repositories**.
4. Enter `https://github.com/tanushshukla/alexa-exposure-manager`.
5. Choose **Integration** as the repository category.
6. Select **Add**.
7. Search for **Alexa Exposure Manager** in HACS.
8. Open it, select **Download**, and choose the released version.
9. Restart Home Assistant after HACS finishes copying the integration.

If the repository contains no `custom_components/alexa_exposure_manager`
directory, it is not a valid installable release. Do not continue from an
unreleased source branch.

## Run the Config Flow

1. Open **Settings > Devices & services**.
2. Select **Add integration**.
3. Search for **Alexa Exposure Manager**.
4. Confirm the prerequisites shown by the config flow.
5. Finish setup to create the single config entry.

The integration creates these files only when they do not already exist:

- `/config/alexa_exposure_filter.yaml`
- `/config/alexa_entity_config.yaml`

Existing files are never replaced during setup. The integration does not add
itself to YAML and does not edit your containing Alexa configuration.

## Connect the Managed Files

The nested include structure matters. An included file contains only the value
for the key at which it is included; do not repeat the parent key.

### 1. Main Configuration

Add or retain this top-level entry in `/config/configuration.yaml`:

```yaml
alexa: !include alexa.yaml
```

Do not add a second `alexa:` key. If your Alexa configuration is currently
inline, move its complete value under the existing `alexa:` key into
`/config/alexa.yaml` before using the include.

### 2. User-Owned Alexa Configuration

Your `/config/alexa.yaml` must contain `smart_home` and the two managed nested
includes:

```yaml
smart_home:
  locale: en-US
  filter: !include alexa_exposure_filter.yaml
  entity_config: !include alexa_entity_config.yaml
```

If you use proactive events, keep your existing settings at the same level:

```yaml
smart_home:
  locale: en-US
  endpoint: https://api.amazonalexa.com/v3/events
  client_id: !secret alexa_client_id
  client_secret: !secret alexa_client_secret
  filter: !include alexa_exposure_filter.yaml
  entity_config: !include alexa_entity_config.yaml
```

Use the event endpoint appropriate for your Alexa skill region. Do not copy the
North American endpoint blindly. The manager never needs to display or modify
these credentials.

### 3. Managed File Contents

Do not place `filter:` inside `alexa_exposure_filter.yaml`, and do not place
`entity_config:` inside `alexa_entity_config.yaml`. The includes already supply
those keys.

Typical managed filter when **Expose new entities** is off:

```yaml
include_entities:
  - light.kitchen
  - switch.coffee_machine
```

Typical managed filter when **Expose new entities** is on:

```yaml
exclude_entities:
  - lock.garden_gate
```

Typical managed entity configuration:

```yaml
light.kitchen:
  name: Kitchen
  description: Main kitchen ceiling lights
  display_categories: LIGHT
```

These examples explain the generated shape. Use the panel for normal editing.

## Validate and Activate

1. Run **Developer tools > YAML > Check configuration** or the equivalent
   configuration check for your Home Assistant installation type.
2. Fix every reported YAML or Alexa schema error before restarting.
3. Restart Home Assistant.
4. Reopen Alexa Exposure Manager.
5. Confirm that both managed files show as active.

The panel stays in setup-only mode and disables exposure editing until the
running Alexa configuration proves that both managed files are loaded. File
existence alone is not sufficient activation.

## Migrate Existing Manual Filters

Take a fresh full backup before migration. Also copy your current
`configuration.yaml`, containing Alexa YAML, and any files included by the old
filter or entity configuration.

1. Open Alexa Exposure Manager after activation.
2. Select the offered migration preview.
3. Review the exposed, hidden, unsupported, and missing entity counts.
4. Review the inferred **Expose new entities** setting.
5. Review preserved Alexa names, descriptions, display categories, and explicit
   missing entity IDs.
6. Confirm migration only when the preview matches your current effective
   exposure.
7. Save, validate, restart, and run Alexa discovery.

Migration evaluates your legacy filter using Home Assistant's actual
`EntityFilter` precedence. It flattens entity, domain, and glob rules into a
simple per-entity state. It does not rewrite the old user-owned Alexa file and
does not change managed files merely because you opened the preview.

Activation repoints `filter` and `entity_config` at the managed files, so your
legacy rules stop being readable from the running configuration. The integration
therefore captures your Alexa configuration on every restart until activation,
and migration flattens that captured copy. The preview states which source it
used and when it was captured. If you have already saved exposure changes
through the panel, migration refuses rather than overwrite them; re-check your
Alexa YAML and reload the page before importing.

Entities in domains Alexa cannot control, such as `select`, `calendar`, and
`notify`, are counted as unsupported and are not imported. Configured entity IDs
that Home Assistant no longer knows are retained and stay visible until you
remove them explicitly.

After migration, domain and glob rule editing is not available in v1. Keep the
old configuration backup until you have checked Alexa discovery and control.

## Manage Entities Normally

The panel combines Home Assistant states with entity, device, and area registry
data.

- Search matches entity name, entity ID, device, and area.
- Supported entities have exposure controls.
- Unsupported entities remain visible but disabled with a reason.
- Unavailable entities remain manageable if Home Assistant can identify their
  Alexa support.
- Configured IDs missing from Home Assistant remain visible and are preserved
  until you explicitly remove them.

### Expose One Entity

1. Find the entity in the table or select **Add entities**.
2. Change it to exposed.
3. Review the pending-change indicator.
4. Continue editing or save all staged changes together.

### Hide One Entity

Change the entity to hidden. Alexa metadata is not deleted when exposure is
turned off, so you can restore exposure later without re-entering it.

### Bulk Changes

1. Open **Add entities** or select entities in the main workflow.
2. Search and select the required supported entities.
3. Choose bulk expose or bulk unexpose.
4. Review the action and selected entity count.
5. Confirm once.

Canceling the dialog or confirmation leaves pending configuration unchanged.

### Alexa Metadata

Open an entity to edit:

- Alexa-facing name.
- Description.
- One or more ordered display categories.

The first display category is primary. If there is no override, the panel shows
the category inferred by Home Assistant. Incorrect category overrides can remove
Alexa capabilities, especially for cameras, garage doors, and alarm panels.

## Expose New Entities

This setting controls entities that appear after the current save.

### Off: Safer Default

- New entities are hidden from Alexa.
- Existing exposed entities are written to `include_entities`.
- This is the recommended mode for privacy-sensitive homes.

### On: Broad Default

- New Alexa-supported entities are exposed by default.
- Existing hidden entities are written to `exclude_entities`.
- Review newly added integrations and devices regularly.

Switching modes materializes current exposure before changing representation.
It must not expose or hide any existing supported entity or explicitly retained
missing entity merely because the mode changed.

## Safe Saves, Backups, and Rollback

All browser edits are staged until you select **Save changes**.

On save, the integration:

1. Verifies the expected revision of both managed files.
2. Rejects the save if either file changed since the page loaded.
3. Generates deterministic, sorted YAML.
4. Creates a timestamped backup of both managed files.
5. Retains the five most recent backup versions.
6. Writes temporary files, flushes them, and atomically replaces both managed
   files outside Home Assistant's event loop.
7. Runs Home Assistant's full configuration checker.
8. Restores both previous files automatically if validation fails.
9. Records a restart-required revision only after a valid save.

A revision conflict is not an error to bypass. Reload the panel, review the
external change, and restage your edits. V1 has no force-overwrite or automatic
merge.

Keep normal Home Assistant backups as well. The five managed-file revisions are
for focused recovery, not a replacement for a full system backup.

## Restart and Alexa Discovery

A successful save changes files on disk but not the already running Alexa
configuration.

1. Choose **Later** if it is not a safe time to interrupt Home Assistant.
2. When ready, select **Restart Home Assistant**.
3. Review and confirm the restart once.
4. Wait for Home Assistant and the integration to become available.
5. Confirm that activation is current and the restart-required banner clears.
6. Say "Alexa, discover devices" or use **Devices > + > Other > Discover
   Devices** in the Alexa app.

Alexa Exposure Manager does not call Amazon APIs and cannot force discovery.
Renamed or removed devices can sometimes remain in the Alexa app; remove stale
Alexa devices there and discover again if needed.

## Advanced Recovery

Open the collapsed **Advanced** section only when auditing or recovering.

It provides:

- Managed-file activation state and current revisions.
- Last full-configuration validation result.
- Migration state.
- Preview of generated filter and entity configuration YAML.
- The five retained backup versions and timestamps.
- Guarded backup restore.
- Missing configured entity review.
- Redacted diagnostics and the separately warned full support export.

Restoring a backup creates a new backup first and uses the same revision,
atomic-write, validation, rollback, and restart-required protections as a normal
save.

### Read-Only Safety Mode

Unknown keys, unsupported values, YAML anchors, aliases, merge keys, or custom
tags can carry meaning the manager cannot preserve. The panel becomes read-only
instead of rewriting such files.

To recover:

1. Download redacted diagnostics.
2. Copy both managed files and the containing Alexa file somewhere safe.
3. Inspect the YAML preview and Home Assistant logs.
4. Remove or relocate unsupported structures manually only if you understand
   their effect.
5. Run a full configuration check.
6. Reload the panel and confirm editing is available.

Do not delete unfamiliar YAML simply to clear read-only mode.

### Manual Last-Resort Rollback

If Home Assistant cannot start normally:

1. Stop Home Assistant or use recovery/SSH access.
2. Copy the current managed files aside for investigation.
3. Restore a matching filter and entity-config backup pair.
4. Run the installation-specific full configuration check.
5. Start Home Assistant.
6. Confirm activation before making another edit.

Never restore only one file from a two-file revision unless support has verified
that the other file is unchanged.

## Privacy and Support Exports

Default diagnostics are designed to include versions, counts, revisions, backup
health, activation state, migration state, and sanitized errors. They must not
include entity IDs, friendly names, device names, area names, file paths,
credentials, access tokens, or YAML contents.

The full support export is different. It may contain:

- Entity IDs that reveal rooms, people, security devices, or routines.
- Alexa names and descriptions.
- The exact exposure allowlist or blocklist.
- Missing or retired entity IDs.

Review the export locally before sharing it. Use a private support channel when
necessary, remove secrets even if they appear unrelated, and delete shared files
after the issue is resolved. The managed files should never contain Alexa
credentials; if credentials appear, move them back to `secrets.yaml` and rotate
them.

## Troubleshooting

### Integration Does Not Appear in Add Integration

- Confirm HACS installed
  `/config/custom_components/alexa_exposure_manager/manifest.json`.
- Confirm you restarted Home Assistant after HACS installation.
- Check **Settings > System > Logs** for manifest or import errors.
- Confirm the installed release supports your Home Assistant version.

### Panel Shows Setup Only

- Confirm both managed files exist.
- Confirm the include names and indentation match the exact examples.
- Confirm `filter` and `entity_config` are nested under `smart_home`.
- Confirm the managed files do not repeat their parent keys.
- Run the full configuration check and restart Home Assistant.

### Configuration Check Reports Duplicate `alexa`

You have more than one top-level `alexa:` key. Merge the settings under one key
or use one `alexa: !include alexa.yaml` entry containing all Alexa features.

### Save Reports a Revision Conflict

One or both files changed after the page loaded. Do not force the save. Reload,
review the on-disk change, and restage your edits.

### Save Validation Fails

- Read the sanitized error shown in the panel.
- Confirm your user-owned Alexa YAML remains valid.
- Check Home Assistant logs for the full configuration-check context.
- Confirm both managed files rolled back to their previous revisions.
- Do not restart until the full configuration check succeeds.

### Entity Is Missing

- Search by exact entity ID.
- Confirm the source integration and entity registry entry still exist.
- Check the missing entries section in **Advanced**.
- Retain a temporarily missing entity if you expect it to return.
- Remove it only when you intend to delete its exposure and metadata.

### Entity Is Unsupported

Support depends on Home Assistant's Alexa adapter, state, device class, and
features. Review the reason in the panel and the official Alexa supported
platform documentation. The manager does not override Home Assistant support.

### Alexa Does Not Show a Saved Change

- Confirm you restarted Home Assistant after saving.
- Confirm the restart-required state cleared after restart.
- Ask Alexa to discover devices or run discovery in the app.
- Check whether the entity is supported and currently exposed.
- Remove stale duplicate devices from the Alexa app before rediscovery.

### Editing Is Read-Only

The managed YAML contains a structure the manager cannot safely round-trip.
Follow the read-only recovery steps. Do not disable the protection.

### Home Assistant Does Not Start

Use Home Assistant OS recovery or SSH, restore the matching managed backup pair,
and run the full configuration check before starting again. If the failure is
unrelated to the managed files, restore your full Home Assistant backup.

## Scope Boundaries

Alexa Exposure Manager does not:

- Create or configure Alexa Developer Console resources.
- Create or configure AWS Lambda or IAM resources.
- Configure DNS, TLS, reverse proxies, remote access, or port forwarding.
- Configure Alexa account linking or proactive-event credentials.
- Replace Home Assistant Cloud or manage its Alexa exposure UI.
- Manage Custom Skills, custom commands, intent scripts, or Flash Briefings.
- Rewrite `configuration.yaml` or user-owned Alexa YAML.
- Edit domain and glob rules after migration in v1.
- Preserve comments or formatting inside manager-owned generated YAML.
- Merge concurrent manual YAML edits.
- Allow non-administrator access.
- Reload the manual Alexa integration without a supported Home Assistant reload
  API.
- Trigger Alexa discovery or call Amazon APIs.
- Configure Home Assistant entity-registry aliases.
