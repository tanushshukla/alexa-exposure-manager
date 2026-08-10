# Contributing

## Start With the Canonical Specification

GitHub issue [#12](https://github.com/tanushshukla/alexa-exposure-manager/issues/12)
defines v1 behavior. Do not implement behavior from the standalone React
prototype when it conflicts with that issue.

Before starting a change:

1. Search existing issues and pull requests.
2. Open or reference an issue describing user-visible behavior.
3. Keep the integration's file ownership and administrator-only boundaries
   explicit.
4. Add tests at the approved user-visible or failure-boundary seam.

## Required Checks

Frontend changes must pass:

```bash
npm ci
npm run lint
npm test
npm run build
```

Production Python changes must pass Ruff, mypy, backend tests, HACS validation,
Hassfest, and the Home Assistant compatibility matrix in GitHub Actions.

Release artifact changes should pass:

```bash
scripts/validate-release-artifacts.sh
```

Run the disposable acceptance harness for changes affecting setup, activation,
entity retrieval, save, validation, restart-required state, or the panel. See
`docs/ACCEPTANCE.md`.

## Test Expectations

- Test user-visible behavior rather than module layout.
- Test authorization for every panel and backend operation.
- Test revision conflicts, atomic-write failure, validation failure, two-file
  rollback, backup retention, and backup restore.
- Test migration against Home Assistant `EntityFilter` precedence.
- Test desktop and mobile panel behavior, keyboard access, focus, labels, and
  disabled-state explanations.
- Do not replace a real Home Assistant acceptance seam with sample entity data.

## Pull Requests

- Keep changes focused and explain any spec tradeoff.
- Do not commit credentials, tokens, `.storage`, acceptance state, backups, or
  support exports.
- Update user documentation and `CHANGELOG.md` for user-visible changes.
- Do not publish tags or releases from a feature pull request.
- A release pull request must include evidence for every item in
  `docs/RELEASE_CHECKLIST.md`.
