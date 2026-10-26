"""Native rule explanations and deterministic draft transformations."""

from collections.abc import Mapping
from fnmatch import fnmatchcase


def exposure_reason(entity_id: str, rules: Mapping[str, list[str]]) -> str:
    """Explain HA's native precedence, without replacing its exposure evaluator."""
    if not any(rules.values()):
        return "Alexa registry-default exposure"
    include = any(values for key, values in rules.items() if key.startswith("include_"))
    exclude = any(values for key, values in rules.items() if key.startswith("exclude_"))
    order: tuple[str, ...]
    if not exclude:
        order = ("include_entities", "include_domains", "include_entity_globs")
    elif not include:
        order = ("exclude_entities", "exclude_domains", "exclude_entity_globs")
    elif rules.get("include_domains") or rules.get("include_entity_globs"):
        order = (
            "include_entities",
            "exclude_entities",
            "include_entity_globs",
            "exclude_entity_globs",
            "include_domains",
        )
    elif rules.get("exclude_domains") or rules.get("exclude_entity_globs"):
        order = (
            "include_entities",
            "exclude_entities",
            "exclude_entity_globs",
            "exclude_domains",
        )
    else:
        order = ("include_entities",)
    for key in order:
        for value in rules.get(key, []):
            matches = (
                fnmatchcase(entity_id, value)
                if key.endswith("_globs")
                else entity_id.split(".", 1)[0] == value
                if key.endswith("_domains")
                else entity_id == value
            )
            if matches:
                verb = "Included" if key.startswith("include_") else "Excluded"
                if key.endswith("_entities"):
                    return (
                        "Explicitly included"
                        if verb == "Included"
                        else "Explicitly excluded"
                    )
                kind = "glob" if key.endswith("_globs") else "domain"
                return f"{verb} by {kind}: {value}"
    if include and not (
        rules.get("exclude_domains") or rules.get("exclude_entity_globs")
    ):
        return "Not matched by include rules"
    if rules.get("include_domains") or rules.get("include_entity_globs"):
        return "Not matched by include rules"
    return "Included by default (no exclusion matched)"
