export type ExposureChoice = "auto" | "include" | "exclude";

export type AlexaCategory =
  | "LIGHT"
  | "SMARTPLUG"
  | "SWITCH"
  | "THERMOSTAT"
  | "SMARTLOCK"
  | "CAMERA"
  | "DOOR"
  | "FAN"
  | "OTHER";

export interface Entity {
  id: string;
  name: string;
  domain: string;
  area: string;
  integration: string;
  device: string;
  state: string;
  exposure: ExposureChoice;
  alexaName: string;
  description: string;
  category: AlexaCategory;
}

export interface AlexaRules {
  includeDomains: string[];
  excludeDomains: string[];
  includeGlobs: string[];
  excludeGlobs: string[];
}

export interface ExposureResult {
  exposed: boolean;
  reason: string;
  source: "explicit" | "inherited" | "default";
}

export type View = "entities" | "rules" | "yaml";
