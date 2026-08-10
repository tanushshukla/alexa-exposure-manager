# Security Policy

## Supported Versions

No production version is supported until `0.1.0` is tagged and published after
all release gates pass. Once published, the latest release receives security
fixes. Older pre-`1.0` releases may require upgrading to the latest version.

## Report a Vulnerability

Do not open a public issue for a vulnerability involving credential exposure,
authorization bypass, arbitrary file access, unsafe YAML writes, path traversal,
support-export leakage, or remote code execution.

Use GitHub's private vulnerability reporting for
`tanushshukla/alexa-exposure-manager`. Include:

- A concise impact statement.
- The affected version and Home Assistant version.
- Reproduction steps using redacted or synthetic data.
- Whether administrator access is required.
- Any known workaround.

Do not include Alexa credentials, Home Assistant tokens, full configuration
archives, or real entity YAML unless the maintainer explicitly requests them in
the private report.

## Security Boundaries

- The panel and all backend commands require a Home Assistant administrator.
- Only `/config/alexa_exposure_filter.yaml` and
  `/config/alexa_entity_config.yaml` are manager-owned.
- The integration must not rewrite the containing Alexa configuration or read
  credentials into the frontend.
- Save and restore operations require revision checks, fixed paths, backups,
  atomic replacement, full configuration validation, and rollback.
- Unknown YAML structures must result in read-only behavior rather than lossy
  rewriting.
- Default diagnostics must be redacted. Full managed YAML requires explicit
  warning and confirmation.

## Response Expectations

Reports will be acknowledged as maintainer availability permits. A fix may be
coordinated privately before disclosure. Public disclosure should wait until a
patched release and migration guidance are available.
