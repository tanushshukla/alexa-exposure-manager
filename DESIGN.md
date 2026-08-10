# Alexa Exposure Manager v1 Design Direction

## Canonical Design Basis

This design follows GitHub issue
[#12](https://github.com/tanushshukla/alexa-exposure-manager/issues/12). The
standalone React prototype is historical context only. Its deep navy application
shell, custom fonts, three-state controls, inherited-rule rows, and editable
advanced rules are explicitly not the production design.

## Product Character

The panel should feel like a focused Home Assistant administration surface:
calm, familiar, transparent, and safe. It should reuse Home Assistant's visual
language and components rather than look like an independent dashboard embedded
inside Home Assistant.

## Production Structure

1. A setup-only state shows prerequisites, managed-file status, and exact nested
   include instructions until activation is verified.
2. The normal state uses a Home Assistant-style entity table with search,
   support state, device and area context, and one exposed or hidden state.
3. **Add entities** opens a searchable, virtualized checklist.
4. Individual entity dialogs show Home Assistant context and Alexa-specific
   name, description, and one display category. Home Assistant 2026.6–2026.8
   accepts a single Alexa display category string in YAML; the inferred default
   is shown when no override is set.
5. A persistent pending-change indicator and save action cover all staged edits.
6. A restart-required banner offers **Restart Home Assistant** and **Later**.
7. A collapsed **Advanced** section contains YAML preview, revisions, validation
   status, backup history, restore, missing entries, and diagnostics.

## Interaction Rules

- Individual exposure and metadata edits do not require confirmation.
- Bulk expose and unexpose actions require one count-based confirmation.
- Restart requires one confirmation.
- Migration requires a preview and explicit confirmation.
- Backup restore uses the same guarded workflow as a normal save.
- Revision conflicts reject the save and require reload. There is no force-save
  or automatic merge.
- Unsupported entities remain visible and searchable, but cannot be newly
  exposed and always show a reason.
- Missing managed entity IDs remain visible until explicitly removed.
- Unknown keys, unsupported values, anchors, or custom YAML tags switch the
  manager to read-only mode instead of discarding data.
- Alexa metadata is independent of exposure and remains when an entity is hidden.
- Saving never implies an automatic restart or automatic Alexa discovery.

## Expose New Entities

The UI presents a single setting, not YAML terminology:

- Off: new entities are hidden by default; existing exposed entities are stored
  in `include_entities`.
- On: new supported entities are exposed by default; existing hidden entities
  are stored in `exclude_entities`.

Mode is derived only from which filter key is present in the managed YAML. The
integration does not write or require a mode marker comment. A hand-edited
switch between `include_entities` and `exclude_entities` is honored on reload.

Changing the setting materializes the current entity state before switching the
managed representation, so existing exposure does not change unexpectedly.

## Responsive Behavior

- Desktop uses the native table density and dialogs familiar to Home Assistant.
- Tablet preserves table scanning and moves secondary actions as needed.
- Mobile uses touch-friendly rows or cards without hiding support status,
  pending changes, or the save action.
- The Add entities list remains virtualized at every width.
- Long entity IDs wrap or truncate with an accessible full-value affordance.

## Accessibility

- Every action is keyboard operable.
- Dialog focus is trapped and restored correctly.
- Controls have visible labels, focus treatment, and disabled-state explanations.
- Color is never the only exposure, support, validation, or error indicator.
- Touch targets follow Home Assistant component sizing.
- Status changes use appropriate live-region behavior without excessive
  announcements.
- Config flow strings use Home Assistant translation resources under
  `component.alexa_exposure_manager.*`. The Lit panel ships its English strings
  compiled into the panel for v1 because Home Assistant has no translation
  category for custom panel UI; a future release can adopt a recognized backend
  translation category to localize the panel.
