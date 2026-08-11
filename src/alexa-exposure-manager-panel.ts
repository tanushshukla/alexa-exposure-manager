import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import type {
  AlexaEntity,
  EntityDraft,
  EntitiesResponse,
  HomeAssistant,
  PanelConfig,
  PanelRoute,
  StatusResponse,
  ValidationIssue,
} from "./types";
import { displayCategories, t } from "./translations";

export class AlexaExposureManagerPanel extends LitElement {
  static properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    route: { attribute: false },
    panel: { attribute: false },
    loading: { state: true },
    error: { state: true },
    status: { state: true },
    entitiesResponse: { state: true },
    query: { state: true },
    staged: { state: true },
    saving: { state: true },
    saveError: { state: true },
    exposeNewEntities: { state: true },
    addDialogOpen: { state: true },
    addQuery: { state: true },
    addSelection: { state: true },
    selectedEntities: { state: true },
    bulkConfirmOpen: { state: true },
    bulkAction: { state: true },
    metadataEntityId: { state: true },
    metadataDraft: { state: true },
    visibility: { state: true },
    advancedOpen: { state: true },
    advancedLoading: { state: true },
    advancedError: { state: true },
    previewResponse: { state: true },
    backupsResponse: { state: true },
    diagnosticsResponse: { state: true },
    confirmation: { state: true },
    confirmationTarget: { state: true },
    operationMessage: { state: true },
    migrationPreviewResponse: { state: true },
    migrationLoading: { state: true },
    migrationError: { state: true },
    validationIssues: { state: true },
    restartBannerDismissed: { state: true },
    candidateWindowStart: { state: true },
  };

  declare hass?: HomeAssistant;
  declare narrow: boolean;
  declare route?: PanelRoute;
  declare panel?: PanelConfig;

  declare private loading: boolean;
  declare private error: string;
  declare private status?: StatusResponse;
  declare private entitiesResponse?: EntitiesResponse;
  declare private query: string;
  declare private staged: Record<string, EntityDraft>;
  declare private saving: boolean;
  declare private saveError: string;
  declare private exposeNewEntities: boolean;
  declare private addDialogOpen: boolean;
  declare private addQuery: string;
  declare private addSelection: string[];
  declare private selectedEntities: string[];
  declare private bulkConfirmOpen: boolean;
  declare private bulkAction: "expose" | "unexpose";
  declare private metadataEntityId?: string;
  declare private metadataDraft?: EntityDraft;
  declare private visibility: "all" | "exposed" | "hidden" | "unsupported" | "missing";
  declare private advancedOpen: boolean;
  declare private advancedLoading: boolean;
  declare private advancedError: string;
  declare private previewResponse?: Record<string, unknown>;
  declare private backupsResponse?: Record<string, unknown>;
  declare private diagnosticsResponse?: unknown;
  declare private confirmation?: "restore" | "support" | "restart" | "migration";
  declare private confirmationTarget?: string;
  declare private operationMessage: string;
  declare private migrationPreviewResponse?: Record<string, unknown>;
  declare private migrationLoading: boolean;
  declare private migrationError: string;
  declare private validationIssues: ValidationIssue[];
  declare private restartBannerDismissed: boolean;
  declare private candidateWindowStart: number;
  private baseExposeNewEntities = false;
  private dialogTrigger?: HTMLElement;
  private loadedConnection?: HomeAssistant["connection"];
  private static readonly CANDIDATE_WINDOW = 40;

  constructor() {
    super();
    this.narrow = false;
    this.loading = true;
    this.error = "";
    this.query = "";
    this.staged = {};
    this.saving = false;
    this.saveError = "";
    this.exposeNewEntities = false;
    this.addDialogOpen = false;
    this.addQuery = "";
    this.addSelection = [];
    this.selectedEntities = [];
    this.bulkConfirmOpen = false;
    this.bulkAction = "unexpose";
    this.visibility = "all";
    this.advancedOpen = false;
    this.advancedLoading = false;
    this.advancedError = "";
    this.operationMessage = "";
    this.migrationLoading = false;
    this.migrationError = "";
    this.validationIssues = [];
    this.restartBannerDismissed = false;
    this.candidateWindowStart = 0;
  }

  protected updated(changed: PropertyValues) {
    if (
      changed.has("hass") &&
      this.hass &&
      this.hass.connection !== this.loadedConnection
    ) {
      this.loadedConnection = this.hass.connection;
      void this.load();
    }
    const openedConfirmation =
      (changed.has("confirmation") && this.confirmation) ||
      (changed.has("bulkConfirmOpen") && this.bulkConfirmOpen);
    if (openedConfirmation) {
      const active = (this.renderRoot as ShadowRoot).activeElement;
      if (active instanceof HTMLElement) this.dialogTrigger = active;
      queueMicrotask(() => {
        this.renderRoot
          .querySelector<HTMLButtonElement>("[role='alertdialog'] footer button:last-child")
          ?.focus();
      });
    }
    const closedConfirmation =
      (changed.has("confirmation") && changed.get("confirmation") && !this.confirmation) ||
      (changed.has("bulkConfirmOpen") && changed.get("bulkConfirmOpen") && !this.bulkConfirmOpen);
    if (closedConfirmation) queueMicrotask(() => this.dialogTrigger?.focus());
  }

  private async load() {
    if (!this.hass) return;
    this.loading = true;
    this.error = "";
    try {
      const [status, entitiesResponse] = await Promise.all([
        this.hass.connection.sendMessagePromise<StatusResponse>({
          type: "alexa_exposure_manager/status",
        }),
        this.hass.connection.sendMessagePromise<EntitiesResponse>({
          type: "alexa_exposure_manager/entities",
        }),
      ]);
      this.status = status ?? {};
      this.entitiesResponse = Array.isArray(entitiesResponse)
        ? { entities: entitiesResponse }
        : entitiesResponse ?? {};
      this.baseExposeNewEntities = this.entitiesResponse.expose_new_entities ?? this.status.expose_new_entities ?? false;
      this.exposeNewEntities = this.baseExposeNewEntities;
    } catch (error) {
      this.error = this.errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  protected render() {
    return html`
      <main class=${this.narrow ? "narrow" : ""}>
        ${this.loading
          ? html`<section class="state" role="status"><div class="spinner"></div>${t("loading")}</section>`
          : nothing}
        ${!this.loading && this.error
          ? html`<section class="state error" role="alert">
              <h1>${t("loadErrorTitle")}</h1>
              <p>${this.error}</p>
              <button type="button" @click=${this.load}>${t("retry")}</button>
            </section>`
          : nothing}
        ${!this.loading && !this.error && !this.isConfigured()
          ? this.renderSetup()
          : nothing}
        ${!this.loading && !this.error && this.isConfigured()
          ? this.renderManager()
          : nothing}
        ${this.addDialogOpen ? this.renderAddDialog() : nothing}
        ${this.bulkConfirmOpen ? this.renderBulkConfirmation() : nothing}
        ${this.metadataEntityId && this.metadataDraft ? this.renderMetadataDialog() : nothing}
        ${this.confirmation ? this.renderOperationConfirmation() : nothing}
      </main>
    `;
  }

  private isConfigured() {
    return this.status?.configured ?? this.status?.setup_complete ?? false;
  }

  private get entityCount() {
    return Array.isArray(this.entitiesResponse?.entities)
      ? this.entitiesResponse.entities.length
      : 0;
  }

  private renderSetup() {
    const migrationReady = this.status?.managed_files?.safe_defaults === true &&
      this.status?.migration_available === true;
    return html`
      <section class="setup">
        <span class="eyebrow">${t(migrationReady ? "recoveryEyebrow" : "setupEyebrow")}</span>
        <h1>${t(migrationReady ? "recoveryTitle" : "setupTitle")}</h1>
        <p>${t(migrationReady ? "recoveryBody" : "setupBody")}</p>
        ${migrationReady
          ? html`<ol class="recovery-steps">
              <li>${t("recoveryKeepInline")}</li>
              <li>${t("recoveryPreview")}</li>
              <li>${t("recoveryImport")}</li>
              <li>${t("recoveryReplace")}</li>
              <li>${t("recoveryRestart")}</li>
              <li>${t("recoveryDiscover")}</li>
            </ol>`
          : nothing}
        <strong class="setup-label">${t("setupConfigurationLabel")}</strong>
        <pre><code>${t("setupConfigurationInclude")}</code></pre>
        <strong class="setup-label">${t("setupAlexaLabel")}</strong>
        <pre><code>${t("setupSmartHome")}\n  ${t("setupFilter")}\n  ${t("setupEntityConfig")}</code></pre>
        <p class="safety">${t("setupSafety")}</p>
        ${this.status?.migration_available === false
          ? html`<div class="setup-source-note">
              <strong>${t("migrationMissingTitle")}</strong>
              <span>${t("migrationMissingSetupBody")}</span>
            </div>`
          : nothing}
        ${this.status?.migration_available !== false
          ? html`<div class="migration">
              <p>${t("migrationBody")}</p>
              ${this.renderMigrationActions()}
            </div>`
          : nothing}
      </section>
    `;
  }

  private renderMigrationActions() {
    return html`
      <button type="button" aria-label=${t("migrationPreview")} ?disabled=${this.migrationLoading} @click=${this.previewMigration}>${t("migrationPreview")}</button>
      ${this.migrationPreviewResponse
        ? html`<div class="migration-result" role="status">
            <span>${this.migrationSummary()}</span>
            <span class="migration-source">${this.migrationSource()}</span>
            ${typeof this.migrationPreviewResponse.token === "string"
              ? html`<button class="secondary" type="button" aria-label=${t("migrationImport")} @click=${() => { this.confirmation = "migration"; }}>${t("migrationImport")}</button>`
              : nothing}
          </div>`
        : nothing}
      ${this.migrationError
        ? html`<p class="migration-error" role="alert">${this.migrationError}</p>`
        : nothing}
    `;
  }

  private renderConfiguredMigration() {
    if (this.status?.migration_state === "complete") return nothing;
    if (this.status?.migration_available) {
      return html`<section class="migration-notice">
        <div>
          <strong>${t("migrationReadyTitle")}</strong>
          <span>${t("migrationReadyBody")}</span>
        </div>
        ${this.renderMigrationActions()}
      </section>`;
    }
    return html`<section class="migration-notice missing-source">
      <div>
        <strong>${t("migrationMissingTitle")}</strong>
        <span>${t("migrationMissingBody")}</span>
      </div>
    </section>`;
  }

  private renderManager() {
    const entities = this.normalizedEntities;
    const query = this.query.trim().toLocaleLowerCase();
    const filtered = entities.filter((entity) => {
      const exposed = this.staged[entity.entityId]?.exposed ?? entity.exposed;
      const searchMatches = !query || [entity.name, entity.entityId, entity.deviceName, entity.areaName]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
      const visibilityMatches = this.visibility === "all" ||
        (this.visibility === "exposed" && exposed) ||
        (this.visibility === "hidden" && !exposed) ||
        (this.visibility === "unsupported" && !entity.supported) ||
        (this.visibility === "missing" && entity.missing);
      return searchMatches && visibilityMatches;
    });

    return html`
      <div class="manager">
        <header class="page-header">
          <div>
            <span class="eyebrow">${t("headerEyebrow")}</span>
            <h1>${t("entitiesTitle")}</h1>
            <p>${t("entitiesBody")}</p>
          </div>
          <div class="save-group">
            ${this.pendingCount
              ? html`<span class="pending" role="status">${this.pendingCount === 1
                    ? t("pendingOne")
                    : t("pendingMany", { count: this.pendingCount })}</span>`
              : nothing}
            <button
              type="button"
              aria-label=${t("save")}
              ?disabled=${this.pendingCount === 0 || this.saving || !this.editingEnabled}
              @click=${this.save}
            >${this.saving ? t("saving") : t("save")}</button>
          </div>
        </header>

        ${this.renderConfiguredMigration()}
        ${this.status?.restart_required ? this.renderRestartBanner() : nothing}
        ${!this.editingEnabled
          ? html`<section class="message error" role="alert"><strong>${t("readOnlyTitle")}</strong><span>${t("readOnlyBody")} ${(this.status?.read_only_reasons ?? []).join(" ")}</span></section>`
          : nothing}
        ${this.saveError
          ? html`<section class="message error" role="alert"><strong>${t("saveErrorTitle")}</strong><span>${this.saveError}</span></section>`
          : nothing}
        ${this.validationIssues.length
          ? html`<section class="message error validation" role="alert"><strong>${t("validationTitle")}</strong><ul>${this.validationIssues.map((issue) => html`<li>${t("validationIssue", { entity: issue.entity_id ?? issue.field ?? t("entitiesTitle"), message: issue.message })}</li>`)}</ul></section>`
          : nothing}

        <section class="workspace">
          <div class="toolbar">
            <label>
              <span class="sr-only">${t("entitySearchLabel")}</span>
              <input
                type="search"
                aria-label=${t("entitySearchLabel")}
                placeholder=${t("entitySearchPlaceholder")}
                .value=${this.query}
                @input=${(event: InputEvent) => {
                  this.query = (event.currentTarget as HTMLInputElement).value;
                }}
              />
            </label>
            <label class="visibility-filter">
              <span class="sr-only">${t("visibilityFilter")}</span>
              <select aria-label=${t("visibilityFilter")} .value=${this.visibility} @change=${(event: Event) => {
                this.visibility = (event.currentTarget as HTMLSelectElement).value as typeof this.visibility;
              }}>
                <option value="all">${t("visibilityAll")}</option>
                <option value="exposed">${t("visibilityExposed")}</option>
                <option value="hidden">${t("visibilityHidden")}</option>
                <option value="unsupported">${t("visibilityUnsupported")}</option>
                <option value="missing">${t("visibilityMissing")}</option>
              </select>
            </label>
            <div class="toolbar-actions">
              <div class="mode-control">
                <button
                  class="toggle"
                  type="button"
                  role="switch"
                  aria-checked=${String(this.exposeNewEntities)}
                  aria-label=${t("exposeNewLabel")}
                  ?disabled=${!this.editingEnabled}
                  @click=${() => {
                    this.exposeNewEntities = !this.exposeNewEntities;
                    this.saveError = "";
                  }}
                ><span></span></button>
                <span><strong>${t("exposeNewLabel")}</strong><small>${t("exposeNewHelp")}</small></span>
              </div>
              <button class="secondary" type="button" aria-label=${t("addEntities")} ?disabled=${!this.editingEnabled} @click=${this.openAddDialog}>
                <ha-icon icon="mdi:plus"></ha-icon>${t("addEntities")}
              </button>
            </div>
          </div>
          ${this.selectedEntities.length
            ? html`<div class="bulk-bar">
                <strong>${t("selectedCount", { count: this.selectedEntities.length })}</strong>
                <button class="secondary" type="button" aria-label=${t("exposeSelectedBulk")} ?disabled=${!this.editingEnabled} @click=${() => this.openBulkConfirm("expose")}>${t("exposeSelectedBulk")}</button>
                <button class="danger-secondary" type="button" aria-label=${t("unexposeSelected")} ?disabled=${!this.editingEnabled} @click=${() => this.openBulkConfirm("unexpose")}>${t("unexposeSelected")}</button>
                <button class="text-button" type="button" @click=${() => { this.selectedEntities = []; }}>${t("clearSelection")}</button>
              </div>`
            : nothing}
          ${filtered.length
            ? html`
                <div class="entity-table" role="table">
                  <div class="table-head" role="row">
                    <span role="columnheader"></span>
                    <span role="columnheader">${t("entityColumn")}</span>
                    <span role="columnheader">${t("contextColumn")}</span>
                    <span role="columnheader">${t("statusColumn")}</span>
                    <span role="columnheader">${t("exposureColumn")}</span>
                    <span role="columnheader"></span>
                  </div>
                  ${filtered.map((entity) => this.renderEntity(entity))}
                </div>
              `
            : html`<div class="empty"><strong>${t(this.entityCount === 0 ? "emptyTitle" : "filteredEmptyTitle")}</strong><span>${t(this.entityCount === 0 ? "emptyBody" : "filteredEmptyBody")}</span></div>`}
        </section>
        ${this.renderAdvanced()}
      </div>
    `;
  }

  private renderEntity(entity: AlexaEntity) {
    const draft = this.staged[entity.entityId];
    const exposed = draft?.exposed ?? entity.exposed;
    const actionLabel = exposed
      ? t("hideEntity", { name: entity.name })
      : t("exposeEntity", { name: entity.name });
    return html`
      <div class=${`entity-row${entity.supported ? "" : " unsupported"}${entity.missing ? " missing" : ""}`} role="row">
        <div role="cell">
          <input
            class="row-checkbox"
            type="checkbox"
            aria-label=${t("selectForBulk", { name: entity.name })}
            .checked=${this.selectedEntities.includes(entity.entityId)}
            @change=${() => this.toggleSelectedEntity(entity.entityId)}
          />
        </div>
        <div class="entity-main" role="cell">
          <ha-icon icon=${this.iconFor(entity.domain)}></ha-icon>
          <span><strong>${entity.name}</strong><code>${entity.entityId}</code></span>
        </div>
        <div class="context" role="cell">
          <span>${entity.deviceName || t("noDevice")}</span>
          <small>${entity.areaName || t("noArea")}</small>
        </div>
        <div class="availability" role="cell">
          <span class=${entity.missing || !entity.supported ? "warning" : "ok"}>
            ${entity.missing ? t("missing") : entity.supported ? t("available") : t("unsupported")}
          </span>
          ${!entity.supported && entity.unsupportedReason
            ? html`<small>${entity.unsupportedReason}</small>`
            : nothing}
        </div>
        <div class="exposure" role="cell">
          <span class=${exposed ? "exposed" : "hidden"}>${exposed ? t("exposed") : t("hidden")}</span>
          <button
            class="toggle"
            type="button"
            role="switch"
            aria-checked=${String(exposed)}
            aria-label=${actionLabel}
            ?disabled=${entity.missing || !entity.supported || !this.editingEnabled}
            @click=${() => this.stageExposure(entity, !exposed)}
          ><span></span></button>
        </div>
        <div role="cell" class="row-actions">
          ${entity.missing
            ? html`<button class="icon" type="button" aria-label=${t("removeMissing", { name: entity.name })} ?disabled=${!this.editingEnabled} @click=${() => this.stageRemove(entity)}><ha-icon icon="mdi:delete-outline"></ha-icon></button>`
            : html`<button class="icon" type="button" aria-label=${t("editMetadata", { name: entity.name })} ?disabled=${!this.editingEnabled} @click=${(event: Event) => this.openMetadataDialog(entity, event)}><ha-icon icon="mdi:pencil"></ha-icon></button>`}
        </div>
      </div>
    `;
  }

  private stageRemove(entity: AlexaEntity) {
    const staged = { ...this.staged };
    staged[entity.entityId] = { ...this.draftFrom(entity), remove: true, exposed: false };
    this.staged = staged;
    this.saveError = "";
    this.validationIssues = [];
  }

  private stageExposure(entity: AlexaEntity, exposed: boolean) {
    const draft = this.staged[entity.entityId] ?? this.draftFrom(entity);
    const next = { ...draft, exposed };
    const unchanged =
      next.exposed === entity.exposed &&
      next.name === entity.alexaName &&
      next.description === entity.description &&
      next.displayCategories.join("|") === entity.displayCategories.join("|");
    const staged = { ...this.staged };
    if (unchanged) delete staged[entity.entityId];
    else staged[entity.entityId] = next;
    this.staged = staged;
    this.saveError = "";
    this.validationIssues = [];
  }

  private async save() {
    if (!this.hass || !this.pendingCount) return;
    this.saving = true;
    this.saveError = "";
    try {
      const response = await this.hass.connection.sendMessagePromise<StatusResponse>(this.configurationMessage("alexa_exposure_manager/save"));
      if (Array.isArray(response.validation_errors) && response.validation_errors.length > 0) {
        this.validationIssues = response.validation_errors;
        return;
      }
      const savedDrafts = this.staged;
      this.status = { ...this.status, expose_new_entities: this.exposeNewEntities, ...response };
      this.entitiesResponse = {
        ...this.entitiesResponse,
        revision: response.revision ?? this.entitiesResponse?.revision,
        entities_revision: response.entities_revision ?? this.entitiesResponse?.entities_revision,
        expose_new_entities: this.exposeNewEntities,
        entities: this.normalizedEntities.map((entity) => {
          const draft = savedDrafts[entity.entityId];
          return {
            entity_id: entity.entityId,
            name: entity.name,
            state: entity.state,
            area_name: entity.areaName,
            device_name: entity.deviceName,
            integration: entity.integration,
            supported: entity.supported,
            missing: entity.missing,
            unsupported_reason: entity.unsupportedReason,
            exposed: draft?.exposed ?? entity.exposed,
            exposure: draft ? (draft.exposed ? "include" : "exclude") : entity.exposure,
            alexa_name: draft?.name ?? entity.alexaName,
            description: draft?.description ?? entity.description,
            display_categories: draft?.displayCategories ?? entity.displayCategories,
            inferred_display_category: entity.inferredDisplayCategory,
          };
        }),
      };
      this.baseExposeNewEntities = this.exposeNewEntities;
      this.staged = {};
    } catch (error) {
      const message = this.errorMessage(error);
      const code = this.errorCode(error);
      this.saveError = /conflict|revision/i.test(`${code} ${message}`)
        ? `${t("saveConflictTitle")}. ${t("saveConflictBody")}`
        : message;
    } finally {
      this.saving = false;
    }
  }

  private renderRestartBanner() {
    if (this.restartBannerDismissed) return nothing;
    return html`
      <section class="restart" role="status">
        <ha-icon icon="mdi:restart-alert"></ha-icon>
        <div><strong>${t("restartTitle")}</strong><span>${t("restartBody")} ${t("discoveryBody")}</span></div>
        <div class="restart-actions">
          <button class="secondary" type="button" aria-label=${t("restartLater")} @click=${() => { this.restartBannerDismissed = true; }}>${t("restartLater")}</button>
          <button type="button" aria-label=${t("restartButton")} @click=${() => { this.confirmation = "restart"; }}>${t("restartButton")}</button>
        </div>
      </section>
    `;
  }

  private configurationMessage(type: string) {
    return {
      type,
      expected_revision: this.status?.revision ?? "",
      expected_entities_revision: this.entitiesResponse?.entities_revision ?? this.status?.entities_revision ?? "",
      expose_new_entities: this.exposeNewEntities,
      entities: this.entityUpdates(),
    };
  }

  private previewMessage() {
    return {
      type: "alexa_exposure_manager/preview",
      expose_new_entities: this.exposeNewEntities,
      entities: this.entityUpdates(),
    };
  }

  private entityUpdates() {
    return Object.entries(this.staged).map(([entityId, draft]) =>
      draft.remove
        ? { entity_id: entityId, remove: true }
        : {
            entity_id: entityId,
            exposed: draft.exposed,
            name: draft.name,
            description: draft.description,
            display_categories: draft.displayCategories.slice(0, 1),
          },
    );
  }

  private get pendingCount() {
    return Object.keys(this.staged).length +
      (this.exposeNewEntities === this.baseExposeNewEntities ? 0 : 1);
  }

  private get editingEnabled() {
    return this.status?.editing_enabled !== false && this.status?.read_only !== true;
  }

  private async openAddDialog(event: Event) {
    this.dialogTrigger = event.currentTarget as HTMLElement;
    this.addQuery = "";
    this.addSelection = [];
    this.candidateWindowStart = 0;
    this.addDialogOpen = true;
    await this.updateComplete;
    this.renderRoot.querySelector<HTMLInputElement>(`[aria-label="${t("addSearchLabel")}"]`)?.focus();
  }

  private closeAddDialog() {
    this.addDialogOpen = false;
    this.addSelection = [];
    this.candidateWindowStart = 0;
    void this.updateComplete.then(() => this.dialogTrigger?.focus());
  }

  private renderAddDialog() {
    const query = this.addQuery.trim().toLocaleLowerCase();
    const candidates = this.normalizedEntities.filter((entity) => {
      const exposed = this.staged[entity.entityId]?.exposed ?? entity.exposed;
      const matches = !query || [entity.name, entity.entityId, entity.deviceName, entity.areaName]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
      return !exposed && !entity.missing && matches;
    });
    const windowSize = AlexaExposureManagerPanel.CANDIDATE_WINDOW;
    const start = Math.min(this.candidateWindowStart, Math.max(0, candidates.length - windowSize));
    const visible = candidates.slice(start, start + windowSize);
    return html`
      <div class="dialog-backdrop" @mousedown=${(event: MouseEvent) => {
        if (event.target === event.currentTarget) this.closeAddDialog();
      }}>
        <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="add-dialog-title" @keydown=${this.dialogKeydown}>
          <header>
            <div><h2 id="add-dialog-title">${t("addDialogTitle")}</h2><p>${t("addDialogBody")}</p></div>
            <button class="icon" type="button" aria-label=${t("closeDialog")} @click=${this.closeAddDialog}><ha-icon icon="mdi:close"></ha-icon></button>
          </header>
          <label class="dialog-search">
            <span class="sr-only">${t("addSearchLabel")}</span>
            <input
              type="search"
              aria-label=${t("addSearchLabel")}
              placeholder=${t("addSearchPlaceholder")}
              .value=${this.addQuery}
              @input=${(event: InputEvent) => {
                this.addQuery = (event.currentTarget as HTMLInputElement).value;
                this.candidateWindowStart = 0;
              }}
            />
          </label>
          <div class="candidate-list" @scroll=${(event: Event) => this.onCandidateScroll(event, candidates.length)}>
            ${start > 0 ? html`<div class="virtual-spacer" style=${`height:${start * 56}px`}></div>` : nothing}
            ${visible.length
              ? visible.map((entity) => {
                  const disabled = !entity.supported;
                  return html`
                  <label class=${`candidate-row${disabled ? " disabled" : ""}`}>
                    <input
                      type="checkbox"
                      aria-label=${t("selectEntity", { name: entity.name })}
                      .checked=${this.addSelection.includes(entity.entityId)}
                      ?disabled=${disabled}
                      @change=${() => {
                        if (!disabled) this.toggleAddSelection(entity.entityId);
                      }}
                    />
                    <span class="candidate-main">
                      <ha-icon icon=${this.iconFor(entity.domain)}></ha-icon>
                      <span><strong>${entity.name}</strong><code>${entity.entityId}</code></span>
                    </span>
                    <small>
                      ${entity.deviceName || t("noDevice")} · ${entity.areaName || t("noArea")}
                      ${disabled
                        ? html`<span class="unsupported-reason">${t("unsupportedCandidate", {
                            reason: entity.unsupportedReason || t("unsupported"),
                          })}</span>`
                        : nothing}
                    </small>
                  </label>
                `;
                })
              : html`<div class="empty compact"><strong>${t("noCandidatesTitle")}</strong><span>${t("noCandidatesBody")}</span></div>`}
            ${start + visible.length < candidates.length
              ? html`<div class="virtual-spacer" style=${`height:${(candidates.length - start - visible.length) * 56}px`}></div>`
              : nothing}
          </div>
          <footer>
            <span>${t("candidateCount", { shown: visible.length, total: candidates.length })}</span>
            <button class="secondary" type="button" @click=${this.closeAddDialog}>${t("cancel")}</button>
            <button
              type="button"
              aria-label=${t("exposeSelected")}
              ?disabled=${this.addSelection.length === 0}
              @click=${this.requestAddExposeConfirmation}
            >${t("exposeSelected")}</button>
          </footer>
        </section>
      </div>
    `;
  }

  private onCandidateScroll(event: Event, total: number) {
    const target = event.currentTarget as HTMLElement;
    const nextStart = Math.floor(target.scrollTop / 56);
    const maxStart = Math.max(0, total - AlexaExposureManagerPanel.CANDIDATE_WINDOW);
    this.candidateWindowStart = Math.min(Math.max(0, nextStart), maxStart);
  }

  private requestAddExposeConfirmation() {
    if (!this.addSelection.length) return;
    this.selectedEntities = [...this.addSelection];
    this.bulkAction = "expose";
    this.bulkConfirmOpen = true;
    this.addDialogOpen = false;
  }

  private dialogKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") this.closeAddDialog();
  }

  private toggleAddSelection(entityId: string) {
    this.addSelection = this.addSelection.includes(entityId)
      ? this.addSelection.filter((id) => id !== entityId)
      : [...this.addSelection, entityId];
  }

  private exposeSelectedCandidates() {
    const byId = new Map(this.normalizedEntities.map((entity) => [entity.entityId, entity]));
    const staged = { ...this.staged };
    for (const entityId of this.addSelection) {
      const entity = byId.get(entityId);
      if (!entity) continue;
      staged[entityId] = { ...this.draftFrom(entity), exposed: true };
    }
    this.staged = staged;
    this.saveError = "";
    this.validationIssues = [];
    this.closeAddDialog();
  }

  private toggleSelectedEntity(entityId: string) {
    this.selectedEntities = this.selectedEntities.includes(entityId)
      ? this.selectedEntities.filter((id) => id !== entityId)
      : [...this.selectedEntities, entityId];
  }

  private openBulkConfirm(action: "expose" | "unexpose") {
    this.bulkAction = action;
    this.bulkConfirmOpen = true;
  }

  private renderBulkConfirmation() {
    const expose = this.bulkAction === "expose";
    const title = expose
      ? t("bulkExposeConfirmTitle", { count: this.selectedEntities.length })
      : t("bulkUnexposeConfirmTitle", { count: this.selectedEntities.length });
    const body = expose ? t("bulkExposeConfirmBody") : t("bulkUnexposeConfirmBody");
    const confirmLabel = expose ? t("confirmExpose") : t("confirmUnexpose");
    return html`
      <div class="dialog-backdrop">
        <section class="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="bulk-confirm-title" @keydown=${(event: KeyboardEvent) => {
          if (event.key === "Escape") this.bulkConfirmOpen = false;
        }}>
          <header><div><h2 id="bulk-confirm-title">${title}</h2><p>${body}</p></div></header>
          <footer>
            <button class="secondary" type="button" @click=${() => { this.bulkConfirmOpen = false; }}>${t("cancel")}</button>
            <button class=${expose ? "" : "danger"} type="button" aria-label=${confirmLabel} @click=${this.confirmBulkAction}>${confirmLabel}</button>
          </footer>
        </section>
      </div>
    `;
  }

  private confirmBulkAction() {
    const byId = new Map(this.normalizedEntities.map((entity) => [entity.entityId, entity]));
    const staged = { ...this.staged };
    const exposed = this.bulkAction === "expose";
    for (const entityId of this.selectedEntities) {
      const entity = byId.get(entityId);
      if (!entity || (!entity.supported && exposed)) continue;
      const next = { ...(staged[entityId] ?? this.draftFrom(entity)), exposed, remove: undefined };
      if (
        entity.exposed === exposed &&
        next.name === entity.alexaName &&
        next.description === entity.description &&
        next.displayCategories.join("|") === entity.displayCategories.join("|")
      ) {
        delete staged[entityId];
      } else {
        staged[entityId] = next;
      }
    }
    this.staged = staged;
    this.selectedEntities = [];
    this.addSelection = [];
    this.bulkConfirmOpen = false;
    this.saveError = "";
    this.validationIssues = [];
  }

  private async openMetadataDialog(entity: AlexaEntity, event: Event) {
    this.dialogTrigger = event.currentTarget as HTMLElement;
    this.metadataEntityId = entity.entityId;
    this.metadataDraft = { ...(this.staged[entity.entityId] ?? this.draftFrom(entity)), displayCategories: [...(this.staged[entity.entityId]?.displayCategories ?? entity.displayCategories)] };
    await this.updateComplete;
    this.renderRoot.querySelector<HTMLInputElement>(`[aria-label="${t("alexaName")}"]`)?.focus();
  }

  private closeMetadataDialog() {
    this.metadataEntityId = undefined;
    this.metadataDraft = undefined;
    void this.updateComplete.then(() => this.dialogTrigger?.focus());
  }

  private renderMetadataDialog() {
    const entity = this.normalizedEntities.find((item) => item.entityId === this.metadataEntityId);
    const draft = this.metadataDraft;
    if (!entity || !draft) return nothing;
    const exposed = draft.exposed;
    return html`
      <div class="dialog-backdrop">
        <section class="dialog metadata-dialog" role="dialog" aria-modal="true" aria-labelledby="metadata-dialog-title" @keydown=${(event: KeyboardEvent) => {
          if (event.key === "Escape") this.closeMetadataDialog();
        }}>
          <header>
            <div>
              <h2 id="metadata-dialog-title">${t("metadataTitle")}</h2>
              <p>${t("metadataBody")}</p>
              <div class="metadata-context">
                <strong>${t("haNameLabel", { name: entity.name })}</strong>
                <code>${entity.entityId}</code>
                <span>${t("deviceLabel", { device: entity.deviceName || t("noDevice") })}</span>
                <span>${t("areaLabel", { area: entity.areaName || t("noArea") })}</span>
                <span class=${exposed ? "exposed" : "hidden"}>${t("exposureStateLabel", {
                  state: exposed ? t("exposed") : t("hidden"),
                })}</span>
              </div>
            </div>
            <button class="icon" type="button" aria-label=${t("closeDialog")} @click=${this.closeMetadataDialog}><ha-icon icon="mdi:close"></ha-icon></button>
          </header>
          <div class="metadata-content">
            <label class="field"><span>${t("alexaName")}</span><input aria-label=${t("alexaName")} placeholder=${t("alexaNamePlaceholder")} .value=${draft.name} @input=${(event: InputEvent) => {
              if (this.metadataDraft) this.metadataDraft = { ...this.metadataDraft, name: (event.currentTarget as HTMLInputElement).value };
            }} /></label>
            <label class="field"><span>${t("alexaDescription")}</span><textarea aria-label=${t("alexaDescription")} placeholder=${t("alexaDescriptionPlaceholder")} .value=${draft.description} @input=${(event: InputEvent) => {
              if (this.metadataDraft) this.metadataDraft = { ...this.metadataDraft, description: (event.currentTarget as HTMLTextAreaElement).value };
            }}></textarea></label>
            <fieldset>
              <legend>${t("displayCategoriesLabel")}</legend>
              <p>${t("displayCategoriesHelp")}</p>
              <div class="inferred">${t("inferredCategory", { category: entity.inferredDisplayCategory })}</div>
              <label class="field">
                <span class="sr-only">${t("displayCategoriesLabel")}</span>
                <select
                  aria-label=${t("displayCategoriesLabel")}
                  .value=${draft.displayCategories[0] ?? ""}
                  @change=${(event: Event) => {
                    if (!this.metadataDraft) return;
                    const value = (event.currentTarget as HTMLSelectElement).value;
                    this.metadataDraft = {
                      ...this.metadataDraft,
                      displayCategories: value ? [value] : [],
                    };
                  }}
                >
                  <option value="">${t("noDisplayCategory")}</option>
                  ${displayCategories.map(
                    (category) => html`<option value=${category}>${category}</option>`,
                  )}
                </select>
              </label>
            </fieldset>
          </div>
          <footer>
            <button class="secondary" type="button" @click=${this.closeMetadataDialog}>${t("cancel")}</button>
            <button type="button" aria-label=${t("applyMetadata")} @click=${this.applyMetadata}>${t("applyMetadata")}</button>
          </footer>
        </section>
      </div>
    `;
  }



  private applyMetadata() {
    if (!this.metadataEntityId || !this.metadataDraft) return;
    const entity = this.normalizedEntities.find((item) => item.entityId === this.metadataEntityId);
    if (!entity) return;
    const unchanged = this.metadataDraft.exposed === entity.exposed &&
      this.metadataDraft.name === entity.alexaName &&
      this.metadataDraft.description === entity.description &&
      this.metadataDraft.displayCategories.join("|") === entity.displayCategories.join("|");
    const staged = { ...this.staged };
    if (unchanged) delete staged[entity.entityId];
    else staged[entity.entityId] = { ...this.metadataDraft, displayCategories: [...this.metadataDraft.displayCategories] };
    this.staged = staged;
    this.saveError = "";
    this.validationIssues = [];
    this.closeMetadataDialog();
  }

  private errorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error) return String(error.message);
    return String(error);
  }

  private errorCode(error: unknown) {
    if (error && typeof error === "object" && "code" in error) return String(error.code);
    return "";
  }

  private renderAdvanced() {
    return html`
      <section class="advanced">
        <button class="advanced-toggle" type="button" aria-label=${t("advancedTools")} aria-expanded=${String(this.advancedOpen)} @click=${this.toggleAdvanced}>
          <span><strong>${t("advancedTools")}</strong><small>${t("advancedBody")}</small></span>
          <ha-icon icon=${this.advancedOpen ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>
        </button>
        ${this.advancedOpen
          ? html`<div class="advanced-content">
              ${this.advancedLoading ? html`<div class="advanced-state" role="status">${t("advancedLoading")}</div>` : nothing}
              ${this.advancedError ? html`<div class="message error" role="alert">${this.advancedError}</div>` : nothing}
              ${!this.advancedLoading ? this.renderAdvancedGrid() : nothing}
            </div>`
          : nothing}
      </section>
    `;
  }

  private async toggleAdvanced() {
    this.advancedOpen = !this.advancedOpen;
    if (!this.advancedOpen || (this.previewResponse && this.backupsResponse)) return;
    await this.loadAdvanced();
  }

  private async loadAdvanced() {
    if (!this.hass) return;
    this.advancedLoading = true;
    this.advancedError = "";
    try {
      const [preview, backups] = await Promise.all([
        this.hass.connection.sendMessagePromise<Record<string, unknown>>(this.previewMessage()),
        this.hass.connection.sendMessagePromise<Record<string, unknown>>({ type: "alexa_exposure_manager/backups" }),
      ]);
      this.previewResponse = preview ?? {};
      this.backupsResponse = backups ?? {};
    } catch (error) {
      this.advancedError = this.errorMessage(error);
    } finally {
      this.advancedLoading = false;
    }
  }

  private renderAdvancedGrid() {
    const filterYaml = String(this.previewResponse?.filter_yaml ?? this.previewResponse?.filter ?? "");
    const entityYaml = String(this.previewResponse?.entity_config_yaml ?? this.previewResponse?.entity_config ?? "");
    const rawBackups = Array.isArray(this.backupsResponse?.backups) ? this.backupsResponse.backups : [];
    const backups = rawBackups.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
    return html`
      <div class="advanced-grid">
        <section class="advanced-card yaml-card">
          <h3>${t("yamlPreview")}</h3>
          <label>${t("filterYaml")}<pre><code>${filterYaml || t("noPreview")}</code></pre></label>
          <label>${t("entityConfigYaml")}<pre><code>${entityYaml || t("noPreview")}</code></pre></label>
        </section>
        <section class="advanced-card">
          <h3>${t("backupsTitle")}</h3><p>${t("backupsBody")}</p>
          <div class="backup-list">
            ${backups.length ? backups.map((backup) => {
              const id = String(backup.id ?? backup.backup_id ?? "");
              return html`<div><span><strong>${id}</strong><small>${String(backup.created_at ?? backup.created ?? backup.timestamp ?? "")} · ${String(backup.revision ?? "")}</small></span><button class="secondary" type="button" aria-label=${t("restoreBackup", { id })} @click=${() => { this.confirmationTarget = id; this.confirmation = "restore"; }}>${t("restoreBackup", { id })}</button></div>`;
            }) : html`<span class="muted">${t("noBackups")}</span>`}
          </div>
        </section>
        <section class="advanced-card">
          <h3>${t("systemStatus")}</h3>
          <ul><li>${t("configuredStatus")}</li><li>${t("revisionStatus", { revision: this.status?.revision ?? "-" })}</li><li>${t("restartStatus", { value: this.status?.restart_required ? t("yes") : t("no") })}</li><li>${this.renderValidationStatus()}</li><li>${t("migrationStatus", { value: this.migrationStateLabel() })}</li></ul>
        </section>
        <section class="advanced-card">
          <h3>${t("diagnosticsTitle")}</h3><p>${t("diagnosticsBody")}</p>
          <div class="card-actions"><button class="secondary" type="button" aria-label=${t("runDiagnostics")} @click=${this.runDiagnostics}>${t("runDiagnostics")}</button><button class="secondary" type="button" aria-label=${t("supportExport")} @click=${() => { this.confirmation = "support"; }}>${t("supportExport")}</button></div>
          ${this.diagnosticsResponse ? html`<pre class="diagnostics"><code>${JSON.stringify(this.diagnosticsResponse, null, 2)}</code></pre>` : nothing}
          ${this.operationMessage ? html`<p class="operation-message" role="status">${this.operationMessage}</p>` : nothing}
        </section>
      </div>
    `;
  }

  private renderValidationStatus() {
    const validation = this.status?.last_validation;
    if (!validation || !validation.at) return t("validationStatusNone");
    const at = validation.at;
    if (validation.ok) return t("validationStatusOk", { at });
    const error = validation.error ?? "";
    if (validation.rollback === "failed") return t("validationStatusRollbackFailed", { at, error });
    if (validation.rollback === "complete") return t("validationStatusRolledBack", { at, error });
    return t("validationStatusFailed", { at, error });
  }

  private migrationStateLabel() {
    switch (this.status?.migration_state) {
      case "complete":
        return t("migrationComplete");
      case "previewed":
        return t("migrationPreviewed");
      default:
        return t("migrationNotStarted");
    }
  }

  private async runDiagnostics() {
    if (!this.hass) return;
    try {
      this.diagnosticsResponse = await this.hass.connection.sendMessagePromise({ type: "alexa_exposure_manager/diagnostics" });
    } catch (error) {
      this.advancedError = this.errorMessage(error);
    }
  }

  private renderOperationConfirmation() {
    const action = this.confirmation;
    const title = action === "restore" ? t("restoreTitle", { id: this.confirmationTarget ?? "" })
      : action === "support" ? t("supportWarningTitle")
      : action === "restart" ? t("restartConfirmTitle")
      : t("migrationConfirmTitle");
    const body = action === "restore" ? t("restoreBody")
      : action === "support" ? t("supportWarningBody")
      : action === "restart" ? t("restartConfirmBody")
      : t("migrationConfirmBody");
    const confirmLabel = action === "restore" ? t("confirmRestore")
      : action === "support" ? t("confirmSupportExport")
      : action === "restart" ? t("confirmRestart")
      : t("confirmMigration");
    return html`
      <div class="dialog-backdrop">
        <section class="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="operation-confirm-title" @keydown=${(event: KeyboardEvent) => {
          if (event.key === "Escape") this.closeOperationConfirmation();
        }}>
          <header><div><h2 id="operation-confirm-title">${title}</h2><p>${body}</p></div></header>
          <footer><button class="secondary" type="button" @click=${this.closeOperationConfirmation}>${t("cancel")}</button><button class=${action === "restore" ? "danger" : ""} type="button" aria-label=${confirmLabel} @click=${this.confirmOperation}>${confirmLabel}</button></footer>
        </section>
      </div>
    `;
  }

  private closeOperationConfirmation() {
    this.confirmation = undefined;
    this.confirmationTarget = undefined;
  }

  private async confirmOperation() {
    if (!this.hass || !this.confirmation) return;
    const action = this.confirmation;
    const target = this.confirmationTarget;
    this.closeOperationConfirmation();
    try {
      if (action === "restore") {
        const response = await this.hass.connection.sendMessagePromise<StatusResponse>({
          type: "alexa_exposure_manager/restore",
          backup_id: target ?? "",
          expected_revision: this.status?.revision ?? "",
          expected_entities_revision: this.entitiesResponse?.entities_revision ?? this.status?.entities_revision ?? "",
        });
        this.status = { ...this.status, ...response };
      } else if (action === "restart") {
        await this.hass.connection.sendMessagePromise({ type: "alexa_exposure_manager/restart", confirmed: true });
        this.operationMessage = t("restartRequested");
      } else if (action === "support") {
        const response = await this.hass.connection.sendMessagePromise<Record<string, unknown>>({ type: "alexa_exposure_manager/support_export", confirmed: true });
        this.operationMessage = t("supportReady");
        this.downloadSupportExport(response);
      } else {
        await this.hass.connection.sendMessagePromise<StatusResponse>({
          type: "alexa_exposure_manager/migration/confirm",
          token: String(this.migrationPreviewResponse?.token ?? ""),
          expected_revision: String(this.migrationPreviewResponse?.revision ?? this.status?.revision ?? ""),
          expected_entities_revision: String(this.migrationPreviewResponse?.entities_revision ?? this.status?.entities_revision ?? ""),
        });
        this.migrationError = "";
        this.migrationPreviewResponse = undefined;
        this.staged = {};
        await this.load();
      }
    } catch (error) {
      const message = this.errorMessage(error);
      if (action === "migration" && this.isConfigured()) this.migrationError = message;
      else if (this.isConfigured()) this.advancedError = message;
      else this.error = message;
    }
  }

  private downloadSupportExport(response: Record<string, unknown>) {
    const content = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response, null, 2);
    if (typeof URL.createObjectURL !== "function") return;
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = String(response.filename ?? t("supportFilename"));
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private async previewMigration() {
    if (!this.hass) return;
    this.migrationLoading = true;
    this.migrationError = "";
    try {
      this.migrationPreviewResponse = await this.hass.connection.sendMessagePromise<Record<string, unknown>>({ type: "alexa_exposure_manager/migration/preview" });
    } catch (error) {
      if (this.isConfigured()) this.migrationError = this.errorMessage(error);
      else this.error = this.errorMessage(error);
    } finally {
      this.migrationLoading = false;
    }
  }

  private migrationSummary() {
    const counts = this.migrationPreviewResponse?.counts;
    if (!counts || typeof counts !== "object") return t("migrationUnavailable");
    const values = counts as Record<string, unknown>;
    return t("migrationSummary", {
      exposed: Number(values.exposed ?? 0),
      hidden: Number(values.hidden ?? 0),
      unsupported: Number(values.unsupported ?? 0),
      missing: Number(values.missing ?? 0),
    });
  }

  private migrationSource() {
    const source = this.migrationPreviewResponse?.legacy_source;
    if (!source || typeof source !== "object") return nothing;
    const values = source as Record<string, unknown>;
    if (values.from_snapshot !== true) return t("migrationSourceLive");
    return t("migrationSourceSnapshot", {
      captured: String(values.captured_at ?? ""),
    });
  }

  private get normalizedEntities(): AlexaEntity[] {
    const values = Array.isArray(this.entitiesResponse?.entities)
      ? this.entitiesResponse.entities
      : [];
    return values.map((value) => this.normalizeEntity(value));
  }

  private normalizeEntity(value: unknown): AlexaEntity {
    const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
    const entityId = String(raw.entity_id ?? raw.id ?? "");
    const config = (raw.entity_config && typeof raw.entity_config === "object"
      ? raw.entity_config
      : this.entitiesResponse?.entity_config?.[entityId] ?? {}) as Record<string, unknown>;
    const rawCategories = raw.display_categories ?? config.display_categories;
    const categories = Array.isArray(rawCategories)
      ? rawCategories.map(String)
      : rawCategories
        ? [String(rawCategories)]
        : [];
    const inferred = String(raw.inferred_display_category ?? raw.inferred_category ?? "OTHER");
    const exposure = this.entitiesResponse?.exposure?.[entityId];
    const exposed = typeof raw.exposed === "boolean" ? raw.exposed : exposure ?? false;
    const missing = raw.missing === true || this.entitiesResponse?.missing_entity_ids?.includes(entityId) === true;
    return {
      entityId,
      name: String(raw.name ?? raw.friendly_name ?? entityId),
      domain: String(raw.domain ?? entityId.split(".")[0] ?? ""),
      state: String(raw.state ?? ""),
      areaName: String(raw.area_name ?? raw.area ?? ""),
      deviceName: String(raw.device_name ?? raw.device ?? ""),
      integration: String(raw.integration ?? raw.platform ?? ""),
      supported: raw.supported !== false,
      missing,
      unsupportedReason: String(raw.unsupported_reason ?? ""),
      exposed,
      exposure: (raw.exposure === "include" || raw.exposure === "exclude" || raw.exposure === "inherited" || raw.exposure === "new")
        ? raw.exposure
        : exposed ? "include" : "exclude",
      alexaName: String(raw.alexa_name ?? raw.name_override ?? config.name ?? ""),
      description: String(raw.description ?? config.description ?? ""),
      displayCategories: categories.length ? categories : [inferred],
      inferredDisplayCategory: inferred,
    };
  }

  private draftFrom(entity: AlexaEntity): EntityDraft {
    return {
      exposed: entity.exposed,
      name: entity.alexaName,
      description: entity.description,
      displayCategories: [...entity.displayCategories],
    };
  }

  private iconFor(domain: string) {
    return ({
      light: "mdi:lightbulb",
      switch: "mdi:toggle-switch",
      climate: "mdi:thermostat",
      cover: "mdi:window-shutter",
      lock: "mdi:lock",
      camera: "mdi:camera",
      fan: "mdi:fan",
    } as Record<string, string>)[domain] ?? "mdi:home-assistant";
  }

  static styles = css`
    :host {
      display: block;
      min-height: 100%;
      color: var(--primary-text-color, #212121);
      background: var(--primary-background-color, #fafafa);
      font-family: var(--paper-font-body1_-_font-family, system-ui, sans-serif);
    }

    * { box-sizing: border-box; }

    main {
      min-height: 100vh;
      padding: clamp(20px, 4vw, 48px);
    }

    .manager { max-width: 1440px; margin: 0 auto; }
    .page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
    .page-header h1 { margin-bottom: 4px; }
    .page-header p { margin: 0; }
    .save-group { display: flex; align-items: center; gap: 12px; flex: none; }
    .pending { color: var(--warning-color, #f57c00); font-size: 13px; font-weight: 600; }
    button:disabled { opacity: .48; cursor: not-allowed; }
    .workspace { overflow: hidden; border: 1px solid var(--divider-color, #e0e0e0); border-radius: var(--ha-card-border-radius, 12px); background: var(--card-background-color, #fff); }
    .toolbar { padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 18px; border-bottom: 1px solid var(--divider-color, #e0e0e0); }
    .toolbar > label:first-child { display: block; flex: 1; max-width: 640px; }
    .visibility-filter { display: block; flex: none; }
    select { min-height: 44px; border: 1px solid var(--input-idle-line-color, var(--divider-color, #ccc)); border-radius: 8px; padding: 0 34px 0 12px; color: var(--primary-text-color, #212121); background: var(--card-background-color, #fff); font: inherit; }
    .toolbar-actions, .mode-control { display: flex; align-items: center; gap: 12px; }
    .mode-control > span strong, .mode-control > span small { display: block; }
    .mode-control > span strong { font-size: 12px; }
    .mode-control > span small { max-width: 250px; margin-top: 3px; color: var(--secondary-text-color, #616161); font-size: 10px; }
    button.secondary { display: inline-flex; align-items: center; gap: 7px; color: var(--primary-color, #03a9f4); background: transparent; border: 1px solid var(--primary-color, #03a9f4); }
    input { width: 100%; min-height: 44px; border: 1px solid var(--input-idle-line-color, var(--divider-color, #ccc)); border-radius: 8px; padding: 0 14px; color: var(--primary-text-color, #212121); background: var(--input-fill-color, transparent); font: inherit; }
    input:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 1px; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
    .bulk-bar { min-height: 52px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 8px 16px; color: var(--primary-color, #03a9f4); background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent); border-bottom: 1px solid var(--divider-color, #e0e0e0); }
    .bulk-bar .secondary { min-height: 34px; padding-inline: 12px; }
    .bulk-bar .danger-secondary { min-height: 34px; padding-inline: 12px; color: var(--error-color, #db4437); background: var(--card-background-color, #fff); border: 1px solid var(--error-color, #db4437); }
    .bulk-bar .text-button { min-height: 34px; padding-inline: 8px; color: var(--primary-text-color, #212121); background: transparent; }
    .row-actions { display: flex; justify-content: flex-end; gap: 4px; }
    .virtual-spacer { pointer-events: none; }
    .restart-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .table-head, .entity-row { display: grid; grid-template-columns: 24px minmax(260px, 1.35fr) minmax(190px, .9fr) minmax(190px, .9fr) minmax(170px, .7fr) 40px; align-items: center; gap: 18px; padding: 0 20px; }
    .table-head { min-height: 44px; color: var(--secondary-text-color, #616161); background: var(--secondary-background-color, #f5f5f5); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
    .entity-row { min-height: 76px; border-top: 1px solid var(--divider-color, #e0e0e0); }
    .row-checkbox { width: 18px; min-height: 18px; }
    .entity-row.unsupported, .entity-row.missing { background: color-mix(in srgb, var(--warning-color, #f57c00) 5%, transparent); }
    .entity-main { min-width: 0; display: flex; align-items: center; gap: 12px; }
    .entity-main ha-icon { color: var(--state-icon-color, var(--secondary-text-color, #616161)); }
    .entity-main strong, .entity-main code, .context span, .context small, .availability span, .availability small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .entity-main code { margin-top: 5px; color: var(--secondary-text-color, #616161); font-size: 12px; }
    .context small, .availability small { margin-top: 5px; color: var(--secondary-text-color, #616161); font-size: 12px; }
    .availability .ok { color: var(--success-color, #2e7d32); }
    .availability .warning { color: var(--warning-color, #f57c00); font-weight: 600; }
    .exposure { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .exposure > span { font-size: 13px; font-weight: 600; }
    .exposure .exposed { color: var(--primary-color, #03a9f4); }
    .toggle { position: relative; width: 44px; min-width: 44px; min-height: 24px; height: 24px; padding: 0; border-radius: 999px; background: var(--switch-unchecked-track-color, #9e9e9e); }
    .toggle[aria-checked="true"] { background: var(--switch-checked-color, var(--primary-color, #03a9f4)); }
    .toggle span { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: var(--switch-unchecked-button-color, #fff); transition: transform .16s ease; }
    .toggle[aria-checked="true"] span { transform: translateX(20px); }
    .empty { min-height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; color: var(--secondary-text-color, #616161); }
    .empty.compact { min-height: 180px; }
    .dialog-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px; background: rgb(0 0 0 / 48%); }
    .dialog { width: min(720px, 100%); max-height: min(760px, calc(100vh - 40px)); display: flex; flex-direction: column; overflow: hidden; border-radius: var(--ha-card-border-radius, 12px); background: var(--card-background-color, #fff); box-shadow: 0 20px 70px rgb(0 0 0 / 30%); }
    .dialog header { display: flex; justify-content: space-between; gap: 20px; padding: 22px 22px 14px; }
    .dialog h2 { margin: 0; font-size: 22px; }
    .dialog p { margin: 5px 0 0; }
    button.icon { width: 40px; min-width: 40px; padding: 0; display: grid; place-items: center; color: var(--primary-text-color, #212121); background: transparent; }
    .dialog-search { padding: 0 22px 16px; }
    .candidate-list { min-height: 180px; overflow-y: auto; border-block: 1px solid var(--divider-color, #e0e0e0); }
    .candidate-row { min-height: 64px; display: grid; grid-template-columns: 24px minmax(190px, 1fr) minmax(150px, .8fr); align-items: center; gap: 12px; padding: 10px 22px; border-bottom: 1px solid var(--divider-color, #e0e0e0); }
    .candidate-row:last-child { border-bottom: 0; }
    .candidate-row.disabled { opacity: .72; }
    .candidate-row input { width: 18px; min-height: 18px; }
    .candidate-main { min-width: 0; display: flex; align-items: center; gap: 10px; }
    .candidate-main ha-icon { color: var(--state-icon-color, var(--secondary-text-color, #616161)); flex: none; }
    .candidate-row strong, .candidate-row code { display: block; }
    .candidate-row code, .candidate-row small { margin-top: 4px; color: var(--secondary-text-color, #616161); font-size: 11px; }
    .unsupported-reason { display: block; margin-top: 4px; color: var(--warning-color, #f57c00); font-weight: 600; }
    .metadata-context { display: grid; gap: 4px; margin-top: 10px; }
    .metadata-context strong, .metadata-context code, .metadata-context span { display: block; font-size: 13px; }
    .metadata-context .exposed { color: var(--primary-color, #03a9f4); font-weight: 600; }
    .metadata-context .hidden { color: var(--secondary-text-color, #616161); font-weight: 600; }
    .dialog footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 16px 22px; }
    .dialog footer > span { margin-right: auto; color: var(--secondary-text-color, #616161); font-size: 12px; }
    .confirm-dialog { max-width: 510px; }
    .metadata-dialog { max-width: 760px; }
    .metadata-content { overflow-y: auto; padding: 4px 22px 20px; }
    .field { display: block; margin-top: 16px; }
    .field > span, fieldset legend { display: block; margin-bottom: 7px; font-size: 13px; font-weight: 700; }
    textarea { width: 100%; min-height: 88px; resize: vertical; border: 1px solid var(--input-idle-line-color, var(--divider-color, #ccc)); border-radius: 8px; padding: 12px 14px; color: var(--primary-text-color, #212121); background: var(--input-fill-color, transparent); font: inherit; }
    textarea:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 1px; }
    fieldset { margin: 20px 0 0; padding: 0; border: 0; }
    fieldset p { margin: 0 0 9px; font-size: 12px; }
    .inferred { display: inline-block; margin-bottom: 12px; padding: 5px 8px; border-radius: 5px; color: var(--primary-color, #03a9f4); background: color-mix(in srgb, var(--primary-color, #03a9f4) 9%, transparent); font-size: 12px; font-weight: 600; }
    .category-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
    .category-options label { min-width: 0; display: flex; align-items: center; gap: 7px; padding: 8px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 6px; font-size: 11px; }
    .category-options input { width: 16px; min-height: 16px; }
    .category-options span { overflow: hidden; text-overflow: ellipsis; }
    .category-order { margin-top: 18px; padding: 14px; border-radius: 8px; background: var(--secondary-background-color, #f5f5f5); }
    .category-order > strong { display: block; margin-bottom: 9px; font-size: 12px; }
    .category-order > div { min-height: 40px; display: grid; grid-template-columns: 24px 1fr repeat(3, 32px); align-items: center; gap: 6px; border-top: 1px solid var(--divider-color, #e0e0e0); }
    button.icon.small { width: 30px; min-width: 30px; min-height: 30px; }
    button.danger { background: var(--error-color, #db4437); }
    .restart, .message { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; padding: 16px; border: 1px solid var(--warning-color, #f57c00); border-radius: var(--ha-card-border-radius, 12px); background: color-mix(in srgb, var(--warning-color, #f57c00) 8%, var(--card-background-color, #fff)); }
    .restart div, .message span { flex: 1; }
    .restart strong, .restart span, .message strong, .message span { display: block; }
    .restart span, .message span { margin-top: 4px; color: var(--secondary-text-color, #616161); font-size: 13px; line-height: 1.5; }
    .restart button { color: var(--primary-text-color, #212121); background: var(--card-background-color, #fff); border: 1px solid var(--divider-color, #ddd); }
    .message.error { border-color: var(--error-color, #db4437); }
    .validation { align-items: flex-start; }
    .validation ul { flex: 1; margin: 0; padding-left: 20px; line-height: 1.6; }
    .migration { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--divider-color, #e0e0e0); }
    .migration-notice { margin-bottom: 18px; padding: 16px; border: 1px solid var(--primary-color, #03a9f4); border-radius: var(--ha-card-border-radius, 12px); background: color-mix(in srgb, var(--primary-color, #03a9f4) 7%, var(--card-background-color, #fff)); }
    .migration-notice > div { margin-bottom: 12px; }
    .migration-notice strong, .migration-notice span { display: block; }
    .migration-notice span { margin-top: 5px; color: var(--secondary-text-color, #616161); line-height: 1.5; }
    .migration-notice.missing-source { border-color: var(--warning-color, #f57c00); background: color-mix(in srgb, var(--warning-color, #f57c00) 7%, var(--card-background-color, #fff)); }
    .migration-notice.missing-source > div { margin-bottom: 0; }
    .migration-error { margin: 12px 0 0; color: var(--error-color, #db4437); font-weight: 600; }
    .migration-result { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; padding: 12px; border-radius: 8px; background: var(--secondary-background-color, #f5f5f5); }
    .advanced { margin-top: 20px; overflow: hidden; border: 1px solid var(--divider-color, #e0e0e0); border-radius: var(--ha-card-border-radius, 12px); background: var(--card-background-color, #fff); }
    .advanced-toggle { width: 100%; min-height: 70px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 14px 20px; color: var(--primary-text-color, #212121); background: transparent; text-align: left; }
    .advanced-toggle strong, .advanced-toggle small { display: block; }
    .advanced-toggle small { margin-top: 5px; color: var(--secondary-text-color, #616161); font-weight: 400; }
    .advanced-content { padding: 20px; border-top: 1px solid var(--divider-color, #e0e0e0); }
    .advanced-state { padding: 30px; text-align: center; color: var(--secondary-text-color, #616161); }
    .advanced-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .advanced-card { min-width: 0; max-width: 100%; overflow: hidden; padding: 18px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 9px; }
    .advanced-card h3 { margin: 0 0 8px; }
    .advanced-card p { margin: 0 0 14px; font-size: 13px; }
    .yaml-card { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .yaml-card h3 { grid-column: 1 / -1; }
    .yaml-card label { min-width: 0; font-size: 12px; font-weight: 700; }
    .yaml-card pre, .diagnostics { max-height: 300px; margin: 8px 0 0; padding: 14px; overflow: auto; border-radius: 7px; background: var(--code-editor-background-color, #1f2933); color: var(--text-primary-color, #fff); font-weight: 400; }
    .backup-list > div { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 0; border-top: 1px solid var(--divider-color, #e0e0e0); }
    .backup-list strong, .backup-list small { display: block; }
    .backup-list small { margin-top: 4px; color: var(--secondary-text-color, #616161); }
    .backup-list button { font-size: 11px; }
    .advanced-card ul { margin: 0; padding-left: 20px; color: var(--secondary-text-color, #616161); line-height: 1.9; }
    .card-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .operation-message { color: var(--success-color, #2e7d32) !important; font-weight: 600; }
    .muted { color: var(--secondary-text-color, #616161); }

    .state,
    .setup {
      max-width: 760px;
      margin: 8vh auto 0;
      padding: clamp(24px, 5vw, 48px);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--card-background-color, #fff);
      box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgb(0 0 0 / 10%));
    }

    .state { text-align: center; }
    h1 { margin: 8px 0 12px; font-size: clamp(24px, 4vw, 34px); }
    p { color: var(--secondary-text-color, #616161); line-height: 1.6; }
    .eyebrow { color: var(--primary-color, #03a9f4); font-weight: 700; text-transform: uppercase; letter-spacing: .08em; font-size: 12px; }
    pre { overflow: auto; padding: 18px; border-radius: 8px; background: var(--code-editor-background-color, #1f2933); color: var(--text-primary-color, #fff); line-height: 1.7; }
    code { font-family: var(--ha-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace); }
    .safety { border-left: 3px solid var(--primary-color, #03a9f4); padding-left: 14px; }
    .recovery-steps { margin: 20px 0; padding-left: 24px; line-height: 1.7; }
    .recovery-steps li { margin-top: 8px; padding-left: 5px; }
    .setup-source-note { margin-top: 18px; padding: 14px; border-left: 3px solid var(--warning-color, #f57c00); background: color-mix(in srgb, var(--warning-color, #f57c00) 7%, transparent); }
    .setup-source-note strong, .setup-source-note span { display: block; }
    .setup-source-note span { margin-top: 5px; color: var(--secondary-text-color, #616161); line-height: 1.5; }
    .setup-label { display: block; margin-top: 18px; font-size: 13px; }
    button { min-height: 40px; border: 0; border-radius: 8px; padding: 0 18px; color: var(--text-primary-color, #fff); background: var(--primary-color, #03a9f4); font: inherit; font-weight: 600; cursor: pointer; }
    button:focus-visible { outline: 3px solid var(--primary-color, #03a9f4); outline-offset: 3px; }
    .spinner { width: 30px; height: 30px; margin: 0 auto 16px; border: 3px solid var(--divider-color, #ddd); border-top-color: var(--primary-color, #03a9f4); border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 900px) {
      main { padding: 20px; }
      .table-head, .entity-row { grid-template-columns: 24px minmax(220px, 1.2fr) minmax(170px, .8fr) minmax(160px, .8fr) 40px; }
      .table-head > :nth-child(3), .entity-row > :nth-child(3) { display: none; }
    }
    @media (max-width: 620px) {
      main { padding: 12px; }
      .page-header { align-items: flex-start; flex-direction: column; }
      .save-group { width: 100%; justify-content: space-between; }
      .toolbar, .toolbar-actions { align-items: stretch; flex-direction: column; }
      .toolbar > label { width: 100%; max-width: none; }
      .mode-control { align-items: flex-start; }
      .table-head { display: none; }
      .entity-row { grid-template-columns: 24px 1fr; gap: 12px; padding: 16px; }
      .entity-row > * { display: flex; }
      .entity-row > :not(:first-child) { grid-column: 2; }
      .context, .availability { flex-direction: column; align-items: flex-start; }
      .exposure { padding-top: 10px; border-top: 1px solid var(--divider-color, #e0e0e0); }
      .restart { align-items: flex-start; flex-wrap: wrap; }
      .restart div { min-width: calc(100% - 40px); }
      .dialog-backdrop { padding: 0; place-items: end stretch; }
      .dialog { width: 100%; max-height: 92vh; border-radius: 14px 14px 0 0; }
      .candidate-row { grid-template-columns: 24px 1fr; }
      .candidate-row small { grid-column: 2; }
      .dialog footer { flex-wrap: wrap; }
      .dialog footer > span { width: 100%; }
      .category-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .advanced-grid, .yaml-card { grid-template-columns: 1fr; }
      .yaml-card h3 { grid-column: 1; }
      .migration-result { align-items: flex-start; flex-direction: column; }
      .backup-list > div { align-items: flex-start; flex-direction: column; }
      .backup-list button { width: 100%; justify-content: center; white-space: normal; }
    }
  `;
}

if (!customElements.get("alexa-exposure-manager-panel")) {
  customElements.define("alexa-exposure-manager-panel", AlexaExposureManagerPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    "alexa-exposure-manager-panel": AlexaExposureManagerPanel;
  }
}
