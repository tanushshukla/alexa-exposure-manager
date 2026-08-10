import type { AlexaRules, Entity, ExposureResult } from "../types";

export function matchesGlob(value: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*").replaceAll("?", ".");
  return new RegExp(`^${escaped}$`).test(value);
}

export function evaluateExposure(entity: Entity, rules: AlexaRules): ExposureResult {
  if (entity.exposure === "include") {
    return { exposed: true, reason: "Explicitly exposed", source: "explicit" };
  }

  if (entity.exposure === "exclude") {
    return { exposed: false, reason: "Explicitly hidden", source: "explicit" };
  }

  if (rules.excludeDomains.includes(entity.domain)) {
    return {
      exposed: false,
      reason: `Excluded by domain: ${entity.domain}`,
      source: "inherited",
    };
  }

  const excludeGlob = rules.excludeGlobs.find((glob) => matchesGlob(entity.id, glob));
  if (excludeGlob) {
    return { exposed: false, reason: `Excluded by glob: ${excludeGlob}`, source: "inherited" };
  }

  if (rules.includeDomains.includes(entity.domain)) {
    return {
      exposed: true,
      reason: `Included by domain: ${entity.domain}`,
      source: "inherited",
    };
  }

  const includeGlob = rules.includeGlobs.find((glob) => matchesGlob(entity.id, glob));
  if (includeGlob) {
    return { exposed: true, reason: `Included by glob: ${includeGlob}`, source: "inherited" };
  }

  const hasIncludes = rules.includeDomains.length > 0 || rules.includeGlobs.length > 0;
  return {
    exposed: !hasIncludes,
    reason: hasIncludes ? "Not matched by an include rule" : "Exposed by default",
    source: "default",
  };
}
