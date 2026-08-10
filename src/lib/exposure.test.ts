import { describe, expect, it } from "vitest";
import { evaluateExposure, matchesGlob } from "./exposure";
import type { AlexaRules, Entity } from "../types";

const entity: Entity = {
  id: "light.kitchen_ceiling",
  name: "Kitchen ceiling",
  domain: "light",
  area: "Kitchen",
  integration: "Hue",
  device: "Kitchen ceiling",
  state: "on",
  exposure: "auto",
  alexaName: "Kitchen lights",
  description: "Main kitchen lighting",
  category: "LIGHT",
};

const emptyRules: AlexaRules = {
  includeDomains: [],
  excludeDomains: [],
  includeGlobs: [],
  excludeGlobs: [],
};

describe("matchesGlob", () => {
  it("matches Home Assistant-style wildcard patterns", () => {
    expect(matchesGlob("sensor.phone_battery", "sensor.*_battery")).toBe(true);
    expect(matchesGlob("sensor.phone_signal", "sensor.*_battery")).toBe(false);
  });
});

describe("evaluateExposure", () => {
  it("prioritizes an explicit include", () => {
    expect(
      evaluateExposure(
        { ...entity, exposure: "include" },
        { ...emptyRules, excludeDomains: ["light"] },
      ),
    ).toEqual({ exposed: true, reason: "Explicitly exposed", source: "explicit" });
  });

  it("prioritizes an explicit exclusion", () => {
    expect(
      evaluateExposure(
        { ...entity, exposure: "exclude" },
        { ...emptyRules, includeDomains: ["light"] },
      ),
    ).toEqual({ exposed: false, reason: "Explicitly hidden", source: "explicit" });
  });

  it("reports an inherited include domain", () => {
    expect(evaluateExposure(entity, { ...emptyRules, includeDomains: ["light"] })).toEqual({
      exposed: true,
      reason: "Included by domain: light",
      source: "inherited",
    });
  });

  it("reports an inherited exclude glob", () => {
    const battery = { ...entity, id: "sensor.phone_battery", domain: "sensor" };
    expect(
      evaluateExposure(battery, { ...emptyRules, excludeGlobs: ["sensor.*_battery"] }),
    ).toEqual({
      exposed: false,
      reason: "Excluded by glob: sensor.*_battery",
      source: "inherited",
    });
  });

  it("defaults unmatched automatic entities to hidden when includes exist", () => {
    expect(evaluateExposure(entity, { ...emptyRules, includeDomains: ["climate"] })).toEqual({
      exposed: false,
      reason: "Not matched by an include rule",
      source: "default",
    });
  });
});
