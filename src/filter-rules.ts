export const filterSections = [
  ["include_entities", "Included entities"],
  ["exclude_entities", "Excluded entities"],
  ["include_domains", "Included domains"],
  ["exclude_domains", "Excluded domains"],
  ["include_entity_globs", "Included glob patterns"],
  ["exclude_entity_globs", "Excluded glob patterns"],
] as const;

export type NativeFilter = Partial<Record<typeof filterSections[number][0], string[]>>;

export interface DraftPreview {
  cleanup_findings?: CleanupFinding[];
  filter?: NativeFilter;
  strategy?: string;
  exposure?: Record<string, boolean>;
  reasons?: Record<string, string>;
  impact?: { exposed: string[]; hidden: string[] };
  future_behavior?: string;
  filter_yaml?: string;
  entity_config_yaml?: string;
}

export interface CleanupFinding {
  id: string;
  kind: "duplicate" | "missing";
  section?: string;
  value: string;
  count: number;
}
