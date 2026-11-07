# Changelog

---

## [Unreleased]

### Added

- ADR 0008 security model.

### Changed

- `deploy()` and the CLI `main()` context no longer take `home`.

### Fixed

- Redeploy uses clasp's canonical `create-deployment` command instead of the `deploy` alias (ADR 0006).
- clasp's child environment no longer receives `CLASPRC_JSON` or `clasp_config_ignore`.
- Credentials are written to a private temporary file passed with `-A` and removed after the run (also on failure); `~/.clasprc.json` is no longer written or overwritten.

---

## [0.2.0] - 2026-11-07

### Added

- `gas-dev-ci setup` command: the first-time setup wizard folded in from gas-dev-deploy 0.1.0, with bundled clasp, the `gasDevCi` config key in `package.json` and custom steps.
- `DeployError` and type declarations export, and a package `exports` map.
- ADRs 0004-0006 documenting the setup fold.

### Changed

- **Breaking:** rename `CiError` to `DeployError`.
- The clasp wrapper uses the canonical clasp command names.
- `prompts` is now a runtime dependency.
- README documents the setup wizard and migration from gas-dev-deploy.
- Callers move to `@v0.2` (reusable workflow) and `#semver:^0.2.0` (dependency).

### Removed

- **Breaking:** the `CiError` export; use `DeployError` instead.

---

## [0.1.1] - 2026-11-07

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
