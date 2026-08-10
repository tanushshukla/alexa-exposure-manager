import { describe, expect, it } from "vitest";
import { generateEntityConfigYaml, generateFilterYaml } from "./yaml";
import type { AlexaRules, Entity } from "../types";

const entities: Entity[] = [
  {
    id: "switch.coffee_machine",
    name: "Coffee machine",
    domain: "switch",
    area: "Kitchen",
    integration: "Shelly",
    device: "Coffee machine",
    state: "off",
    exposure: "include",
    alexaName: "Coffee Machine",
    description: "Coffee machine plug",
    category: "SMARTPLUG",
  },
  {
    id: "sensor.phone_battery",
    name: "Phone battery",
    domain: "sensor",
    area: "Office",
    integration: "Mobile App",
    device: "Phone",
    state: "82%",
    exposure: "exclude",
    alexaName: "",
    description: "",
    category: "OTHER",
  },
];

const rules: AlexaRules = {
  includeDomains: ["light"],
  excludeDomains: [],
  includeGlobs: [],
  excludeGlobs: ["sensor.*_battery"],
};

describe("YAML generation", () => {
  it("generates sorted filter YAML", () => {
    expect(generateFilterYaml(entities, rules)).toBe(`include_entities:\n  - switch.coffee_machine\nexclude_entities:\n  - sensor.phone_battery\ninclude_domains:\n  - light\nexclude_entity_globs:\n  - sensor.*_battery\n`);
  });

  it("only generates entity config for included entities with metadata", () => {
    expect(generateEntityConfigYaml(entities)).toBe(`switch.coffee_machine:\n  name: "Coffee Machine"\n  description: "Coffee machine plug"\n  display_categories: SMARTPLUG\n`);
  });
});
