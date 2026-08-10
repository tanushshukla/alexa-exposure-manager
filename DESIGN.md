# Alexa Exposure Manager Design

## Personality

Operational, trustworthy, and calm. This is an administrative tool, not a marketing dashboard. Dense information is acceptable when hierarchy and actions remain clear.

## Visual Direction

- Home Assistant-inspired neutral shell with a deep navy sidebar.
- Warm Alexa blue marks exposed entities and primary actions.
- Green is reserved for validated/saved states; red is reserved for explicit exclusion and errors.
- Square-to-soft corners and restrained shadows keep the UI utilitarian.
- Typography uses `Manrope` for interface text and `IBM Plex Mono` for entity IDs and YAML.

## Screen Structure

1. Persistent navigation/sidebar on desktop, compact top bar on mobile.
2. Header with status summary and save action.
3. Overview strip showing exposed, hidden, inherited, and pending counts.
4. Search and filter toolbar.
5. Entity workspace with bulk action bar and dense responsive rows.
6. Context drawer for entity details and Alexa metadata.
7. Advanced rules and YAML preview as focused secondary views.

## Interaction Decisions

- Exposure is a segmented three-state control: Auto, Expose, Hide.
- Inherited entities show the matching rule directly in the row.
- Clicking a row opens details; exposure controls do not require the drawer.
- Save always performs validation first and never implies an automatic restart.
- On mobile, table rows become cards and the sidebar becomes a horizontal view switcher.

## Accessibility

- All actions are keyboard reachable.
- Focus rings use the primary accent with sufficient contrast.
- Color is never the only exposure indicator; labels and icons accompany it.
- Controls have explicit accessible names and minimum 40px touch targets.
