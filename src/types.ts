export interface HomeAssistant {
  connection: {
    sendMessagePromise<T>(message: WebSocketMessage): Promise<T>;
  };
  localize?: (key: string, values?: Record<string, string | number>) => string;
  states?: Record<string, HomeAssistantState>;
  devices?: Record<string, HomeAssistantDevice>;
  areas?: Record<string, HomeAssistantArea>;
  locale?: { language?: string };
}

export interface HomeAssistantState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

export interface HomeAssistantDevice {
  id: string;
  name?: string;
  name_by_user?: string;
  area_id?: string;
}

export interface HomeAssistantArea {
  area_id?: string;
  id?: string;
  name: string;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface PanelRoute {
  path?: string;
  prefix?: string;
}

export interface PanelConfig {
  component_name?: string;
  config?: Record<string, unknown>;
  title?: string;
  url_path?: string;
}

export type ExposureStrategy = "allowlist" | "blocklist" | "rule_based" | "registry_default";

export interface StatusResponse {
  configured?: boolean;
  setup_complete?: boolean;
  revision?: string;
  entities_revision?: string;
  restart_required?: boolean;
  last_saved?: string;
  version?: string;
  strategy?: ExposureStrategy;
  expose_new_entities?: boolean;
  validation_errors?: ValidationIssue[];
  editing_enabled?: boolean;
  editing_disabled_reason?: string | null;
  read_only?: boolean;
  read_only_reasons?: string[];
  last_validation?: LastValidation | null;
  migration_state?: string;
  migration_available?: boolean;
  managed_files?: {
    filter_created?: boolean;
    entity_config_created?: boolean;
    safe_defaults?: boolean;
  };
  configuration_state?: {
    active_uses_managed_files?: boolean;
    active_matches_saved?: boolean;
    saved_valid?: boolean;
    pending_restart?: boolean;
  };
}

export interface LastValidation {
  ok?: boolean;
  error?: string | null;
  rollback?: string | null;
  at?: string;
}

export interface EntitiesResponse {
  revision?: string;
  entities_revision?: string;
  strategy?: ExposureStrategy;
  expose_new_entities?: boolean;
  entities?: unknown[];
  exposure?: Record<string, boolean>;
  entity_config?: Record<string, Record<string, unknown>>;
  missing_entity_ids?: string[];
  read_only?: boolean;
  read_only_reasons?: string[];
}

export interface MigrationPreviewResponse {
  token?: string;
  revision?: string;
  entities_revision?: string;
  strategy?: ExposureStrategy;
  expose_new_entities?: boolean;
  filter_yaml?: string;
  entity_config_yaml?: string;
  counts?: Record<string, number>;
  source_inventory?: Record<string, number>;
  legacy_source?: {
    from_snapshot?: boolean;
    captured_at?: string | null;
  };
}

export interface ValidationIssue {
  entity_id?: string;
  field?: string;
  message: string;
}

export interface AlexaEntity {
  entityId: string;
  name: string;
  domain: string;
  state: string;
  areaName: string;
  deviceName: string;
  integration: string;
  supported: boolean;
  missing: boolean;
  unsupportedReason: string;
  exposed: boolean;
  exposure: "include" | "exclude" | "inherited" | "new";
  alexaName: string;
  description: string;
  displayCategories: string[];
  inferredDisplayCategory: string;
}

export interface EntityDraft {
  exposed: boolean;
  name: string;
  description: string;
  displayCategories: string[];
  remove?: boolean;
}
