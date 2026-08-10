import type { AlexaRules, Entity } from "../types";

function appendList(lines: string[], key: string, values: string[]) {
  if (values.length === 0) return;
  lines.push(`${key}:`);
  for (const value of values.toSorted()) lines.push(`  - ${value}`);
}

function quote(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export function generateFilterYaml(entities: Entity[], rules: AlexaRules): string {
  const lines: string[] = [];
  appendList(lines, "include_entities", entities.filter((entity) => entity.exposure === "include").map((entity) => entity.id));
  appendList(lines, "exclude_entities", entities.filter((entity) => entity.exposure === "exclude").map((entity) => entity.id));
  appendList(lines, "include_domains", rules.includeDomains);
  appendList(lines, "exclude_domains", rules.excludeDomains);
  appendList(lines, "include_entity_globs", rules.includeGlobs);
  appendList(lines, "exclude_entity_globs", rules.excludeGlobs);
  return lines.length > 0 ? `${lines.join("\n")}\n` : "{}\n";
}

export function generateEntityConfigYaml(entities: Entity[]): string {
  const lines: string[] = [];
  for (const entity of entities.filter((item) => item.exposure === "include").toSorted((a, b) => a.id.localeCompare(b.id))) {
    if (!entity.alexaName && !entity.description && entity.category === "OTHER") continue;
    lines.push(`${entity.id}:`);
    if (entity.alexaName) lines.push(`  name: ${quote(entity.alexaName)}`);
    if (entity.description) lines.push(`  description: ${quote(entity.description)}`);
    if (entity.category !== "OTHER") lines.push(`  display_categories: ${entity.category}`);
  }
  return lines.length > 0 ? `${lines.join("\n")}\n` : "{}\n";
}
