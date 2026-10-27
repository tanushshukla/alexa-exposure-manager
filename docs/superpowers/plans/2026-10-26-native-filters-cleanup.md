# Native Filters and Safe Cleanup Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task. User authorized inline implementation of all seven approved tickets without intermediate approval stops.

**Goal:** Deliver issues #59–#65, starting with native filter editing, then exceptions, safe cleanup, recovery and panel polish.

**Architecture:** Extend the existing managed-file transaction with an optional complete native filter draft, preserving the legacy simple-mode API. Backend previews produce authoritative native exposure and reasons. Cleanup is a deterministic draft transformation; missing-reference deletion is checked again inside the serialized save before replacement. All changes retain one transaction and paired backups.

**Tech Stack:** Python 3.14, Home Assistant EntityFilter, administrator WebSocket API, Lit/TypeScript, pytest and Vitest.

**Spec:** Approved GitHub issues https://github.com/tanushshukla/alexa-exposure-manager/issues/59 through /65 and the design approved in this conversation. This is a post-v1 extension; existing file ownership and safety boundaries remain unchanged.

## Global Constraints

- Edit all six native sections; glob patterns are not regex.
- Only the two managed YAML files may change. No reset, device deletion, Amazon calls or automatic restart/discovery.
- Preserve administrator authorization, unsupported-entity protections, read-only YAML handling, revision checks, paired backups, full validation and rollback.
- Registry-default exposure is not implicitly flattened.
- Duplicates are identical entries within one section, keeping the first occurrence. Overlaps are not duplicates.
- Missing means absent from both entity registry and current states; startup/unreliable inventory blocks missing cleanup.
- Existing pending edits must survive navigation, previews, cleanup and failures.

## Review Focus

- Complete removal of include rules must preview registry-default/future exposure, not silently turn into a deny-all sentinel.
- Out-of-order preview responses must not authorize saving or overwrite newer draft results.
- Unsupported entities selected by broad rules remain visible but cannot acquire fabricated Alexa support.
- A missing entity reappearing between preview and save must prevent cleanup without partial writes.
- Restore with pending edits and unhealthy backups must never silently discard edits or replace files.

## Files and boundaries

- `managed_files.py`: optional filter draft, preview/save revisions, native results, cleanup eligibility callback inside save lock; retain existing transaction machinery.
- `filter_rules.py` (new): native matching explanations and deterministic duplicate/missing cleanup findings/application, independent of I/O.
- `compatibility.py`: reliable registry/state inventory after startup.
- `runtime.py` and `websocket.py`: authorized draft preview, cleanup preview/selection and validation.
- `src/filter-rules.ts` (new): six section vocabulary and typed frontend draft/preview shapes.
- `src/alexa-exposure-manager-panel.ts`: shared draft, rule editor, reasons, cleanup/recovery, navigation; existing dialogs remain intact.
- Backend seam tests exercise public transaction/runtime/WebSocket operations; frontend seam tests exercise rendered controls and emitted API messages, matching the approved testing approach.

## Execution checklist

### 1. #59 — Native filter editing and impact preview
- [x] Add failing transaction test: complete six-section draft plus metadata produces native exposure and round-trips patterns; preview does not write.
- [x] Implement optional `filter_config` in preview/save; validate via existing managed parser and native schema; apply entity edits against that draft, preserving rule lists.
- [x] Return draft filter, strategy and exposure from preview; runtime adds impact, default behavior and reasons using native semantics.
- [x] Add failing rendered-panel test for six editable sections, preview and staged save; implement shared rules draft and stale-preview invalidation.
- [x] Run focused backend/frontend tests and TypeScript checks; document and commit #59.

### 2. #60 — Reasons and Use rules
- [x] Test native reasons and removing both explicit exceptions without deleting metadata.
- [x] Implement `use_rules` entity update and backend draft reasons; expose action and current-draft reasons in panel.
- [x] Run focused tests/typechecking and commit #60.

### 3. #61 — Exact duplicate cleanup
- [x] Test duplicate findings with section/value/count, selective application, first-occurrence/order retention and no automatic deduplication.
- [x] Implement cleanup preview over the current draft and selectable Settings UI, staging resulting filter without writing.
- [x] Verify existing pending metadata/entity edits survive; run focused tests and commit #61.

### 4. #62 — Missing-reference cleanup
- [x] Test registry/state inventory, disabled/unavailable/state-only cases, startup rejection, metadata-only references and reappearing entity at save.
- [x] Implement reliable inventory and revalidation callback in save lock; missing selections remove explicit entity references and metadata together only.
- [x] Implement selectable missing preview and safe per-row removal through the same workflow.
- [x] Run focused tests/typechecking and commit #62.

### 5. #63 — Combined cleanup
- [x] Test combined/partial selections, overlap counted once, stale preview invalidation and preservation of pending edits.
- [x] Expose combined checks using shared findings/application, not a separate save route; no reset.
- [x] Run focused tests/typechecking and commit #63.

### 6. #64 — Recovery
- [x] Test unhealthy backups and pending-edit restore protection; verify backup failure cannot replace files.
- [x] Improve timestamp/health display, disable unhealthy restore, require explicit discard before restore, reload catalog and previews after restore.
- [x] Run focused tests and commit #64.

### 7. #65 — Integrated panel polish and verification
- [x] Consolidate Entities / Filter rules / Settings navigation, shared Save/Discard, accessible status and mobile layout.
- [x] Add rendered keyboard/navigation/error tests and acceptance checklist for all new flows.
- [x] Run full backend/frontend suites, lint, formatting, mypy, TypeScript/build and artifact checks.
- [x] Run disposable real Home Assistant acceptance/browser checks where environment permits; record limitations without claiming unrun checks passed.
- [x] Run code-review skill against the implementation, fix findings, rerun verification and commit final changes.

## Progress

- [x] Approved scope, constraints and dependency edges captured in seven published issues.
- [x] Isolated worktree created; original generated frontend modifications left untouched.
- [x] Frontend baseline: 26 tests passing.
- [x] Backend baseline: install pinned Home Assistant test dependencies (initial environment lacked them).

## Final review record

One fresh-context whole-branch review found six consequential issues. The final
fix pass reproduced each with a failing regression and corrected explicit
exception intent (including bulk after Use rules), authoritative reload after
every save, editing locks during restore/save, pending mode/metadata conversion
before Use rules, and lossless simple-list cleanup without `filter_config`.
The final suite and acceptance evidence is recorded in `docs/ACCEPTANCE.md`.

Rulings retained from execution:

1. Published approved issues are the written specification; execute inline
   without further approval stops, as requested. Cost if wrong: scope corrections
   before merge.
2. Recheck inventory under the serialized transaction before replacement and
   after asynchronous validation; roll back if an entity reappears. This avoids
   off-thread HA registry access. Cost if wrong: transient files during validation,
   never a successful destructive cleanup.
3. Retain recovery from an unhealthy/read-only current pair using a healthy
   paired backup. Ordinary editing stays blocked; restore is the explicit
   administrator recovery operation. Cost if wrong: the administrator replaces
   current unsupported YAML when deliberately confirming recovery.
4. Live acceptance covers disposable HA 2026.8.1 with headless Chromium, not
   Amazon/AWS discovery or the complete HA patch matrix. Cost if wrong:
   version/device-specific behavior requires further acceptance before release.

No minor review findings were deferred. No push, PR, merge, release, or issue
closure is part of this local implementation handoff.
