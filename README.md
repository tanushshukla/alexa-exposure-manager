# Alexa Exposure Manager

A planned Home Assistant community integration that provides a native visual editor for the entity exposure and per-entity metadata used by a manually configured Amazon Alexa Smart Home Skill.

## Project Status

This repository is in active development. The current frontend is a standalone interaction prototype with sample entities. It is **not yet a Home Assistant custom integration and cannot currently be installed through HACS**.

The production version will:

- Install as a HACS custom integration.
- Display real Home Assistant entities, devices, and areas.
- Follow Home Assistant's native voice-assistant exposure workflow.
- Manage dedicated Alexa filter and entity configuration include files.
- Preserve Alexa credentials and the rest of the user's configuration.
- Back up, validate, and atomically save managed YAML.

The manually configured Alexa Smart Home Skill, Lambda function, HTTPS endpoint, and account linking are prerequisites. This project will not configure AWS or the Alexa skill itself.

## Planned Configuration

```yaml
# configuration.yaml
alexa: !include alexa.yaml
```

```yaml
# alexa.yaml, owned by the user
smart_home:
  locale: en-GB
  filter: !include alexa_exposure_filter.yaml
  entity_config: !include alexa_entity_config.yaml
```

The integration will own only `alexa_exposure_filter.yaml` and `alexa_entity_config.yaml`.

## Prototype

Run the current standalone prototype locally:

```bash
npm install
npm run dev
```

Automated checks:

```bash
npm test
npm run lint
npm run build
```

See `PRODUCT_SPEC.md` and `DESIGN.md` for the original prototype context. The GitHub issues contain the approved implementation sequence for the production HACS integration.

## License

MIT
