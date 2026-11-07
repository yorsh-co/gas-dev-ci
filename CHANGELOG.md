# Changelog

---

## [Unreleased]

### Added

- Step-by-step setup guide in the README.

### Changed

- Fold the "Creating `CLASPRC_JSON`" section into Setup step 8.

### Fixed

- Override `gaxios` to `^7.3.1` per gas-dev-config ADR 0005, removing the vulnerable `rimraf` 5 / `glob` 10 chain.

---

## [0.1.0] - 2026-11-06

### Added

- `gas-dev-ci deploy` CLI: push via clasp, redeploy of a configured web-app deployment, `url` output and job summary.
- Pre-push OAuth scope check against the deployed version.
- Secret masking and redaction of clasp output; credentials written with mode 0600.
- Reusable `gas-deploy.yml` workflow.
- README and ADRs 0001–0003.

---
