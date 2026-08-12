# Alexa Exposure Manager v1 Product Specification

## Canonical Source

GitHub issue [#12](https://github.com/tanushshukla/alexa-exposure-manager/issues/12)
is the approved and canonical v1 specification. If this document, historical
prototype code, or another repository document conflicts with issue #12, issue
#12 takes precedence.

The earlier standalone React prototype explored interaction ideas using sample
data. It is not a product requirement, a Home Assistant frontend architecture,
or an installable integration. In particular, its three-state exposure model,
editable domain/glob rules, custom application shell, and simulated save states
are not part of v1.

## Product Goal

Give Home Assistant administrators a safe, native interface for managing the
entity exposure and per-entity metadata used by Home Assistant's manually
configured Amazon Alexa Smart Home Skill.

## Primary User

A Home Assistant administrator who has already completed the manual Smart Home
Skill, AWS Lambda, external HTTPS, and account-linking setup and currently
manages Alexa exposure in YAML.

## Approved v1 Model

- The integration domain is `alexa_exposure_manager`.
- Installation is through a public HACS custom repository and setup is through
  a single-entry Home Assistant config flow.
- The production frontend is an administrator-only Lit custom panel using Home
  Assistant components and translation resources.
- The user owns `configuration.yaml`, the containing Alexa YAML, credentials,
  and unrelated Alexa features.
- The integration owns only `alexa_exposure_filter.yaml` and
  `alexa_entity_config.yaml`.
- Managed YAML remains the source of truth.
- Each entity has one effective exposed or hidden state.
- Simple **Expose new entities** off/on configurations use `include_entities`
  or `exclude_entities`. Native mixed filters retain all six Home Assistant
  entity-filter sections and use a separate rule-based strategy.
- Empty native filters retain Home Assistant registry-default exposure and are
  not converted implicitly.
- Switching modes preserves current effective exposure.
- Confirmed migration copies legacy entity, domain, glob, and metadata rules
  without flattening, then validates and verifies the saved semantic model.
- Advanced domain and glob rule editing is out of scope after migration, but
  entity changes are stored as explicit exceptions without changing those rules.
- Entity support comes from Home Assistant's built-in Alexa adapters, not a
  separate hardcoded compatibility table.
- Normal edits are staged and saved together with revisions for both files.
- Saves use five retained backup versions, atomic replacement, full Home
  Assistant configuration validation, and two-file rollback.
- A successful save requires a Home Assistant restart but never triggers one
  without administrator confirmation.
- Alexa discovery remains a user action.
- Default diagnostics are redacted. Full managed YAML requires a separate
  privacy warning and explicit confirmation.

## Acceptance Seam

The primary acceptance seam is a disposable running Home Assistant instance.
It must install the custom integration, create a config entry, load the Lit
panel, retrieve real registry entities, stage and save exposure changes, run
full configuration validation, and show restart-required state. Browser checks
cover desktop and mobile workflows. Focused backend tests cover revision
conflicts, migration precedence, interrupted writes, backup retention,
validation failure, rollback, and restore.

The final release gate is an owner-run Home Assistant OS pass with real devices,
areas, entities, backups, restart, and Alexa discovery.

## Release Support

Version `0.1.0` supports Home Assistant `2026.6.4`, `2026.7.4`, and `2026.8.1`.
The matching `pytest-homeassistant-custom-component` versions are `0.13.340`,
`0.13.348`, and `0.13.355` respectively.

## Scope Boundary

Alexa Exposure Manager does not create or configure Amazon or AWS resources,
manage Home Assistant Cloud, edit user-owned Alexa YAML, merge concurrent manual
edits, expose controls to non-administrators, call Amazon APIs, or automatically
trigger discovery.
