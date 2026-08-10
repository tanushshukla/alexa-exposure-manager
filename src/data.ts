import type { AlexaRules, Entity } from "./types";

export const initialRules: AlexaRules = {
  includeDomains: ["light", "climate"],
  excludeDomains: [],
  includeGlobs: ["cover.*_blind"],
  excludeGlobs: ["sensor.*_battery", "sensor.*_signal"],
};

export const initialEntities: Entity[] = [
  { id: "light.kitchen_ceiling", name: "Kitchen ceiling", domain: "light", area: "Kitchen", integration: "Hue", device: "Kitchen ceiling", state: "on", exposure: "auto", alexaName: "Kitchen lights", description: "Main kitchen lighting", category: "LIGHT" },
  { id: "switch.coffee_machine", name: "Coffee machine", domain: "switch", area: "Kitchen", integration: "Shelly", device: "Coffee machine", state: "off", exposure: "include", alexaName: "Coffee machine", description: "Coffee machine smart plug", category: "SMARTPLUG" },
  { id: "sensor.dishwasher_status", name: "Dishwasher status", domain: "sensor", area: "Kitchen", integration: "Miele", device: "Dishwasher", state: "Clean", exposure: "exclude", alexaName: "", description: "", category: "OTHER" },
  { id: "climate.living_room", name: "Living room thermostat", domain: "climate", area: "Living room", integration: "Nest", device: "Living room thermostat", state: "21.5 °C", exposure: "auto", alexaName: "Living room", description: "Main floor thermostat", category: "THERMOSTAT" },
  { id: "light.floor_lamp", name: "Floor lamp", domain: "light", area: "Living room", integration: "Hue", device: "Floor lamp", state: "off", exposure: "auto", alexaName: "Floor lamp", description: "", category: "LIGHT" },
  { id: "media_player.living_room_tv", name: "Living room TV", domain: "media_player", area: "Living room", integration: "Samsung TV", device: "Samsung Frame", state: "playing", exposure: "include", alexaName: "The Frame", description: "Living room television", category: "OTHER" },
  { id: "lock.front_door", name: "Front door", domain: "lock", area: "Entrance", integration: "Yale", device: "Front door lock", state: "locked", exposure: "include", alexaName: "Front door", description: "Main entrance lock", category: "SMARTLOCK" },
  { id: "camera.front_door", name: "Doorbell camera", domain: "camera", area: "Entrance", integration: "Reolink", device: "Video doorbell", state: "idle", exposure: "exclude", alexaName: "Front door camera", description: "", category: "CAMERA" },
  { id: "cover.office_blind", name: "Office blind", domain: "cover", area: "Office", integration: "Zigbee2MQTT", device: "Office blind", state: "open", exposure: "auto", alexaName: "Office blind", description: "", category: "OTHER" },
  { id: "sensor.phone_battery", name: "Phone battery", domain: "sensor", area: "Office", integration: "Mobile App", device: "Pixel 9", state: "82%", exposure: "auto", alexaName: "", description: "", category: "OTHER" },
  { id: "fan.bedroom", name: "Bedroom fan", domain: "fan", area: "Bedroom", integration: "Dyson", device: "Dyson purifier", state: "on", exposure: "include", alexaName: "Bedroom fan", description: "Bedroom air purifier", category: "FAN" },
  { id: "binary_sensor.garage_door", name: "Garage door", domain: "binary_sensor", area: "Garage", integration: "ESPHome", device: "Garage controller", state: "closed", exposure: "exclude", alexaName: "Garage door", description: "", category: "DOOR" },
];
