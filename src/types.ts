export interface HomeAssistant {
  connection: {
    sendMessagePromise<T>(message: WebSocketMessage): Promise<T>;
  };
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

export interface StatusResponse {
  configured?: boolean;
  setup_complete?: boolean;
  revision?: string;
  entities_revision?: string;
  restart_required?: boolean;
  last_saved?: string;
  version?: string;
  expose_new_entities?: boolean;
  validation_errors?: ValidationIssue[];
  editing_enabled?: boolean;
  read_only?: boolean;
  read_only_reasons?: string[];
}

export interface EntitiesResponse {
  revision?: string;
  entities_revision?: string;
  expose_new_entities?: boolean;
  entities?: unknown[];
  exposure?: Record<string, boolean>;
  entity_config?: Record<string, Record<string, unknown>>;
  missing_entity_ids?: string[];
  read_only?: boolean;
  read_only_reasons?: string[];
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
