# Alexa Exposure Manager MVP

## Goal

Give administrators a safe visual editor for the entity filters and per-entity metadata used by Home Assistant's manually configured Alexa Smart Home Skill.

## Primary User

A Home Assistant administrator who already runs the manual Alexa integration and currently edits `alexa.smart_home.filter` and `entity_config` in YAML.

## Core Jobs

1. See which entities Alexa can currently access.
2. Understand whether exposure is explicit or inherited from a domain/glob rule.
3. Explicitly include or exclude one or many entities.
4. Edit Alexa-facing names and display categories.
5. Preview generated YAML and validate changes before saving.

## MVP Scope

- Search entities by name or entity ID.
- Filter by area, domain, integration, and effective exposure.
- Show explicit include, explicit exclude, and inherited states.
- Select entities and apply bulk exposure changes.
- Edit an entity's Alexa name, description, and display category.
- Configure include/exclude domains and globs in an advanced rules view.
- Preview deterministic generated YAML.
- Simulate validation and save/restart states in the standalone prototype.

## Safety Boundaries

- The production integration will only own dedicated include files.
- Alexa credentials and the user's main `configuration.yaml` remain outside the app.
- Write operations must require a Home Assistant administrator.
- The production backend must use fixed paths, revision hashes, atomic writes, validation, and rollback.

## Out Of Scope For This Prototype

- Direct access to a Home Assistant instance.
- Reading or writing files under `/config`.
- Restarting Home Assistant.
- Importing arbitrary nested YAML structures.

## Success Criteria

- A user can identify why an entity is exposed without opening YAML.
- A user can change multiple entities in fewer interactions than manual file editing.
- The generated YAML accurately reflects the current UI state.
- The interface works at 375px, 768px, and desktop widths.
