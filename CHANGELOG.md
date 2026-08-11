# Changelog

All notable changes to Alexa Exposure Manager are documented here. The project
uses semantic versioning once releases are published.

## [Unreleased]

## [0.1.3] - 2026-08-11

### Fixed

- The panel now shows the actual reason when Alexa exposure data cannot be
  loaded. Home Assistant rejects WebSocket calls with a plain `{code, message}`
  object rather than an `Error`, so every load failure rendered as
  `[object Object]` and hid the cause.

## [0.1.2] - 2026-08-11

### Fixed

- Migration no longer discards configured entity IDs that Home Assistant no
  longer knows. A hidden entity is recorded by its absence from the filter, so
  missing IDs are now retained in the entity configuration until they are
  removed explicitly. Previously every stale ID from a legacy `exclude_entities`
  list was lost.
- Migration no longer imports entities Alexa cannot control. Domains without a
  Home Assistant Alexa adapter, such as `select`, `calendar`, and `notify`, are
  counted as unsupported and skipped unless they carry Alexa metadata, which is
  preserved as hidden. A normal save already refused to expose them.
- Migration reads the Alexa configuration captured before activation instead of
  the managed include files that replaced it. The capture refreshes on every
  restart until activation, and the preview reports which source it used.

### Added

- Migration refuses to import when the managed files changed after the legacy
  configuration was captured, so saved exposure choices are not overwritten.
- The migration preview shows whether it read a captured configuration and when
  that capture was taken.

## [0.1.1] - 2026-08-10

### Fixed

- Panel no longer flickers by reloading on every Home Assistant state update.
  Data is loaded once per websocket connection and again only after reconnect.

## [0.1.0] - 2026-08-10

### Added

- HACS custom-repository metadata with Home Assistant `2026.6.4` and HACS
  `2.0.5` minimum versions.
- Complete administrator documentation for installation, nested includes,
  activation, migration, entity management, safe saves, restart, discovery,
  recovery, privacy, troubleshooting, and scope boundaries.
- Frontend lint, test, and build workflow.
- Python lint, type, test, and three-release compatibility workflow.
- HACS and Hassfest validation workflow.
- Dependency review, npm audit, Python manifest requirement audit, and secret
  scan workflow.
- Dependabot configuration for npm and GitHub Actions.
- Disposable Home Assistant acceptance harness with representative entities and
  an inactive-to-active managed-include flow.
- Security policy, contribution guide, release checklist, and release notes.

### Compatibility

- Home Assistant `2026.6.4` with
  `pytest-homeassistant-custom-component==0.13.340`.
- Home Assistant `2026.7.4` with
  `pytest-homeassistant-custom-component==0.13.348`.
- Home Assistant `2026.8.1` with
  `pytest-homeassistant-custom-component==0.13.355`.

[Unreleased]: https://github.com/tanushshukla/alexa-exposure-manager/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/tanushshukla/alexa-exposure-manager/releases/tag/v0.1.1
[0.1.0]: https://github.com/tanushshukla/alexa-exposure-manager/releases/tag/v0.1.0
