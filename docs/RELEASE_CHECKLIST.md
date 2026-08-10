# Release Checklist

No tag or GitHub release should be created until every required item is complete.
Issue [#11](https://github.com/tanushshukla/alexa-exposure-manager/issues/11)
tracks the first release, and issue
[#12](https://github.com/tanushshukla/alexa-exposure-manager/issues/12) is the
canonical v1 specification.

## Repository Structure

- [ ] `custom_components/alexa_exposure_manager` contains the complete runtime.
- [ ] `manifest.json` declares domain, name, version `0.1.0`, documentation,
  issue tracker, code owners, config flow, and valid integration metadata.
- [ ] Config flow strings use Home Assistant translation resources and the
  panel ships its English strings compiled into the custom panel.
- [ ] The production panel is Lit and bundled with the integration.
- [ ] Standalone React runtime and sample data are absent from the release.
- [ ] `hacs.json` minimum versions match supported policy.
- [ ] MIT `LICENSE` is present and unchanged.

## Automated Gates

- [ ] Frontend lint passes.
- [ ] Frontend tests pass.
- [ ] Frontend production build passes.
- [ ] Python Ruff lint and format checks pass.
- [ ] Python mypy check passes.
- [ ] Backend tests pass.
- [ ] Compatibility tests pass for HA `2026.6.4` with test package `0.13.340`.
- [ ] Compatibility tests pass for HA `2026.7.4` with test package `0.13.348`.
- [ ] Compatibility tests pass for HA `2026.8.1` with test package `0.13.355`.
- [ ] HACS validation passes without ignored checks.
- [ ] Hassfest passes.
- [ ] Dependency review, npm audit, Python runtime requirement audit, and secret
  scan pass.
- [ ] `scripts/validate-release-artifacts.sh` passes.

## Disposable Acceptance

- [ ] Config flow creates one config entry.
- [ ] Missing managed files are created and existing files remain untouched.
- [ ] Setup-only panel shows exact nested includes and disables editing.
- [ ] Administrator authorization is enforced for panel and backend commands.
- [ ] Real registry entities load with device and area context.
- [ ] Search and support reasons work at desktop and mobile widths.
- [ ] Migration preview preserves effective exposure, metadata, and missing IDs.
- [ ] Individual, metadata, bulk, and expose-new-entities workflows pass.
- [ ] Revision conflicts reject stale saves.
- [ ] Deterministic two-file save, backups, atomic replacement, validation, and
  rollback pass.
- [ ] Restart-required state persists until active revisions match after restart.
- [ ] Backup restore uses the full safe-save path.
- [ ] Unsupported YAML structures produce read-only mode.
- [ ] Default diagnostics are redacted and full export requires explicit warning.

## Home Assistant OS Owner Acceptance

- [ ] Take and verify a restorable full Home Assistant backup.
- [ ] Install through HACS custom repository on Home Assistant OS.
- [ ] Run config flow and activate exact nested includes in the owner's real
  user-owned Alexa configuration.
- [ ] Migrate a representative existing filter and compare effective exposure.
- [ ] Verify real devices, areas, unsupported entities, unavailable entities, and
  missing configured IDs.
- [ ] Save, validate, postpone restart, confirm restart, and recover after restart.
- [ ] Ask Alexa to discover devices and verify additions, removals, names,
  categories, and controls.
- [ ] Restore one known-good managed backup through the panel.
- [ ] Inspect redacted diagnostics and full export for privacy leakage.
- [ ] Roll back to the pre-install full Home Assistant backup in a controlled test
  or verify the documented rollback process with the owner.

## Documentation Review

- [ ] Prerequisites and scope boundaries are unambiguous.
- [ ] HACS custom repository instructions match the released repository.
- [ ] Nested include examples are exact and configuration-check instructions are
  present.
- [ ] Migration, daily use, expose-new-entities behavior, save safety, backups,
  rollback, restart, Alexa discovery, recovery, privacy, and troubleshooting are
  complete.
- [ ] No document describes the React prototype as production behavior.
- [ ] `CHANGELOG.md` and `docs/releases/0.1.0.md` match the shipped runtime.

## Remote Publication

- [ ] Merge the reviewed release commit.
- [ ] Create signed or annotated tag `v0.1.0` from the accepted commit.
- [ ] Publish a GitHub release using `docs/releases/0.1.0.md`.
- [ ] Verify HACS can install the release, not merely the default branch.
- [ ] Monitor installation and security reports.

Remote publication is a maintainer action. Automation or an agent preparing
these artifacts must not create the tag or publish the release without explicit
authorization.
