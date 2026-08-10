import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  CloudCog,
  Code2,
  Eye,
  EyeOff,
  Filter,
  Home,
  Info,
  LayoutList,
  Menu,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { startTransition, useDeferredValue, useState } from "react";
import { initialEntities, initialRules } from "./data";
import { evaluateExposure } from "./lib/exposure";
import { generateEntityConfigYaml, generateFilterYaml } from "./lib/yaml";
import type { AlexaCategory, AlexaRules, Entity, ExposureChoice, View } from "./types";

const categoryOptions: AlexaCategory[] = [
  "LIGHT",
  "SMARTPLUG",
  "SWITCH",
  "THERMOSTAT",
  "SMARTLOCK",
  "CAMERA",
  "DOOR",
  "FAN",
  "OTHER",
];

function AlexaMark() {
  return (
    <div className="alexa-mark" aria-hidden="true">
      <span />
    </div>
  );
}

function EntityGlyph({ domain }: { domain: string }) {
  const glyphs: Record<string, string> = {
    light: "✦",
    switch: "⌁",
    sensor: "∿",
    climate: "°",
    media_player: "▶",
    lock: "⌑",
    camera: "◉",
    cover: "▤",
    fan: "✣",
    binary_sensor: "◇",
  };
  return <span className={`entity-glyph domain-${domain}`}>{glyphs[domain] ?? "•"}</span>;
}

function ExposureControl({
  value,
  onChange,
  compact = false,
}: {
  value: ExposureChoice;
  onChange: (value: ExposureChoice) => void;
  compact?: boolean;
}) {
  const options: { value: ExposureChoice; label: string; icon: typeof Sparkles }[] = [
    { value: "auto", label: "Auto", icon: Sparkles },
    { value: "include", label: "Expose", icon: Eye },
    { value: "exclude", label: "Hide", icon: EyeOff },
  ];

  return (
    <div className={`exposure-control ${compact ? "compact" : ""}`}>
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button
            className={value === option.value ? `active ${option.value}` : ""}
            key={option.value}
            type="button"
            aria-label={`${option.label} entity`}
            aria-pressed={value === option.value}
            onClick={(event) => {
              event.stopPropagation();
              onChange(option.value);
            }}
          >
            <Icon size={14} />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ value, label, tone, note }: { value: number; label: string; tone: string; note: string }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-value">{value}</div>
      <div>
        <strong>{label}</strong>
        <span>{note}</span>
      </div>
    </div>
  );
}

function RuleEditor({
  label,
  description,
  values,
  placeholder,
  onChange,
}: {
  label: string;
  description: string;
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  const [input, setInput] = useState("");
  return (
    <section className="rule-card">
      <div className="rule-card-heading">
        <div>
          <h3>{label}</h3>
          <p>{description}</p>
        </div>
        <span className="count-pill">{values.length}</span>
      </div>
      <div className="chip-list">
        {values.map((value) => (
          <span className="rule-chip" key={value}>
            <code>{value}</code>
            <button type="button" aria-label={`Remove ${value}`} onClick={() => onChange(values.filter((item) => item !== value))}>
              <X size={13} />
            </button>
          </span>
        ))}
        {values.length === 0 ? <span className="empty-inline">No rules configured</span> : null}
      </div>
      <form
        className="rule-input"
        onSubmit={(event) => {
          event.preventDefault();
          const value = input.trim();
          if (value && !values.includes(value)) onChange([...values, value]);
          setInput("");
        }}
      >
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={placeholder} aria-label={`Add ${label.toLowerCase()}`} />
        <button type="submit">Add rule</button>
      </form>
    </section>
  );
}

function App() {
  const [entities, setEntities] = useState(initialEntities);
  const [rules, setRules] = useState(initialRules);
  const [view, setView] = useState<View>("entities");
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("All areas");
  const [domain, setDomain] = useState("All domains");
  const [visibility, setVisibility] = useState("All exposure");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "validating" | "saved">("idle");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const evaluated = entities.map((entity) => ({ entity, result: evaluateExposure(entity, rules) }));
  const exposedCount = evaluated.filter(({ result }) => result.exposed).length;
  const inheritedCount = evaluated.filter(({ result }) => result.source === "inherited").length;
  const hiddenCount = entities.length - exposedCount;
  const areas = ["All areas", ...new Set(entities.map((entity) => entity.area))];
  const domains = ["All domains", ...new Set(entities.map((entity) => entity.domain))];

  const filtered = evaluated.filter(({ entity, result }) => {
    const matchesSearch = !deferredQuery || `${entity.name} ${entity.id} ${entity.device}`.toLowerCase().includes(deferredQuery);
    const matchesArea = area === "All areas" || entity.area === area;
    const matchesDomain = domain === "All domains" || entity.domain === domain;
    const matchesVisibility =
      visibility === "All exposure" ||
      (visibility === "Exposed" && result.exposed) ||
      (visibility === "Hidden" && !result.exposed) ||
      (visibility === "Inherited" && result.source === "inherited");
    return matchesSearch && matchesArea && matchesDomain && matchesVisibility;
  });

  const activeEntity = entities.find((entity) => entity.id === activeEntityId) ?? null;
  const allVisibleSelected = filtered.length > 0 && filtered.every(({ entity }) => selected.has(entity.id));

  function markChanged() {
    setPendingChanges((count) => count + 1);
    setSaveState("idle");
  }

  function updateEntity(id: string, patch: Partial<Entity>) {
    setEntities((current) => current.map((entity) => (entity.id === id ? { ...entity, ...patch } : entity)));
    markChanged();
  }

  function updateRules(patch: Partial<AlexaRules>) {
    setRules((current) => ({ ...current, ...patch }));
    markChanged();
  }

  function bulkSetExposure(exposure: ExposureChoice) {
    setEntities((current) => current.map((entity) => (selected.has(entity.id) ? { ...entity, exposure } : entity)));
    markChanged();
    setSelected(new Set());
  }

  function saveChanges() {
    setSaveState("validating");
    window.setTimeout(() => {
      startTransition(() => {
        setSaveState("saved");
        setPendingChanges(0);
      });
    }, 800);
  }

  const navItems: { id: View; label: string; icon: typeof LayoutList }[] = [
    { id: "entities", label: "Entities", icon: LayoutList },
    { id: "rules", label: "Advanced rules", icon: SlidersHorizontal },
    { id: "yaml", label: "YAML preview", icon: Code2 },
  ];

  return (
    <div className="app-shell">
      <aside className={mobileNavOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <AlexaMark />
          <div>
            <strong>Alexa Exposure</strong>
            <span>Manager</span>
          </div>
          <button className="mobile-close" type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>
        <nav>
          <span className="nav-label">Manage</span>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                className={view === item.id ? "active" : ""}
                onClick={() => {
                  setView(item.id);
                  setMobileNavOpen(false);
                }}
              >
                <Icon size={18} />
                {item.label}
                {item.id === "entities" ? <span>{entities.length}</span> : null}
              </button>
            );
          })}
          <span className="nav-label secondary">System</span>
          <button type="button"><CloudCog size={18} />Connection</button>
          <button type="button"><Settings2 size={18} />Settings</button>
        </nav>
        <div className="sidebar-status">
          <div className="status-dot" />
          <div>
            <strong>Home Assistant</strong>
            <span>Connected · 2026.7</span>
          </div>
          <MoreHorizontal size={18} />
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div className="heading-wrap">
            <button className="menu-button" type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={22} /></button>
            <div>
              <div className="breadcrumb"><Home size={13} /> Home Assistant <span>/</span> Alexa</div>
              <h1>{view === "entities" ? "Entity exposure" : view === "rules" ? "Advanced rules" : "YAML preview"}</h1>
            </div>
          </div>
          <div className="top-actions">
            {pendingChanges > 0 ? <span className="pending-label"><span />{pendingChanges} unsaved {pendingChanges === 1 ? "change" : "changes"}</span> : null}
            <button className="icon-button" type="button" aria-label="Help"><CircleHelp size={19} /></button>
            <button className={`save-button ${saveState}`} type="button" disabled={pendingChanges === 0 || saveState === "validating"} onClick={saveChanges}>
              {saveState === "validating" ? <RefreshCw className="spin" size={17} /> : saveState === "saved" ? <Check size={17} /> : null}
              {saveState === "validating" ? "Validating…" : saveState === "saved" ? "Saved" : "Validate & save"}
            </button>
          </div>
        </header>

        <div className="content">
          {saveState === "saved" ? (
            <div className="success-banner">
              <CheckCircle2 size={19} />
              <div><strong>Configuration saved and validated.</strong><span>Restart Home Assistant when you are ready to apply these Alexa changes.</span></div>
              <button type="button"><RotateCcw size={15} /> Restart now</button>
              <button className="dismiss" type="button" aria-label="Dismiss" onClick={() => setSaveState("idle")}><X size={17} /></button>
            </div>
          ) : null}

          {view === "entities" ? (
            <>
              <section className="intro-row">
                <div>
                  <p>Control which Home Assistant entities your manual Alexa Smart Home Skill can discover.</p>
                  <button type="button" onClick={() => setView("rules")}><Info size={14} /> Exposure rules are active</button>
                </div>
                <div className="last-sync"><span>Last Alexa discovery</span><strong>Today, 09:42</strong></div>
              </section>

              <section className="stats-grid" aria-label="Exposure summary">
                <StatCard value={exposedCount} label="Exposed" note="Available to Alexa" tone="blue" />
                <StatCard value={hiddenCount} label="Hidden" note="Not discoverable" tone="slate" />
                <StatCard value={inheritedCount} label="Inherited" note="Controlled by rules" tone="amber" />
                <StatCard value={pendingChanges} label="Pending" note="Not saved yet" tone="green" />
              </section>

              <section className="workspace-card">
                <div className="toolbar">
                  <label className="search-box">
                    <Search size={18} />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search entity or device…" />
                    <kbd>⌘ K</kbd>
                  </label>
                  <div className="filter-row">
                    {[{ value: area, setter: setArea, options: areas }, { value: domain, setter: setDomain, options: domains }, { value: visibility, setter: setVisibility, options: ["All exposure", "Exposed", "Hidden", "Inherited"] }].map((filterItem, index) => (
                      <label className="select-wrap" key={index}>
                        {index === 0 ? <Filter size={15} /> : null}
                        <select value={filterItem.value} onChange={(event) => filterItem.setter(event.target.value)} aria-label={["Filter by area", "Filter by domain", "Filter by exposure"][index]}>
                          {filterItem.options.map((option) => <option key={option}>{option}</option>)}
                        </select>
                        <ChevronDown size={14} />
                      </label>
                    ))}
                  </div>
                </div>

                {selected.size > 0 ? (
                  <div className="bulk-bar">
                    <strong>{selected.size} selected</strong>
                    <span />
                    <button type="button" onClick={() => bulkSetExposure("include")}><Eye size={15} /> Expose</button>
                    <button type="button" onClick={() => bulkSetExposure("exclude")}><EyeOff size={15} /> Hide</button>
                    <button type="button" onClick={() => bulkSetExposure("auto")}><Sparkles size={15} /> Set automatic</button>
                    <button className="clear" type="button" onClick={() => setSelected(new Set())}>Clear</button>
                  </div>
                ) : null}

                <div className="entity-table">
                  <div className="table-head">
                    <label className="checkbox"><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(filtered.map(({ entity }) => entity.id)))} /><span /></label>
                    <span>Entity</span><span>Area</span><span>State</span><span>Effective exposure</span><span>Override</span><span />
                  </div>
                  {filtered.map(({ entity, result }) => (
                    <div className="entity-row" key={entity.id} onClick={() => setActiveEntityId(entity.id)}>
                      <label className="checkbox" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selected.has(entity.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(entity.id)) next.delete(entity.id); else next.add(entity.id); return next; })} /><span /></label>
                      <div className="entity-name"><EntityGlyph domain={entity.domain} /><div><strong>{entity.name}</strong><code>{entity.id}</code></div></div>
                      <div className="area-cell"><span className="mobile-label">Area</span>{entity.area}</div>
                      <div className="state-cell"><span className="state-dot" />{entity.state}</div>
                      <div className="effective-cell">
                        <span className={`exposure-badge ${result.exposed ? "exposed" : "hidden"}`}>{result.exposed ? <Eye size={13} /> : <EyeOff size={13} />}{result.exposed ? "Exposed" : "Hidden"}</span>
                        <small className={result.source}>{result.reason}</small>
                      </div>
                      <ExposureControl compact value={entity.exposure} onChange={(exposure) => updateEntity(entity.id, { exposure })} />
                      <button className="row-menu" type="button" aria-label={`Edit ${entity.name}`}><MoreHorizontal size={18} /></button>
                    </div>
                  ))}
                  {filtered.length === 0 ? <div className="empty-state"><Search size={30} /><strong>No matching entities</strong><span>Try clearing one of your filters.</span></div> : null}
                </div>
                <footer className="table-footer"><span>Showing {filtered.length} of {entities.length} entities</span><span><Info size={13} /> Effective exposure includes inherited domain and glob rules.</span></footer>
              </section>
            </>
          ) : null}

          {view === "rules" ? (
            <div className="rules-view">
              <div className="section-intro"><div><span className="eyebrow">Rule engine</span><h2>Control exposure at scale</h2><p>Automatic entities inherit these rules. Explicit entity choices always take priority in this manager.</p></div><div className="logic-note"><AlertTriangle size={18} /><span><strong>Advanced mode</strong>Rule changes may affect many entities at once. Review the effective result before saving.</span></div></div>
              <div className="rules-grid">
                <RuleEditor label="Include domains" description="Expose every automatic entity in these domains." values={rules.includeDomains} placeholder="e.g. light" onChange={(includeDomains) => updateRules({ includeDomains })} />
                <RuleEditor label="Exclude domains" description="Hide every automatic entity in these domains." values={rules.excludeDomains} placeholder="e.g. camera" onChange={(excludeDomains) => updateRules({ excludeDomains })} />
                <RuleEditor label="Include entity globs" description="Expose automatic entities matching a wildcard." values={rules.includeGlobs} placeholder="e.g. cover.*_blind" onChange={(includeGlobs) => updateRules({ includeGlobs })} />
                <RuleEditor label="Exclude entity globs" description="Hide automatic entities matching a wildcard." values={rules.excludeGlobs} placeholder="e.g. sensor.*_battery" onChange={(excludeGlobs) => updateRules({ excludeGlobs })} />
              </div>
              <div className="impact-panel"><div><Sparkles size={20} /><span><strong>Current rule impact</strong>{inheritedCount} entities inherit a rule; {exposedCount} are effectively exposed.</span></div><button type="button" onClick={() => setView("entities")}>Review affected entities</button></div>
            </div>
          ) : null}

          {view === "yaml" ? (
            <div className="yaml-view">
              <div className="section-intro"><div><span className="eyebrow">Read-only output</span><h2>Review generated files</h2><p>These deterministic files are the only YAML the production integration will own.</p></div><div className="validation-card"><CheckCircle2 size={20} /><span><strong>Ready to validate</strong>No syntax issues detected in the generated output.</span></div></div>
              <div className="code-grid">
                <section className="code-card"><header><div><Code2 size={17} /><strong>alexa_exposure_filter.yaml</strong></div><span>{generateFilterYaml(entities, rules).split("\n").length - 1} lines</span></header><pre><code>{generateFilterYaml(entities, rules)}</code></pre></section>
                <section className="code-card"><header><div><Code2 size={17} /><strong>alexa_entity_config.yaml</strong></div><span>{generateEntityConfigYaml(entities).split("\n").length - 1} lines</span></header><pre><code>{generateEntityConfigYaml(entities)}</code></pre></section>
              </div>
              <div className="include-snippet"><Info size={18} /><div><strong>One-time configuration.yaml setup</strong><code>filter: !include alexa_exposure_filter.yaml<br />entity_config: !include alexa_entity_config.yaml</code></div></div>
            </div>
          ) : null}
        </div>
      </main>

      {activeEntity ? (
        <div className="drawer-backdrop" onMouseDown={() => setActiveEntityId(null)}>
          <aside className="detail-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span className="eyebrow">Entity details</span><h2>{activeEntity.name}</h2><code>{activeEntity.id}</code></div><button type="button" aria-label="Close details" onClick={() => setActiveEntityId(null)}><X size={21} /></button></header>
            <div className="drawer-summary"><EntityGlyph domain={activeEntity.domain} /><div><span>{activeEntity.area} · {activeEntity.integration}</span><strong>{activeEntity.state}</strong></div></div>
            <section><label>Exposure override</label><ExposureControl value={activeEntity.exposure} onChange={(exposure) => updateEntity(activeEntity.id, { exposure })} /><p className="field-help">Automatic follows the advanced rules. Explicit choices take priority.</p></section>
            <section className="form-stack"><label>Alexa name<input value={activeEntity.alexaName} onChange={(event) => updateEntity(activeEntity.id, { alexaName: event.target.value })} placeholder={activeEntity.name} /></label><label>Description<textarea value={activeEntity.description} onChange={(event) => updateEntity(activeEntity.id, { description: event.target.value })} placeholder="Optional description" rows={3} /></label><label>Display category<select value={activeEntity.category} onChange={(event) => updateEntity(activeEntity.id, { category: event.target.value as AlexaCategory })}>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label></section>
            <section className="reason-box"><Info size={17} /><div><strong>Effective result</strong><span>{evaluateExposure(activeEntity, rules).reason}</span></div></section>
            <footer><button type="button" onClick={() => setActiveEntityId(null)}>Close</button><button className="primary" type="button" onClick={() => setActiveEntityId(null)}>Apply details</button></footer>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export default App;
