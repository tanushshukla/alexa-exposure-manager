# Changelog

All notable changes to Alexa Exposure Manager are documented here. The project
uses semantic versioning once releases are published.

## [Unreleased]

- Multi-category `display_categories` values in the managed YAML now switch the
  manager to read-only instead of being silently truncated.
- The panel ships its English strings compiled into the custom panel; Home
  Assistant has no translation category for custom panel UI.

## [0.1.0] - Unreleased release candidate

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

### Release Status

No `0.1.0` tag or GitHub release has been created. Publishing remains blocked
until the production custom integration, backend tests, disposable acceptance
pass, and Home Assistant OS owner acceptance pass are complete.

[Unreleased]: https://github.com/tanushshukla/alexa-exposure-manager/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/tanushshukla/alexa-exposure-manager/releases/tag/v0.1.0
