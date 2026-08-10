# Alexa Exposure Manager

Alexa Exposure Manager is a Home Assistant custom integration for administrators
who already use the manually configured Amazon Alexa Smart Home Skill. It provides
a Home Assistant-native panel for managing which entities Alexa can discover and
for editing Alexa-specific entity metadata.

> [!IMPORTANT]
> GitHub issue [#12](https://github.com/tanushshukla/alexa-exposure-manager/issues/12)
> is the canonical v1 specification. The standalone React prototype is obsolete
> and is not the production integration. A HACS
> release must not be published until `custom_components/alexa_exposure_manager`,
> its tests, and all release gates are present and passing.

Version `0.1.0` release-hardening documentation and automation are prepared, but
this repository has not been tagged or published by this change.

## What It Does

- Shows real Home Assistant entities with device and area context.
- Uses Home Assistant's Alexa adapters to identify supported entities.
- Provides one exposed or hidden state per entity.
- Supports Alexa names, descriptions, and ordered display categories.
- Converts existing manual domain, glob, and entity filters after a reviewed
  migration preview.
- Writes only two dedicated managed YAML files.
- Uses revision checks, versioned backups, atomic replacement, full Home
  Assistant configuration validation, and automatic rollback.
- Requires an administrator for the panel and every backend operation.

## What It Does Not Do

- Create an Alexa Smart Home Skill, AWS Lambda function, HTTPS endpoint, or
  account-linking configuration.
- Manage Home Assistant Cloud Alexa exposure.
- Rewrite `configuration.yaml`, the user-owned Alexa configuration, credentials,
  or unrelated Alexa options.
- Trigger Alexa discovery automatically.
- Support Custom Skills, intent scripts, or Flash Briefings.

## Prerequisites

- Home Assistant `2026.6.4` or newer. Releases are tested against the current
  monthly release and the previous two supported monthly releases.
- A Home Assistant administrator account.
- HACS `2.0.5` or newer.
- A working manual Alexa Smart Home Skill, including AWS Lambda, HTTPS access,
  and account linking. Follow the official [Home Assistant Alexa Smart Home
  documentation](https://www.home-assistant.io/integrations/alexa.smart_home/).
- A current Home Assistant backup and a safe way to edit files under `/config`.

## Install With HACS

These steps apply after a valid `0.1.0` or later release has been published.

1. Open HACS in Home Assistant.
2. Open the three-dot menu and select **Custom repositories**.
3. Enter `https://github.com/tanushshukla/alexa-exposure-manager`.
4. Select **Integration** as the category and add the repository.
5. Search for **Alexa Exposure Manager**, select it, and choose **Download**.
6. Restart Home Assistant when HACS requests it.
7. Go to **Settings > Devices & services > Add integration**.
8. Search for **Alexa Exposure Manager** and complete its config flow.

Do not add YAML for the custom integration itself. The config flow creates one
config entry and creates the two managed files only when they are absent.

## Required Nested Includes

Alexa Exposure Manager never edits these user-owned files. Add the following
structure yourself after the config flow has created the managed files.

`/config/configuration.yaml`:

```yaml
alexa: !include alexa.yaml
```

`/config/alexa.yaml`:

```yaml
smart_home:
  locale: en-US
  filter: !include alexa_exposure_filter.yaml
  entity_config: !include alexa_entity_config.yaml
```

Keep your existing `endpoint`, `client_id`, `client_secret`, and other Alexa
settings under `smart_home`. Store credentials in `secrets.yaml`; never move
them into either managed file.

The integration owns only:

- `/config/alexa_exposure_filter.yaml`
- `/config/alexa_entity_config.yaml`

Run Home Assistant's configuration check, restart Home Assistant, and return to
the panel. Editing remains disabled until the running configuration confirms
that both managed includes are active.

## Daily Use

1. Open the Alexa Exposure Manager panel as a Home Assistant administrator.
2. Search by name, entity ID, device, or area.
3. Expose or hide individual entities, or use the bulk workflow.
4. Open an entity to edit its Alexa name, description, and display categories.
5. Review the pending-change indicator and select **Save changes**.
6. Restart Home Assistant when convenient after a successful save.
7. Say "Alexa, discover devices" or start discovery in the Alexa app.

With **Expose new entities** off, the managed filter is an explicit
`include_entities` allowlist and new entities remain hidden. With it on, the
managed filter is an explicit `exclude_entities` blocklist and new supported
entities are exposed. Switching modes preserves the effective exposure of all
existing and explicitly missing entities.

## Documentation

- [Complete user guide](docs/USER_GUIDE.md)
- [Disposable Home Assistant acceptance harness](docs/ACCEPTANCE.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [0.1.0 release notes](docs/releases/0.1.0.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Development Checks

Frontend checks:

```bash
npm ci
npm run lint
npm test
npm run build
```

Release-artifact syntax checks:

```bash
scripts/validate-release-artifacts.sh
```

The Python, HACS, Hassfest, and compatibility workflows intentionally fail if
the production custom integration or backend tests are missing. They must not be
converted into silent skips for a release.

## Support

Use [GitHub Issues](https://github.com/tanushshukla/alexa-exposure-manager/issues)
for reproducible integration defects. Start with redacted diagnostics. A full
managed-YAML export can reveal entity IDs, household names, and descriptions;
share it only after reviewing it and only when explicitly requested.

## License

MIT
