# Changelog

All notable changes to Alexa Exposure Manager are documented here. The project
uses semantic versioning once releases are published.

## [Unreleased]

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
