import { afterEach, describe, expect, it, vi } from "vitest";
import "./alexa-exposure-manager-panel";

type Message = { type: string; [key: string]: unknown };

function createHass(responses: Record<string, unknown>) {
  const sendMessagePromise = vi.fn((message: Message) => {
    const response = responses[message.type];
    return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
  });

  return {
    connection: { sendMessagePromise },
  };
}

async function createPanel(responses: Record<string, unknown>) {
  const panel = document.createElement("alexa-exposure-manager-panel") as HTMLElement & {
    hass: ReturnType<typeof createHass>;
    updateComplete: Promise<boolean>;
  };
  panel.hass = createHass(responses);
  document.body.append(panel);
  await panel.updateComplete;
  await new Promise((resolve) => window.setTimeout(resolve));
  await panel.updateComplete;
  return panel;
}

async function settle(panel: HTMLElement & { updateComplete: Promise<boolean> }) {
  await panel.updateComplete;
  await new Promise((resolve) => window.setTimeout(resolve));
  await panel.updateComplete;
}

function configuredResponses(): Record<string, unknown> {
  return {
    "alexa_exposure_manager/status": {
      configured: true,
      revision: "config-r4",
      entities_revision: "entities-r9",
      restart_required: false,
      expose_new_entities: false,
      migration_state: "complete",
      last_validation: {
        ok: true,
        error: null,
        rollback: null,
        at: "2026-08-10T12:00:00+00:00",
      },
    },
    "alexa_exposure_manager/entities": {
      revision: "config-r4",
      entities_revision: "entities-r9",
      entities: [
        {
          entity_id: "light.kitchen_ceiling",
          name: "Kitchen ceiling",
          state: "on",
          area_name: "Kitchen",
          device_name: "Hue ceiling",
          supported: true,
          exposed: true,
          exposure: "include",
          display_categories: ["LIGHT"],
          inferred_display_category: "LIGHT",
        },
        {
          entity_id: "sensor.phone_battery",
          name: "Phone battery",
          state: "82%",
          area_name: "Office",
          device_name: "Phone",
          supported: false,
          unsupported_reason: "This domain is not supported by Alexa",
          exposed: false,
          exposure: "exclude",
        },
        {
          entity_id: "fan.bedroom",
          name: "Bedroom fan",
          state: "off",
          area_name: "Bedroom",
          device_name: "Air purifier",
          supported: true,
          exposed: false,
          exposure: "exclude",
          inferred_display_category: "FAN",
        },
        {
          entity_id: "lock.front_door",
          name: "Front door",
          state: "locked",
          area_name: "Entrance",
          device_name: "Yale lock",
          supported: true,
          exposed: true,
          exposure: "include",
          inferred_display_category: "SMARTLOCK",
        },
      ],
    },
    "alexa_exposure_manager/save": {
      revision: "config-r5",
      restart_required: true,
    },
    "alexa_exposure_manager/preview": {
      filter_yaml: "include_entities:\n  - light.kitchen_ceiling\n",
      entity_config_yaml: "light.kitchen_ceiling:\n  name: Kitchen lights\n",
    },
    "alexa_exposure_manager/backups": {
      backups: [
        { id: "backup-7", created_at: "2026-08-09T09:30:00Z", revision: "config-r3" },
      ],
    },
    "alexa_exposure_manager/diagnostics": {
      status: "healthy",
      checks: [{ name: "include_files", ok: true }],
    },
    "alexa_exposure_manager/support_export": {
      filename: "alexa-exposure-support.json",
      content: "{\"status\":\"healthy\"}",
    },
    "alexa_exposure_manager/restore": {
      revision: "config-r3-restored",
      restart_required: true,
    },
    "alexa_exposure_manager/restart": { accepted: true },
  };
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("alexa-exposure-manager-panel", () => {
  it("loads through Home Assistant and shows exact setup instructions until configured", async () => {
    const panel = await createPanel({
      "alexa_exposure_manager/status": {
        configured: false,
        revision: "status-r1",
      },
      "alexa_exposure_manager/entities": {
        revision: "entities-r1",
        entities: [],
      },
    });

    expect(panel.hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "alexa_exposure_manager/status",
    });
    expect(panel.hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "alexa_exposure_manager/entities",
    });
    expect(panel.shadowRoot?.textContent).toContain("One-time Alexa setup required");
    expect(panel.shadowRoot?.textContent).toContain(
      "filter: !include alexa_exposure_filter.yaml",
    );
    expect(panel.shadowRoot?.textContent).toContain("alexa: !include alexa.yaml");
    expect(panel.shadowRoot?.textContent).toContain("smart_home:");
    expect(panel.shadowRoot?.textContent).toContain(
      "entity_config: !include alexa_entity_config.yaml",
    );
    expect(panel.shadowRoot?.querySelector("[aria-label='Entity search']")).toBeNull();
  });

  it("searches real entities, stages exposure, and saves with expected revisions", async () => {
    const panel = await createPanel(configuredResponses());
    const root = panel.shadowRoot!;
    const search = root.querySelector<HTMLInputElement>("[aria-label='Entity search']")!;

    expect(root.textContent).toContain("Kitchen");
    expect(root.textContent).toContain("Hue ceiling");
    expect(root.textContent).toContain("This domain is not supported by Alexa");

    search.value = "kitchen";
    search.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await settle(panel);
    expect(root.textContent).toContain("light.kitchen_ceiling");
    expect(root.textContent).not.toContain("sensor.phone_battery");

    root
      .querySelector<HTMLButtonElement>("[aria-label='Hide Kitchen ceiling']")!
      .click();
    await settle(panel);
    expect(root.textContent).toContain("1 pending change");

    root.querySelector<HTMLButtonElement>("[aria-label='Save changes']")!.click();
    await settle(panel);

    expect(panel.hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "alexa_exposure_manager/save",
      expected_revision: "config-r4",
      expected_entities_revision: "entities-r9",
      expose_new_entities: false,
      entities: [
        {
          entity_id: "light.kitchen_ceiling",
          exposed: false,
          name: "",
          description: "",
          display_categories: ["LIGHT"],
        },
      ],
    });
    expect(root.textContent).toContain("Restart required");
  });

  it("preserves staged current entities while exposing new entities and adding selected candidates", async () => {
    const panel = await createPanel(configuredResponses());
    const root = panel.shadowRoot!;

    root.querySelector<HTMLButtonElement>("[aria-label='Hide Kitchen ceiling']")!.click();
    await settle(panel);

    root.querySelector<HTMLButtonElement>("[aria-label='Expose new entities automatically']")!.click();
    root.querySelector<HTMLButtonElement>("[aria-label='Add entities']")!.click();
    await settle(panel);

    const dialogSearch = root.querySelector<HTMLInputElement>("[aria-label='Search entities to add']")!;
    dialogSearch.value = "fan";
    dialogSearch.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await settle(panel);
    const dialog = root.querySelector<HTMLElement>("[role='dialog']")!;
    expect(dialog.textContent).toContain("Bedroom fan");
    expect(dialog.textContent).not.toContain("Phone battery");
    expect(dialog.querySelector("ha-icon[icon='mdi:fan']")).not.toBeNull();

    root.querySelector<HTMLInputElement>("[aria-label='Select Bedroom fan']")!.click();
    await settle(panel);
    root.querySelector<HTMLButtonElement>("[aria-label='Expose selected entities']")!.click();
    await settle(panel);

    const confirmDialog = root.querySelector<HTMLElement>("[role='alertdialog']")!;
    expect(confirmDialog.textContent).toContain("Expose 1 entities?");
    confirmDialog.querySelector<HTMLButtonElement>("[aria-label='Confirm expose']")!.click();
    await settle(panel);

    expect(root.textContent).toContain("3 pending changes");
    root.querySelector<HTMLButtonElement>("[aria-label='Save changes']")!.click();
    await settle(panel);

    expect(panel.hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "alexa_exposure_manager/save",
      expected_revision: "config-r4",
      expected_entities_revision: "entities-r9",
      expose_new_entities: true,
      entities: [
        {
          entity_id: "light.kitchen_ceiling",
          exposed: false,
          name: "",
          description: "",
          display_categories: ["LIGHT"],
        },
        {
          entity_id: "fan.bedroom",
          exposed: true,
          name: "",
          description: "",
          display_categories: ["FAN"],
        },
      ],
    });
  });

  it("requires one count confirmation before bulk unexposing selected entities", async () => {
    const panel = await createPanel(configuredResponses());
    const root = panel.shadowRoot!;

    root.querySelector<HTMLInputElement>("[aria-label='Select Kitchen ceiling for bulk action']")!.click();
    root.querySelector<HTMLInputElement>("[aria-label='Select Front door for bulk action']")!.click();
    await settle(panel);
    root.querySelector<HTMLButtonElement>("[aria-label='Unexpose selected entities']")!.click();
    await settle(panel);

    const dialog = root.querySelector<HTMLElement>("[role='alertdialog']")!;
    expect(dialog.textContent).toContain("Unexpose 2 entities?");
    expect(panel.hass.connection.sendMessagePromise).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "alexa_exposure_manager/save" }),
    );

    dialog.querySelector<HTMLButtonElement>("[aria-label='Confirm unexpose']")!.click();
    await settle(panel);
    expect(root.textContent).toContain("2 pending changes");
    expect(root.querySelector("[role='alertdialog']")).toBeNull();
  });

  it("cancels bulk confirmation without changing pending configuration", async () => {
    const panel = await createPanel(configuredResponses());
    const root = panel.shadowRoot!;

    root.querySelector<HTMLInputElement>("[aria-label='Select Kitchen ceiling for bulk action']")!.click();
    await settle(panel);
    root.querySelector<HTMLButtonElement>("[aria-label='Unexpose selected entities']")!.click();
    await settle(panel);
    const dialog = root.querySelector<HTMLElement>("[role='alertdialog']")!;
    dialog.querySelectorAll("button")[0]!.click();
    await settle(panel);

    expect(root.querySelector("[role='alertdialog']")).toBeNull();
    expect(root.textContent).not.toContain("pending change");
  });

  it("shows icons and disabled unsupported rows in the Add dialog, and cancels cleanly", async () => {
    const panel = await createPanel(configuredResponses());
    const root = panel.shadowRoot!;

    root.querySelector<HTMLButtonElement>("[aria-label='Add entities']")!.click();
    await settle(panel);
    const dialog = root.querySelector<HTMLElement>("[role='dialog']")!;
    expect(dialog.querySelector("ha-icon[icon='mdi:fan']")).not.toBeNull();
    expect(dialog.textContent).toContain("Phone battery");
    expect(dialog.textContent).toContain("This domain is not supported by Alexa");
    const unsupportedCheckbox = dialog.querySelector<HTMLInputElement>(
      "[aria-label='Select Phone battery']",
    )!;
    expect(unsupportedCheckbox.disabled).toBe(true);

    Array.from(dialog.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Cancel")!
      .click();
    await settle(panel);
    expect(root.querySelector("[role='dialog']")).toBeNull();
    expect(root.textContent).not.toContain("pending change");
  });

  it("keeps the catalog usable at mobile width", async () => {
    const panel = await createPanel(configuredResponses());
    (panel as HTMLElement & { narrow: boolean }).narrow = true;
    await settle(panel);
    const root = panel.shadowRoot!;
    const main = root.querySelector("main")!;
    expect(main.classList.contains("narrow")).toBe(true);
    expect(root.querySelector("[aria-label='Entity search']")).not.toBeNull();
    expect(root.querySelector("[aria-label='Save changes']")).not.toBeNull();
    expect(root.textContent).toContain("Kitchen ceiling");
    expect(root.textContent).toContain("This domain is not supported by Alexa");

    const search = root.querySelector<HTMLInputElement>("[aria-label='Entity search']")!;
    search.value = "phone";
    search.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await settle(panel);
    expect(root.textContent).toContain("sensor.phone_battery");
    expect(root.textContent).not.toContain("light.kitchen_ceiling");

    root.querySelector<HTMLButtonElement>("[aria-label='Add entities']")!.click();
    await settle(panel);
    expect(root.querySelector("[role='dialog']")).not.toBeNull();
    expect(root.querySelector("[aria-label='Search entities to add']")).not.toBeNull();
  });

  it("exposes accessible labels and dialog roles for keyboard and assistive use", async () => {
    const panel = await createPanel(configuredResponses());
    const root = panel.shadowRoot!;
    expect(root.querySelector("[aria-label='Entity search']")).not.toBeNull();
    expect(root.querySelector("[aria-label='Expose new entities automatically']")).not.toBeNull();
    expect(root.querySelector("[role='switch']")).not.toBeNull();
    expect(root.querySelector("[aria-label='Add entities']")).not.toBeNull();

    root.querySelector<HTMLButtonElement>("[aria-label='Edit Alexa metadata for Kitchen ceiling']")!.click();
    await settle(panel);
    const metadata = root.querySelector<HTMLElement>("[role='dialog']")!;
    expect(metadata.getAttribute("aria-modal")).toBe("true");
    expect(metadata.querySelector("[aria-label='Alexa name']")).not.toBeNull();
    expect(metadata.querySelector("[aria-label='Close dialog']")).not.toBeNull();
    metadata.querySelector<HTMLButtonElement>("[aria-label='Close dialog']")!.click();
    await settle(panel);

    root.querySelector<HTMLInputElement>("[aria-label='Select Kitchen ceiling for bulk action']")!.click();
    await settle(panel);
    root.querySelector<HTMLButtonElement>("[aria-label='Unexpose selected entities']")!.click();
    await settle(panel);
    const confirm = root.querySelector<HTMLElement>("[role='alertdialog']")!;
    expect(confirm.getAttribute("aria-modal")).toBe("true");
    expect(confirm.querySelector("[aria-label='Confirm unexpose']")).not.toBeNull();
  });

  it("edits Alexa metadata with inferred and a single display category", async () => {
    const panel = await createPanel(configuredResponses());
    const root = panel.shadowRoot!;

    root.querySelector<HTMLButtonElement>("[aria-label='Edit Alexa metadata for Kitchen ceiling']")!.click();
    await settle(panel);
    const dialog = root.querySelector<HTMLElement>("[role='dialog']")!;
    expect(dialog.textContent).toContain("Inferred category: LIGHT");
    expect(dialog.textContent).toContain("Home Assistant name: Kitchen ceiling");
    expect(dialog.textContent).toContain("light.kitchen_ceiling");
    expect(dialog.textContent).toContain("Device: Hue ceiling");
    expect(dialog.textContent).toContain("Area: Kitchen");
    expect(dialog.textContent).toContain("Alexa exposure: Exposed");

    const name = dialog.querySelector<HTMLInputElement>("[aria-label='Alexa name']")!;
    name.value = "Kitchen voice lights";
    name.dispatchEvent(new InputEvent("input", { bubbles: true }));
    const description = dialog.querySelector<HTMLTextAreaElement>("[aria-label='Alexa description']")!;
    description.value = "Main kitchen ceiling lights";
    description.dispatchEvent(new InputEvent("input", { bubbles: true }));
    const category = dialog.querySelector<HTMLSelectElement>("[aria-label='Display category']")!;
    category.value = "SWITCH";
    category.dispatchEvent(new Event("change", { bubbles: true }));
    await settle(panel);
    root.querySelector<HTMLButtonElement>("[aria-label='Apply Alexa metadata']")!.click();
    await settle(panel);

    root.querySelector<HTMLButtonElement>("[aria-label='Save changes']")!.click();
    await settle(panel);
    expect(panel.hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "alexa_exposure_manager/save",
      expected_revision: "config-r4",
      expected_entities_revision: "entities-r9",
      expose_new_entities: false,
      entities: [
        {
          entity_id: "light.kitchen_ceiling",
          exposed: true,
          name: "Kitchen voice lights",
          description: "Main kitchen ceiling lights",
          display_categories: ["SWITCH"],
        },
      ],
    });
  });

  it("loads advanced operations and confirms restore, support export, and restart messages", async () => {
    const panel = await createPanel(configuredResponses());
    const root = panel.shadowRoot!;

    root.querySelector<HTMLButtonElement>("[aria-label='Advanced tools']")!.click();
    await settle(panel);
    expect(panel.hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "alexa_exposure_manager/preview",
      expose_new_entities: false,
      entities: [],
    });
    expect(panel.hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "alexa_exposure_manager/backups",
    });
    expect(root.textContent).toContain("include_entities:");
    expect(root.textContent).toContain("backup-7");
    expect(root.textContent).toContain("Last validation: passed at 2026-08-10T12:00:00+00:00");
    expect(root.textContent).toContain("Migration: complete");

    root.querySelector<HTMLButtonElement>("[aria-label='Run diagnostics']")!.click();
    await settle(panel);
    expect(panel.hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "alexa_exposure_manager/diagnostics",
    });

    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    root.querySelector<HTMLButtonElement>("[aria-label='Create support export']")!.click();
    await settle(panel);
    root.querySelector<HTMLButtonElement>("[aria-label='Confirm support export']")!.click();
    await settle(panel);
    expect(panel.hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "alexa_exposure_manager/support_export",
      confirmed: true,
    });

    root.querySelector<HTMLButtonElement>("[aria-label='Restore backup backup-7']")!.click();
    await settle(panel);
    root.querySelector<HTMLButtonElement>("[aria-label='Confirm restore']")!.click();
    await settle(panel);
    expect(panel.hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "alexa_exposure_manager/restore",
      backup_id: "backup-7",
      expected_revision: "config-r4",
      expected_entities_revision: "entities-r9",
    });

    root.querySelector<HTMLButtonElement>("[aria-label='Restart Home Assistant']")!.click();
    await settle(panel);
    expect(root.querySelector("[role='alertdialog']")?.textContent).toContain(
      "Alexa, discover my devices",
    );
    root.querySelector<HTMLButtonElement>("[aria-label='Confirm restart']")!.click();
    await settle(panel);
    expect(panel.hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "alexa_exposure_manager/restart",
      confirmed: true,
    });
  });

  it("previews and confirms migration from the setup-only state", async () => {
    const panel = await createPanel({
      "alexa_exposure_manager/status": { configured: false, revision: "setup-r2" },
      "alexa_exposure_manager/entities": { revision: "setup-r2", entities_revision: "entities-r1", entities: [] },
      "alexa_exposure_manager/migration/preview": {
        token: "migration-token",
        revision: "setup-r2",
        entities_revision: "entities-r1",
        counts: { exposed: 2, hidden: 0, unsupported: 0, missing: 0 },
      },
      "alexa_exposure_manager/migration/confirm": { configured: true, revision: "config-r1" },
    });
    const root = panel.shadowRoot!;

    root.querySelector<HTMLButtonElement>("[aria-label='Preview existing Alexa configuration']")!.click();
    await settle(panel);
    expect(panel.hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "alexa_exposure_manager/migration/preview",
    });
    expect(root.textContent).toContain("2 exposed, 0 hidden, 0 unsupported, and 0 missing entities will be imported");

    root.querySelector<HTMLButtonElement>("[aria-label='Import existing Alexa configuration']")!.click();
    await settle(panel);
    root.querySelector<HTMLButtonElement>("[aria-label='Confirm migration']")!.click();
    await settle(panel);
    expect(panel.hass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: "alexa_exposure_manager/migration/confirm",
      token: "migration-token",
      expected_revision: "setup-r2",
      expected_entities_revision: "entities-r1",
    });
  });

  it("keeps changes pending for validation failures and explains revision conflicts", async () => {
    const validationResponses = configuredResponses();
    validationResponses["alexa_exposure_manager/save"] = {
      validation_errors: [
        {
          entity_id: "light.kitchen_ceiling",
          field: "name",
          message: "Alexa name is too long",
        },
      ],
    };
    const validationPanel = await createPanel(validationResponses);
    validationPanel.shadowRoot!.querySelector<HTMLButtonElement>("[aria-label='Hide Kitchen ceiling']")!.click();
    await settle(validationPanel);
    validationPanel.shadowRoot!.querySelector<HTMLButtonElement>("[aria-label='Save changes']")!.click();
    await settle(validationPanel);
    expect(validationPanel.shadowRoot!.textContent).toContain("Alexa name is too long");
    expect(validationPanel.shadowRoot!.textContent).toContain("1 pending change");

    document.body.replaceChildren();
    const conflictResponses = configuredResponses();
    conflictResponses["alexa_exposure_manager/save"] = new Error("revision conflict");
    const conflictPanel = await createPanel(conflictResponses);
    conflictPanel.shadowRoot!.querySelector<HTMLButtonElement>("[aria-label='Hide Kitchen ceiling']")!.click();
    await settle(conflictPanel);
    conflictPanel.shadowRoot!.querySelector<HTMLButtonElement>("[aria-label='Save changes']")!.click();
    await settle(conflictPanel);
    expect(conflictPanel.shadowRoot!.textContent).toContain("Configuration changed elsewhere");
    expect(conflictPanel.shadowRoot!.textContent).toContain("Reload the panel before saving again");
  });
});
